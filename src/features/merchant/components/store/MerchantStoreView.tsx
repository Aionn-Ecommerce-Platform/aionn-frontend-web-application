"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useState, useMemo, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  Loader2,
  Store,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Star,
  Package,
  Clock3,
  Users,
  Heart,
  ShoppingBag,
  Ticket,
  Search,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { EmptyState, ImageLightbox } from "@/shared/ui";
import ProductCard from "@/components/product/ProductCard";
import {
  conversationService,
  merchantService,
  presenceService,
  productService,
  shopVoucherService,
  voucherService,
  geographyService,
  categoryService,
} from "@/lib/services";
import { useAuthStore } from "@/stores/auth.store";
import { formatMonthYear } from "@/shared/lib/utils";
import { useTranslation, useDebounce } from "@/hooks";
import { qk } from "@/lib/query-keys";
import { cleanProvinceName } from "@/shared/lib/address-utils";
import { getPaginationRange } from "@/shared/lib/pagination";
import { buildCategoryNameMap } from "@/shared/lib/category-utils";
import type { Product, UserVoucher } from "@/types";
import MerchantVouchers from "./MerchantVouchers";

function presenceLabel(
  online: boolean,
  lastSeenAt: string | null | undefined,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  if (online) return t("merchantStore.onlineNow");
  if (!lastSeenAt) return t("merchantStore.offline");
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 60_000),
  );
  if (minutes < 1) return t("merchantStore.lastSeenJustNow");
  if (minutes < 60) {
    return t("merchantStore.lastSeenMinutes", { count: minutes });
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return t("merchantStore.lastSeenHours", { count: hours });
  }
  return t("merchantStore.lastSeenDays", {
    count: Math.floor(hours / 24),
  });
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-900 sm:text-xs">
        <span className="text-gray-900">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 truncate bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 bg-clip-text text-sm font-bold text-transparent sm:text-[15px]">
        {value}
      </p>
    </div>
  );
}

