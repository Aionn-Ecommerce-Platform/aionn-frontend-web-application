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
        <div className="bg-white rounded-xl border border-gray-400 overflow-hidden shadow-sm p-0 mb-8 transition-all duration-300">
          <div className="flex flex-col lg:flex-row">
            <div className="lg:w-1/3 bg--merchant-surface p-6 text-white flex flex-col justify-between gap-6 relative">
              <div className="flex items-center gap-4">
                {merchant.logoUrl ? (
                  <div className="w-16 h-16 relative rounded-full overflow-hidden border-2 border-white/20 shrink-0">
                    <Image
                      src={merchant.logoUrl}
                      alt={merchant.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold border-2 border-white/20 shrink-0">
                    {initial}
                  </div>
                )}
                <div>
                  <h1 className="text-lg font-bold truncate max-w-[200px]">
                    {merchant.name}
                  </h1>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleStartChat}
                  disabled={chatLoading}
                  className="w-full py-1.5 px-3 border border-white rounded text-xs font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  {chatLoading ? (
                    <Loader2 className="animate-spin text-white" size={12} />
                  ) : (
                    <MessageCircle size={12} />
                  )}
                  {t("merchantStore.chat")}
                </button>
              </div>
            </div>

            <div className="lg:w-2/3 p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm text-gray-700">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Store size={16} className="text-gray-500" />
                  <span>
                    {t("merchantStore.products")}:{" "}
                    <span className="text--sale font-medium">
                      {totalElements}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-500" />
                  <span>
                    {t("merchantStore.location")}:{" "}
                    <span className="text--sale font-medium">
                      {displayProvince || t("merchantStore.notUpdated")}
                    </span>
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-500" />
                  <span>
                    Tham Gia:{" "}
                    <span className="text--sale font-medium">
                      {formattedDate}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      merchant.status === "ACTIVE" ? "success" : "warning"
                    }
                  >
                    {merchant.status === "ACTIVE"
                      ? t("merchantStore.active")
                      : merchant.status}
                  </Badge>
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
          <aside className="w-full lg:w-60 shrink-0">
            <div className="bg-white rounded-xl border border-gray-400 p-5 space-y-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-150 pb-3">
                <Store size={16} className="text-gray-500" />
                {t("merchants.shopCategories") || t("merchantStore.categories")}
              </h3>

              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setPage(0);
                      scrollToProducts();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all font-medium flex items-center justify-between ${
                      selectedCategory === null
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-55"
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
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all font-medium flex items-center justify-between ${
                          isActive
                            ? "bg-blue-50 text-blue-700 font-bold"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-55"
                        }`}
                      >
                        <span className="truncate mr-2">{label}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-blue-100 text-blue-800" : "bg-gray-150 text-gray-500"}`}
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

          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
                      className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-400 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900 transition-colors shadow-sm cursor-pointer"
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
                          className={`w-9 h-9 flex items-center justify-center text-sm font-semibold rounded-full transition-all cursor-pointer ${
                            isCurrent
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/10 border border-blue-600"
                              : "border border-gray-400 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900"
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
                      className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-400 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900 transition-colors shadow-sm cursor-pointer"
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
