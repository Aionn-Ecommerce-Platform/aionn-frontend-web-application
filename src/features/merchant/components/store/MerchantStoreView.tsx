"use client";

import Image from "next/image";
import { use, useState, useMemo, useRef } from "react";
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
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge, EmptyState } from "@/shared/ui";
import ProductCard from "@/components/product/ProductCard";
import {
  conversationService,
  merchantService,
  productService,
  shopVoucherService,
  voucherService,
  geographyService,
  categoryService,
} from "@/lib/services";
import { useAuthStore } from "@/stores/auth.store";
import { formatMonthYear } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import { qk } from "@/lib/query-keys";
import { cleanProvinceName } from "@/shared/lib/address-utils";
import { getPaginationRange } from "@/shared/lib/pagination";
import { buildCategoryNameMap } from "@/shared/lib/category-utils";
import type { Product, UserVoucher } from "@/types";
import MerchantVouchers from "./MerchantVouchers";

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
  const [claimingVoucherCode, setClaimingVoucherCode] = useState<string | null>(
    null,
  );
  const productsRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();

  const { data: merchant, isLoading: loadingM } = useQuery({
    queryKey: ["merchant", id],
    queryFn: () => merchantService.get(id),
  });

  const scrollToProducts = () => {
    if (productsRef.current) {
      const yOffset = -120;
      const elementPosition = productsRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY + yOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
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
    queryKey: ["merchant-products-search", id, page, selectedCategory],
    queryFn: () =>
      productService.search({
        merchantId: id,
        status: "PUBLISHED",
        page,
        size: 25,
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
    queryFn: () => shopVoucherService.listByMerchant(id, 20),
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
        <Loader2 className="animate-spin text-blue-600" size={32} />
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

  const displayProvince = merchant.provinceCode
    ? provinceNameByCode.get(merchant.provinceCode)
    : merchant.provinceName
      ? cleanProvinceName(merchant.provinceName)
      : undefined;

  const totalElements = searchResult?.page.totalElements ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalElements / 25));

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Store Hero Banner */}
        <div className="bg-white rounded-3xl border border-gray-200/80 overflow-hidden shadow-xs mb-8">
          {/* Top Decorative Gradient Cover */}
          <div className="h-32 sm:h-36 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.25),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.2),transparent_50%)]" />
          </div>

          {/* Store Info & Stats Content */}
          <div className="px-6 sm:px-8 pb-8 pt-0 -mt-16 sm:-mt-20 relative">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pb-6 border-b border-gray-100">
              {/* Avatar + Store Identity */}
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
                <div className="relative">
                  {merchant.logoUrl ? (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 relative rounded-2xl overflow-hidden border-4 border-white shadow-md bg-white shrink-0">
                      <Image
                        src={merchant.logoUrl}
                        alt={merchant.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-extrabold border-4 border-white shadow-md shrink-0">
                      {initial}
                    </div>
                  )}
                  {merchant.status === "ACTIVE" && (
                    <span
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-200 flex items-center justify-center"
                      title={t("merchantStore.active")}
                    >
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-gray-950 tracking-tight">
                      {merchant.name}
                    </h1>
                    <Badge
                      variant={
                        merchant.status === "ACTIVE" ? "success" : "warning"
                      }
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    >
                      {merchant.status === "ACTIVE"
                        ? t("merchantStore.active")
                        : merchant.status}
                    </Badge>
                  </div>
                  {merchant.description && (
                    <p className="text-sm text-gray-600 line-clamp-1 max-w-xl">
                      {merchant.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 font-mono">
                    ID: {merchant.merchantId}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleStartChat}
                  disabled={chatLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {chatLoading ? (
                    <Loader2 className="animate-spin text-white" size={16} />
                  ) : (
                    <MessageCircle size={16} />
                  )}
                  <span>{t("merchantStore.chat")}</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
                  <Store size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">
                    {t("merchantStore.products")}
                  </p>
                  <p className="text-base font-bold text-gray-900 mt-0.5">
                    {totalElements}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">
                    {t("merchantStore.location")}
                  </p>
                  <p className="text-base font-bold text-gray-900 mt-0.5 truncate max-w-[150px]">
                    {displayProvince || t("merchantStore.notUpdated")}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100/70 text-purple-600 flex items-center justify-center shrink-0">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">
                    {t("merchantStore.joined")}
                  </p>
                  <p className="text-base font-bold text-gray-900 mt-0.5">
                    {formattedDate}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">
                    Status
                  </p>
                  <p className="text-base font-bold text-gray-900 mt-0.5">
                    {merchant.status === "ACTIVE"
                      ? t("merchantStore.active")
                      : merchant.status}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <MerchantVouchers
          vouchers={shopVouchers ?? []}
          merchant={merchant}
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

        <div ref={productsRef} className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 space-y-4 shadow-xs sticky top-24">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Store size={18} className="text-blue-600" />
                <span>
                  {t("merchants.shopCategories") || t("merchantStore.categories")}
                </span>
              </h3>

              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setPage(0);
                      scrollToProducts();
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all font-medium flex items-center justify-between cursor-pointer ${
                      selectedCategory === null
                        ? "bg-blue-50 text-blue-700 font-bold shadow-xs"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <span>
                      {t("merchants.allProducts") ||
                        t("merchantStore.allProducts")}
                    </span>
                  </button>
                </li>
                {Object.entries(categoryFacets).map(([catId, count]) => {
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
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all font-medium flex items-center justify-between cursor-pointer ${
                          isActive
                            ? "bg-blue-50 text-blue-700 font-bold shadow-xs"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                      >
                        <span className="truncate mr-2">{label}</span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isActive ? "bg-blue-200/70 text-blue-800" : "bg-gray-100 text-gray-500"}`}
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
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {selectedCategory
                ? categoryNameById.get(selectedCategory) ||
                  t("common.allProducts")
                : t("merchants.allShopProducts") ||
                  (locale === "en"
                    ? "All products of this shop"
                    : t("merchantStore.allStoreProducts"))}
            </h2>

            {loadingP ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="animate-spin text-blue-600" size={28} />
              </div>
            ) : !searchResult || searchResult.page.content.length === 0 ? (
              <EmptyState
                icon={Store}
                title={t("merchantStore.categoryEmpty")}
                description={t("merchantStore.categoryEmptyDescription")}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4">
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
                        name={product.name}
                        price={price}
                        originalPrice={originalPrice}
                        image={image}
                        merchant={product.merchantId}
                        rating={product.rating}
                        reviewCount={product.reviewCount}
                        sold={product.soldCount}
                        flashSale={product.flashSale}
                        provinceName={displayProvince}
                      />
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    <button
                      disabled={page === 0}
                      onClick={() => {
                        setPage(Math.max(0, page - 1));
                        scrollToProducts();
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900 transition-colors shadow-xs cursor-pointer"
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
                              ? "bg-blue-600 text-white shadow-xs border border-blue-600"
                              : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 shadow-xs"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      disabled={page + 1 >= totalPages}
                      onClick={() => {
                        setPage(page + 1);
                        scrollToProducts();
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900 transition-colors shadow-xs cursor-pointer"
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
      </div>
    </div>
  );
}