export default function MerchantStorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [chatLoading, setChatLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery.trim(), 350);
  const [activeTab, setActiveTab] = useState<"products" | "vouchers">(
    "products",
  );
  const [claimingVoucherCode, setClaimingVoucherCode] = useState<string | null>(
    null,
  );
  const [previewLogo, setPreviewLogo] = useState(false);
  const productsRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();

  const { data: merchant, isLoading: loadingM } = useQuery({
    queryKey: ["merchant", id],
    queryFn: () => merchantService.get(id),
  });

  const { data: storefrontStats } = useQuery({
    queryKey: ["merchant-storefront-stats", id],
    queryFn: () => merchantService.getStorefrontStats(id),
  });

  const { data: presence } = useQuery({
    queryKey: ["merchant-presence", merchant?.ownerId],
    queryFn: () => presenceService.get(merchant!.ownerId),
    enabled: Boolean(merchant?.ownerId),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5_000,
  });

  const followMutation = useMutation({
    mutationFn: () =>
      storefrontStats?.following
        ? merchantService.unfollow(id)
        : merchantService.follow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["merchant-storefront-stats", id],
      });
      toast.success(
        storefrontStats?.following
          ? t("merchantStore.unfollowed")
          : t("merchantStore.followed"),
      );
    },
    onError: () => toast.error(t("merchantStore.followError")),
  });

  const handleFollow = () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/merchants/${id}`);
      return;
    }
    followMutation.mutate();
  };

  const scrollToProducts = () => {
    setActiveTab("products");
    window.setTimeout(() => {
      if (productsRef.current) {
        const yOffset = -120;
        const elementPosition = productsRef.current.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY + yOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    }, 0);
  };

  const { data: provinces } = useQuery({
    queryKey: ["geography", "provinces", "VN"],
    queryFn: () => geographyService.listProvinces("VN"),
    staleTime: 60 * 60_000,
  });

  const provinceNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    (provinces ?? []).forEach((p) => {
      const name = locale === "en" && p.nameEn ? p.nameEn : p.name;
      m.set(p.code, cleanProvinceName(name));
    });
    return m;
  }, [provinces, locale]);

  const { data: categoryTree } = useQuery({
    queryKey: qk.categoriesTree,
    queryFn: () => categoryService.tree(),
    staleTime: 5 * 60_000,
  });

  const categoryNameById = useMemo(
    () => buildCategoryNameMap(categoryTree),
    [categoryTree],
  );

  const { data: searchResult, isLoading: loadingP } = useQuery({
    queryKey: [
      "merchant-products-search",
      id,
      page,
      selectedCategory,
      debouncedSearch,
    ],
    queryFn: () =>
      productService.search({
        merchantId: id,
        status: "PUBLISHED",
        page,
        size: 48,
        q: debouncedSearch || undefined,
        categoryIds: selectedCategory ? [selectedCategory] : undefined,
      }),
  });

  const { data: merchantFacetsResult } = useQuery({
    queryKey: ["merchant-facets", id],
    queryFn: () =>
      productService.search({
        merchantId: id,
        status: "PUBLISHED",
        page: 0,
        size: 1,
      }),
    staleTime: 5 * 60_000,
  });

  const categoryFacets = useMemo(
    () => merchantFacetsResult?.facets?.categories ?? {},
    [merchantFacetsResult],
  );

  const { data: shopVouchers } = useQuery({
    queryKey: ["shop-vouchers", id],
    queryFn: () => shopVoucherService.listByMerchant(id, 20, undefined, true),
  });

  const { data: myVouchers } = useQuery({
    queryKey: qk.myVouchers(),
    queryFn: () => voucherService.listMine(100),
    enabled: isAuthenticated,
  });

  const claimVoucher = useMutation({
    mutationFn: (code: string) => voucherService.claim(code),
    onMutate: (code) => {
      setClaimingVoucherCode(code);
    },
    onSuccess: (claimedVoucher, code) => {
      toast.success(t("promotions.claimedSuccess"));
      queryClient.setQueryData<typeof shopVouchers>(
        ["shop-vouchers", id],
        (old) =>
          old?.map((voucher) =>
            voucher.voucherCode === code
              ? {
                  ...voucher,
                  usedCount: Math.min(
                    voucher.usedCount + 1,
                    voucher.usageLimit,
                  ),
                }
              : voucher,
          ),
      );
      queryClient.setQueryData<UserVoucher[]>(qk.myVouchers(), (old) => {
        if (!old) return [claimedVoucher];
        if (old.some((voucher) => voucher.voucherCode === code)) return old;
        return [...old, claimedVoucher];
      });
    },
    onSettled: () => {
      setClaimingVoucherCode(null);
    },
    onError: () => toast.error(t("merchantStore.saveVoucherError")),
  });

  const claimedCodes = useMemo(
    () => new Set(myVouchers?.map((v) => v.voucherCode) ?? []),
    [myVouchers],
  );

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/merchants/${id}`);
      return;
    }
    setChatLoading(true);
    try {
      const conv = await conversationService.start({ merchantId: id });
      router.push(`/chat?conversationId=${conv.conversationId}`);
    } catch {
      toast.error(t("merchantStore.chatError"));
    } finally {
      setChatLoading(false);
    }
  };

  if (loadingM) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center">
        <Loader2 className="animate-spin text-gray-800" size={32} />
      </div>
    );
  }

  if (!merchant) {
    return (
      <EmptyState
        icon={Store}
        title={t("merchantStore.notFound")}
        description={t("merchantStore.notFoundDescription")}
      />
    );
  }

  const initial = merchant.name?.charAt(0).toUpperCase() ?? "M";
  const formattedDate = merchant.createdAt
    ? formatMonthYear(merchant.createdAt, locale)
    : t("merchants.yearsAgo");

  const compactNumber = (value: number) =>
    new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);

  const responseTimeLabel = t(
    `merchantStore.responseTime.${storefrontStats?.responseTimeBucket ?? "UNKNOWN"}`,
  );

  const displayProvince = merchant.provinceCode
    ? provinceNameByCode.get(merchant.provinceCode)
    : merchant.provinceName
      ? cleanProvinceName(merchant.provinceName)
      : undefined;

  const totalElements = searchResult?.page.totalElements ?? 0;
  const storeProductCount =
    merchantFacetsResult?.page.totalElements ?? totalElements;
  const totalPages = Math.max(1, Math.ceil(totalElements / 48));
  const merchantOnline = presence?.online === true;
  const merchantPresenceText = presence
    ? presenceLabel(presence.online, presence.lastSeenAt, t)
    : merchant.status === "ACTIVE"
      ? t("merchantStore.active")
      : merchant.status;

  return (
    <div className="bg-transparent min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-blue-600">
            {t("common.home")}
          </Link>
          <span>/</span>
          <Link href="/merchants" className="hover:text-blue-600">
            {t("merchants.title")}
          </Link>
          <span>/</span>
          <span className="max-w-[60vw] truncate font-medium text-gray-900">
            {merchant.name}
          </span>
        </nav>
        {/* Store header card */}
        <div className="bg-white rounded-2xl border border-gray-400 p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex flex-col xl:flex-row xl:items-start gap-6">
            <div className="xl:w-[360px] shrink-0">
              <div className="flex items-start gap-5">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => merchant.logoUrl && setPreviewLogo(true)}
                    disabled={!merchant.logoUrl}
                    aria-label={merchant.name}
                    className="block cursor-zoom-in rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-default"
                  >
                    {merchant.logoUrl ? (
                      <div className="w-20 h-20 sm:w-22 sm:h-22 relative rounded-full overflow-hidden border border-gray-200 shadow-xs bg-gray-50">
                        <Image
                          src={merchant.logoUrl}
                          alt={merchant.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center text-white text-2xl font-bold shadow-xs">
                        {initial}
                      </div>
                    )}
                  </button>
                  <span
                    className={`pointer-events-none absolute bottom-0.5 right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-white shadow-xs ${
                      merchantOnline ? "bg-emerald-500" : "bg-gray-400"
                    }`}
                    title={merchantPresenceText}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                </div>

                <div className="min-w-0 space-y-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-gray-950 tracking-tight">
                    {merchant.name}
                  </h1>
                  <p
                    className={`text-xs font-semibold ${
                      merchantOnline ? "text-emerald-600" : "text-gray-500"
                    }`}
                  >
                    {merchantPresenceText}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin size={13} className="shrink-0 text-red-500" />
                    <span className="truncate">
                      {displayProvince || t("merchantStore.notUpdated")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleStartChat}
                  disabled={chatLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {chatLoading ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <MessageCircle size={14} />
                  )}
                  <span>{t("merchantStore.chat")}</span>
                </button>
                <button
                  onClick={handleFollow}
                  disabled={followMutation.isPending}
                  className={
                    storefrontStats?.following
                      ? "inline-flex items-center gap-2 px-4 py-2 border border-brand/30 bg-brand/10 text-brand hover:bg-brand/15 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      : "inline-flex items-center gap-2 px-4 py-2 border border-brand bg-brand text-white hover:bg-brand-strong hover:border-brand-strong rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  }
                >
                  {followMutation.isPending ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Heart
                      size={14}
                      className={
                        storefrontStats?.following
                          ? "fill-brand text-brand"
                          : "fill-white text-white"
                      }
                    />
                  )}
                  <span>
                    {storefrontStats?.following
                      ? t("merchantStore.following")
                      : t("merchantStore.follow")}
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-5 border-t xl:border-t-0 xl:border-l border-gray-200/80 pt-6 xl:pt-0 xl:pl-8 flex-1">
              <StatItem
                icon={<Star size={16} />}
                label={t("merchantStore.reviews")}
                value={compactNumber(storefrontStats?.reviewCount ?? 0)}
              />
              <StatItem
                icon={<Package size={16} />}
                label={t("merchantStore.products")}
                value={compactNumber(storefrontStats?.productCount ?? totalElements)}
              />
              <StatItem
                icon={<MessageCircle size={16} />}
                label={t("merchantStore.responseRate")}
                value={`${storefrontStats?.responseRatePercent ?? 0}%`}
              />
              <StatItem
                icon={<Clock3 size={16} />}
                label={t("merchantStore.responseTimeLabel")}
                value={responseTimeLabel}
              />
              <StatItem
                icon={<Calendar size={16} />}
                label={t("merchantStore.joined")}
                value={formattedDate}
              />
              <StatItem
                icon={<Users size={16} />}
                label={t("merchantStore.followers")}
                value={compactNumber(storefrontStats?.followerCount ?? 0)}
              />
            </div>
          </div>
        </div>

        <div className="mb-8 flex w-full border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`relative flex w-1/2 min-w-0 cursor-pointer items-center justify-center gap-2 px-4 pb-3 pt-2 text-sm font-semibold transition-colors ${
              activeTab === "products"
                ? "text-brand"
                : "text-gray-700 hover:text-gray-950"
            }`}
          >
            <ShoppingBag size={16} />
            {t("merchantStore.productsTab")}
            <span className="text-xs font-bold opacity-70">
              {storeProductCount}
            </span>
            {activeTab === "products" && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("vouchers")}
            className={`relative flex w-1/2 min-w-0 cursor-pointer items-center justify-center gap-2 px-4 pb-3 pt-2 text-sm font-semibold transition-colors ${
              activeTab === "vouchers"
                ? "text-brand"
                : "text-gray-700 hover:text-gray-950"
            }`}
          >
            <Ticket size={16} />
            {t("merchantStore.vouchersTab")}
            <span className="text-xs font-bold opacity-70">
              {shopVouchers?.length ?? 0}
            </span>
            {activeTab === "vouchers" && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand" />
            )}
          </button>
        </div>

        {activeTab === "vouchers" ? (
          <MerchantVouchers
            vouchers={shopVouchers ?? []}
            locale={locale}
            claimedCodes={claimedCodes}
            claimingCode={claimingVoucherCode}
            onUse={() => router.push("/products")}
            onClaim={(code) => {
              if (!isAuthenticated) {
                router.push(`/auth/login?redirect=/merchants/${id}`);
                return;
              }
              claimVoucher.mutate(code);
            }}
          />
        ) : (
          <div ref={productsRef} className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-64 shrink-0">
            <div className="relative overflow-hidden rounded-2xl border border-purple-800/60 bg-gradient-to-br from-purple-900 via-indigo-950 to-purple-950 p-5 text-white shadow-xl shadow-purple-950/20">
              <div className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-purple-600/25 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-fuchsia-600/20 blur-2xl" />

              <h3 className="relative z-10 flex items-center gap-2 border-b border-amber-400/70 pb-3 text-base font-bold tracking-wide text-white">
                <Store size={18} className="text-purple-200" />
                <span>
                  {t("merchants.shopCategories") || t("merchantStore.categories")}
                </span>
              </h3>

              <ul className="relative z-10 mt-4 max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
                <li>
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setPage(0);
                      scrollToProducts();
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm transition-all ${
                      selectedCategory === null
                        ? "bg-purple-600 font-bold text-white shadow-md shadow-purple-600/40"
                        : "font-medium text-purple-200 hover:bg-purple-800/40 hover:text-white"
                    }`}
                  >
                    <span>
                      {t("merchants.allProducts") ||
                        t("merchantStore.allProducts")}
                    </span>
                  </button>
                </li>
                {Object.entries(categoryFacets)
                  .filter(
                    ([, count]) =>
                      storeProductCount === 0 || count < storeProductCount,
                  )
                  .map(([catId, count]) => {
                  const label = categoryNameById.get(catId) ?? catId;
                  const isActive = selectedCategory === catId;
                  return (
                    <li key={catId}>
                      <button
                        onClick={() => {
                          setSelectedCategory(catId);
                          setPage(0);
                          scrollToProducts();
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm transition-all ${
                          isActive
                            ? "bg-purple-600 font-bold text-white shadow-md shadow-purple-600/40"
                            : "font-medium text-purple-200 hover:bg-purple-800/40 hover:text-white"
                        }`}
                      >
                        <span className="mr-2 truncate">{label}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-purple-950/60 text-purple-200"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedCategory
                  ? categoryNameById.get(selectedCategory) ||
                    t("common.allProducts")
                  : t("merchants.allShopProducts") ||
                    (locale === "en"
                      ? "All products in this store"
                      : t("merchantStore.allStoreProducts"))}
              </h2>
              <div className="relative w-full sm:max-w-xs">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPage(0);
                  }}
                  placeholder={t("merchantStore.searchProducts")}
                  aria-label={t("merchantStore.searchProducts")}
                  className="h-10 w-full rounded-xl border border-gray-400 bg-white pl-9 pr-9 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10 [&::-webkit-search-cancel-button]:hidden"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setPage(0);
                    }}
                    aria-label={t("common.clearSearch")}
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {loadingP ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="animate-spin text-gray-700" size={28} />
              </div>
            ) : !searchResult || searchResult.page.content.length === 0 ? (
              <EmptyState
                icon={Store}
                title={
                  debouncedSearch
                    ? t("products.noProducts")
                    : t("merchantStore.categoryEmpty")
                }
                description={
                  debouncedSearch
                    ? t("products.noProductsDesc")
                    : t("merchantStore.categoryEmptyDescription")
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {searchResult.page.content.map((product) => {
                    const lowestVariant = product.variants?.reduce<
                      Product["variants"][number] | null
                    >(
                      (lowest, curr) =>
                        !lowest || curr.price < lowest.price ? curr : lowest,
                      null,
                    );
                    const price = lowestVariant?.price ?? 0;
                    const originalPrice = lowestVariant?.originalPrice;
                    const image = product.imageList?.[0] ?? "/images/logo.png";
                    return (
                      <ProductCard
                        key={product.productId}
                        id={product.productId}
                        slug={product.slug}
                        name={product.name}
                        price={price}
                        originalPrice={originalPrice}
                        image={image}
                        rating={product.rating}
                        reviewCount={product.reviewCount}
                        sold={product.soldCount}
                        flashSale={product.flashSale}
                        isBestSeller={product.isBestSeller}
                        provinceName={displayProvince}
                        currency={lowestVariant?.currency ?? "VND"}
                      />
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        if (page <= 0) return;
                        setPage(page - 1);
                        scrollToProducts();
                      }}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-gray-400 bg-white text-gray-600 shadow-xs transition-colors hover:border-gray-950 hover:bg-gray-50 hover:text-gray-900"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {getPaginationRange(page, totalPages).map((p, idx) => {
                      if (p === "...") {
                        return (
                          <span
                            key={`dots-${idx}`}
                            className="px-2 py-1.5 text-sm text-gray-400 select-none font-medium"
                          >
                            ...
                          </span>
                        );
                      }

                      const pageNum = p as number;
                      const isCurrent = pageNum - 1 === page;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            setPage(pageNum - 1);
                            scrollToProducts();
                          }}
                          className={`w-9 h-9 flex items-center justify-center text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                            isCurrent
                              ? "bg-gray-950 text-white shadow-xs border border-gray-950"
                              : "border border-gray-400 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-950 hover:text-gray-900 shadow-xs"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => {
                        if (page + 1 >= totalPages) return;
                        setPage(page + 1);
                        scrollToProducts();
                      }}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-gray-400 bg-white text-gray-600 shadow-xs transition-colors hover:border-gray-950 hover:bg-gray-50 hover:text-gray-900"
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          </div>
        )}
      </div>
      <ImageLightbox
        src={previewLogo ? merchant.logoUrl : null}
        alt={merchant.name}
        onClose={() => setPreviewLogo(false)}
      />
    </div>
  );
}
