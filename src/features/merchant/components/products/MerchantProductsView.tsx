"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BadgeCheck,
  Boxes,
  Edit2,
  Eye,
  Loader2,
  Package,
  PackageSearch,
  Plus,
  Search,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { Badge, Pagination } from "@/shared/ui";
import { ConsoleEmptyState } from "../shared/ConsoleShell";
import AuthGuard from "@/components/auth/AuthGuard";
import {
  categoryService,
  merchantService,
  productService,
} from "@/lib/services";
import { getProductStatus } from "@/lib/domain/status/product";
import { formatCurrency } from "@/shared/lib/utils";
import { ConsoleStatGrid } from "../shared/ConsoleStatGrid";
import { getProductCoverImage } from "@/shared/lib/media";
import { productPath } from "@/shared/lib/product-url";
import { useTranslation } from "@/hooks";
import type { CategoryTreeNode, ProductStatus } from "@/types";
import {
  CategoryDropdown,
  PricePopover,
  StatusDropdown,
} from "./ProductFilters";

function MerchantProductsInner() {
  const { t, locale } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatus | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priceMin, setPriceMin] = useState<string | null>(null);
  const [priceMax, setPriceMax] = useState<string | null>(null);
  const { data: merchant } = useQuery({
    queryKey: ["merchant", "me"],
    queryFn: () => merchantService.getMine(),
    staleTime: 60_000,
  });
  const merchantId = merchant?.merchantId;

  const { data: categoryTree } = useQuery({
    queryKey: ["category-tree"],
    queryFn: categoryService.tree,
  });
  const categoryData = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const descendants = new Map<string, Set<string>>();
    const collect = (node: CategoryTreeNode) => {
      const ids = new Set<string>();
      const walk = (current: CategoryTreeNode) => {
        ids.add(current.category.categoryId);
        current.children?.forEach(walk);
      };
      walk(node);
      return ids;
    };
    const walkTree = (nodes: CategoryTreeNode[], depth: number) => {
      for (const node of nodes) {
        const id = node.category.categoryId;
        descendants.set(id, collect(node));
        options.push({
          id,
          label: `${"— ".repeat(depth)}${node.category.name}`,
        });
        walkTree(node.children ?? [], depth + 1);
      }
    };
    walkTree(categoryTree ?? [], 0);
    return { options, descendants };
  }, [categoryTree]);

  const PAGE_SIZE = 20;
  const filterKey = [search, status, categoryId, priceMin, priceMax].join("|");
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const resetPage = () => setPageState((prev) => ({ ...prev, page: 1 }));
  const categoryFilterIds = categoryId
    ? Array.from(
        categoryData.descendants.get(categoryId) ?? new Set([categoryId]),
      )
    : [];

  const {
    data: productPage,
    isLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: [
      "merchant-products",
      merchantId,
      page,
      search.trim(),
      status,
      categoryId,
      priceMin,
      priceMax,
    ],
    queryFn: () =>
      merchantId
        ? productService.listMineFiltered({
            page: page - 1,
            size: PAGE_SIZE,
            search: search.trim() || undefined,
            status: status ?? undefined,
            categoryIds: categoryFilterIds,
            minPrice: priceMin ?? undefined,
            maxPrice: priceMax ?? undefined,
          })
        : Promise.resolve(undefined),
    enabled: !!merchantId,
  });
  const products = productPage?.content ?? [];
  const totalPages = productPage?.totalPages ?? 1;
  const safePage = Math.min(page, totalPages);
  const setPage = (next: number) =>
    setPageState({ key: filterKey, page: next });

  const { data: statsData } = useQuery({
    queryKey: ["merchant-product-stats", merchantId],
    queryFn: () => productService.merchantStats(),
    enabled: !!merchantId,
  });

  const hasFilters = Boolean(
    search || status || categoryId || priceMin || priceMax,
  );

  const numberFormat = new Intl.NumberFormat(
    locale === "vi" ? "vi-VN" : "en-US",
  );

  const stats = [
    {
      label: t("merchant.productList.statTotal"),
      value: numberFormat.format(statsData?.total ?? 0),
      icon: Package,
      iconClass: "text-purple-300",
    },
    {
      label: t("merchant.productList.statPublished"),
      value: numberFormat.format(statsData?.published ?? 0),
      icon: BadgeCheck,
      iconClass: "text-emerald-300",
    },
    {
      label: t("merchant.productList.statVariants"),
      value: numberFormat.format(statsData?.variants ?? 0),
      icon: Boxes,
      iconClass: "text-amber-300",
    },
    {
      label: t("merchant.productList.statSold"),
      value: numberFormat.format(statsData?.sold ?? 0),
      icon: ShoppingBag,
      iconClass: "text-indigo-300",
    },
  ];

  return (
    <div className="relative rounded-2xl bg-console-panel p-4 text-white shadow-2xl shadow-purple-950/30 sm:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
      </div>

      <div className="relative">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold tracking-tight">
              <span className="text-purple-300">
                {merchant?.name ?? t("merchant.dashboard.yourShop")}
              </span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/merchant/products/bulk-price"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-500 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:border-gray-400 hover:bg-white/10"
            >
              <TrendingUp size={16} />
              {t("merchant.productList.bulkPriceBtn")}
            </Link>
            <Link
              href="/merchant/products/new"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-900/40 transition-all hover:from-purple-500 hover:to-fuchsia-500"
            >
              <Plus size={16} />
              {t("merchant.productList.addProductBtn")}
            </Link>
          </div>
        </div>

        <ConsoleStatGrid stats={stats} />

        <div className="relative z-30 mb-5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-64 flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetPage();
                }}
                placeholder={t("merchant.productList.searchPlaceholder")}
                className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>
            <StatusDropdown
              value={status}
              onChange={(value) => {
                setStatus(value);
                resetPage();
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryDropdown
              value={categoryId}
              options={categoryData.options}
              onChange={(value) => {
                setCategoryId(value);
                resetPage();
              }}
            />
            <PricePopover
              priceMin={priceMin}
              priceMax={priceMax}
              onApply={(minimum, maximum) => {
                setPriceMin(minimum ?? null);
                setPriceMax(maximum ?? null);
                resetPage();
              }}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-purple-400" size={28} />
          </div>
        ) : productsError ? (
          <ConsoleEmptyState
            icon={AlertCircle}
            iconClassName="text-rose-300"
            title={t("common.error")}
            description={t("common.tryAgain")}
          >
            <button
              type="button"
              onClick={() => void refetchProducts()}
              className="rounded-xl border border-gray-500 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
            >
              {t("common.retry")}
            </button>
          </ConsoleEmptyState>
        ) : products.length === 0 ? (
          <ConsoleEmptyState
            icon={PackageSearch}
            title={t(
              hasFilters
                ? "merchant.productList.emptyFilteredTitle"
                : "merchant.productList.emptyTitle",
            )}
            description={t(
              hasFilters
                ? "merchant.productList.emptyFilteredDesc"
                : "merchant.productList.emptyDesc",
            )}
          >
            <Link
              href="/merchant/products/new"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-900/40 transition-all hover:from-purple-500 hover:to-fuchsia-500"
            >
              <Plus size={16} />
              {t("merchant.productList.addProductBtn")}
            </Link>
          </ConsoleEmptyState>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {products.map((product) => {
                const cfg = getProductStatus(product.status);
                const cheapest = product.variants.reduce<
                  (typeof product.variants)[number] | undefined
                >(
                  (best, variant) =>
                    !best || variant.price < best.price ? variant : best,
                  undefined,
                );
                const displayPrice = cheapest?.price ?? null;
                const originalPrice = cheapest?.originalPrice ?? null;
                const discount =
                  originalPrice && displayPrice && originalPrice > displayPrice
                    ? Math.round((1 - displayPrice / originalPrice) * 100)
                    : 0;
                const currency = cheapest?.currency ?? "VND";
                const image = getProductCoverImage(product.imageList);
                return (
                  <div
                    key={product.productId}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-gray-600 bg-white/[0.04] transition-all duration-300 hover:-translate-y-1 hover:border-gray-400 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-purple-950/20"
                  >
                    <div className="relative aspect-square overflow-hidden bg-white/5">
                      <Image
                        src={image}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 20vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-console-panel/80 via-transparent to-transparent" />
                      <div className="absolute left-2.5 top-2.5">
                        {cfg ? (
                          <Badge
                            variant={cfg.variant}
                            className="!rounded-full !px-3 !py-1 !text-[13px]"
                          >
                            {t(cfg.labelKey)}
                          </Badge>
                        ) : (
                          <Badge className="!rounded-full !px-3 !py-1 !text-[13px]">
                            {product.status}
                          </Badge>
                        )}
                      </div>
                      <div className="absolute right-2.5 top-2.5 flex flex-col items-end gap-1">
                        {(product.soldCount ?? 0) > 0 && (
                          <span className="rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                            {numberFormat.format(product.soldCount ?? 0)}{" "}
                            {t("merchant.productList.soldSuffix")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col p-3.5">
                      <h3 className="line-clamp-2 min-h-[2.5rem] text-[15px] font-semibold text-white transition-colors group-hover:text-purple-200">
                        {product.name}
                      </h3>

                      <div className="mt-2">
                        <div className="flex flex-nowrap items-baseline gap-1.5">
                          <span
                            className={`min-w-0 truncate text-lg font-extrabold tracking-tight ${
                              discount > 0
                                ? "bg-gradient-to-r from-purple-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent"
                                : "text-purple-200"
                            }`}
                          >
                            {displayPrice !== null
                              ? formatCurrency(displayPrice, currency)
                              : "—"}
                          </span>
                          {discount > 0 && (
                            <span className="shrink-0 rounded-md bg-fuchsia-500/15 px-1.5 py-0.5 text-[11px] font-bold text-fuchsia-300">
                              -{discount}%
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-baseline justify-between gap-2">
                          {originalPrice !== null &&
                          displayPrice !== null &&
                          originalPrice > displayPrice ? (
                            <span className="text-[13px] font-normal text-slate-500 line-through">
                              {formatCurrency(originalPrice, currency)}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="shrink-0 text-xs text-slate-400">
                            {numberFormat.format(product.variants.length)}{" "}
                            {t("merchant.productList.variantSuffix")}
                          </span>
                        </div>
                      </div>

                      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                        <Link
                          href={productPath(product)}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-gray-600 px-2 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <Eye size={14} />
                          {t("merchant.productList.viewAction")}
                        </Link>
                        <Link
                          href={`/merchant/products/${product.productId}/edit`}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-purple-600 px-2 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-purple-500"
                        >
                          <Edit2 size={14} />
                          {t("merchant.productList.editAction")}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function MerchantProductsPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantProductsInner />
    </AuthGuard>
  );
}
