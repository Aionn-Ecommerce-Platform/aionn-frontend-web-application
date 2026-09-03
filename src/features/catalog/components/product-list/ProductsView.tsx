"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Grid3X3, List, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks";
import { buildCategoryNameMap } from "@/shared/lib/category-utils";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  brandService,
  categoryService,
  geographyService,
  productService,
} from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { formatCurrency } from "@/shared/lib/utils";
import { cleanProvinceName } from "@/shared/lib/address-utils";
import {
  buildFilterItems,
  hasCatalogFilters,
  readMultiParam,
} from "@/lib/domain/catalog";
import type { ProductSort } from "@/types";

import { ChipButton, SortDropdown } from "./CatalogControls";
import CatalogSidebar from "./CatalogSidebar";
import CatalogResults from "./CatalogResults";
function ProductsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useTranslation();

  const merchantId = searchParams.get("merchantId") ?? undefined;
  const queryText = (searchParams.get("q") ?? "").trim();
  const categoryIds = useMemo(() => {
    const ids = readMultiParam(searchParams, "categoryIds");
    const legacyId = searchParams.get("categoryId")?.trim();
    if (!legacyId || ids.includes(legacyId)) return ids;
    return [...ids, legacyId];
  }, [searchParams]);
  const brandIds = useMemo(
    () => readMultiParam(searchParams, "brandIds"),
    [searchParams],
  );
  const priceMin = searchParams.get("priceMin");
  const priceMax = searchParams.get("priceMax");
  const sortParam = (searchParams.get("sort") ?? "NEWEST") as ProductSort;
  const page = Number(searchParams.get("page") ?? 0) || 0;
  const size = 50;

  const ratingMin = searchParams.get("ratingMin")
    ? Number(searchParams.get("ratingMin"))
    : undefined;
  const onSale = searchParams.get("onSale") === "true";
  const shipping = useMemo(
    () => readMultiParam(searchParams, "shipping"),
    [searchParams],
  );
  const provinceCodes = useMemo(
    () => readMultiParam(searchParams, "provinceCodes"),
    [searchParams],
  );

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const setParam = useCallback(
    (
      mutate: (sp: URLSearchParams) => void,
      opts?: { resetPage?: boolean; scroll?: boolean },
    ) => {
      const sp = new URLSearchParams(searchParams.toString());
      mutate(sp);
      if (opts?.resetPage !== false) {
        sp.delete("page");
      }
      const qs = sp.toString();
      router.replace(qs ? `/products?${qs}` : "/products", { scroll: false });
      if (opts?.scroll) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [router, searchParams],
  );

  const toggleMulti = (
    key: "categoryIds" | "brandIds" | "shipping" | "provinceCodes",
    value: string,
  ) => {
    setParam(
      (sp) => {
        const current = readMultiParam(sp, key);
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        if (next.length === 0) sp.delete(key);
        else sp.set(key, next.join(","));
      },
      { scroll: true },
    );
  };

  const toggleRating = (value: number) => {
    setParam(
      (sp) => {
        const current = sp.get("ratingMin");
        if (current === String(value)) {
          sp.delete("ratingMin");
        } else {
          sp.set("ratingMin", String(value));
        }
      },
      { scroll: true },
    );
  };

  const toggleOnSale = () => {
    setParam(
      (sp) => {
        if (sp.get("onSale") === "true") {
          sp.delete("onSale");
        } else {
          sp.set("onSale", "true");
        }
      },
      { scroll: true },
    );
  };

  const setPriceRange = (min?: string, max?: string) => {
    setParam(
      (sp) => {
        if (min) sp.set("priceMin", min);
        else sp.delete("priceMin");
        if (max) sp.set("priceMax", max);
        else sp.delete("priceMax");
      },
      { scroll: true },
    );
  };

  const setSort = (sort: ProductSort) => {
    setParam(
      (sp) => {
        sp.set("sort", sort);
      },
      { scroll: true },
    );
  };

  const setPage = (next: number) => {
    setParam(
      (sp) => {
        if (next <= 0) sp.delete("page");
        else sp.set("page", String(next));
      },
      { resetPage: false, scroll: true },
    );
  };

  const clearAll = () => {
    router.replace("/products", { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const searchKey = useMemo(
    () => ({
      q: queryText || undefined,
      merchantId,
      categoryIds,
      brandIds,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      sort: sortParam,
      page,
      size,
      ratingMin,
      onSale: onSale || undefined,
      shipping,
      provinceCodes,
    }),
    [
      queryText,
      merchantId,
      categoryIds,
      brandIds,
      priceMin,
      priceMax,
      sortParam,
      page,
      ratingMin,
      onSale,
      shipping,
      provinceCodes,
    ],
  );

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: qk.productSearch(searchKey),
    queryFn: () =>
      productService.search({
        ...searchKey,
        status: "PUBLISHED",
      }),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const { data: brandPage } = useQuery({
    queryKey: ["brands", "all"],
    queryFn: () => brandService.list(0, 100),
    staleTime: 5 * 60_000,
  });
  const { data: categoryTree } = useQuery({
    queryKey: qk.categoriesTree,
    queryFn: () => categoryService.tree(),
    staleTime: 5 * 60_000,
  });
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

  const brandNameById = useMemo(() => {
    const m = new Map<string, string>();
    (brandPage?.content ?? []).forEach((b) => m.set(b.brandId, b.name));
    return m;
  }, [brandPage]);
  const categoryNameById = useMemo(
    () => buildCategoryNameMap(categoryTree),
    [categoryTree],
  );

  const products = data?.page.content ?? [];
  const totalElements = data?.page.totalElements ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const facets = data?.facets;

  const categoryFilterItems = useMemo(() => {
    return buildFilterItems({
      names: categoryNameById,
      counts: facets?.categories,
      selectedIds: categoryIds,
    });
  }, [facets, categoryNameById, categoryIds]);

  const brandFilterItems = useMemo(() => {
    return buildFilterItems({
      names: brandNameById,
      counts: facets?.brands,
      selectedIds: brandIds,
    });
  }, [facets, brandNameById, brandIds]);

  const hasActiveFilter = hasCatalogFilters([
    queryText,
    categoryIds.length,
    brandIds.length,
    priceMin,
    priceMax,
    merchantId,
    ratingMin,
    onSale,
    shipping.length,
    provinceCodes.length,
  ]);

  return (
    <div className="bg-gray-50 min-h-screen relative">
      {isFetching && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-blue-100/30 z-[9999] overflow-hidden">
          <div className="animate-top-loader rounded-r-full" />
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {queryText ? queryText : t("products.title")}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isLoading
                ? t("products.loading")
                : queryText
                  ? t("products.searchResults", {
                      count: totalElements,
                      query: queryText,
                    })
                  : hasActiveFilter
                    ? t("products.resultsCountFiltered").replace(
                        "{count}",
                        String(totalElements),
                      )
                    : t("products.resultsCount").replace(
                        "{count}",
                        String(totalElements),
                      )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SortDropdown value={sortParam} onChange={setSort} t={t} />
            <div className="flex h-11 border border-gray-400 rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex h-full items-center justify-center px-2.5 ${viewMode === "grid" ? "bg-blue-50 text-blue-600" : "bg-white text-gray-400"}`}
                aria-label="Grid view"
              >
                <Grid3X3 size={18} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex h-full items-center justify-center px-2.5 ${viewMode === "list" ? "bg-blue-50 text-blue-600" : "bg-white text-gray-400"}`}
                aria-label="List view"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {hasActiveFilter && (
          <div className="flex flex-wrap items-center gap-2 mb-6 text-sm bg-white p-3.5 rounded-xl border border-gray-400 shadow-sm">
            <span className="text-gray-600 font-semibold mr-1">
              {t("products.filterBy")}:
            </span>
            {categoryIds.map((id) => (
              <ChipButton
                key={`cat-${id}`}
                label={categoryNameById.get(id) ?? id}
                onRemove={() => toggleMulti("categoryIds", id)}
              />
            ))}
            {brandIds.map((id) => (
              <ChipButton
                key={`brand-${id}`}
                label={brandNameById.get(id) ?? id}
                onRemove={() => toggleMulti("brandIds", id)}
              />
            ))}
            {provinceCodes.map((code) => (
              <ChipButton
                key={`loc-${code}`}
                label={provinceNameByCode.get(code) ?? code}
                onRemove={() => toggleMulti("provinceCodes", code)}
              />
            ))}
            {ratingMin && (
              <ChipButton
                label={`${ratingMin} sao+`}
                onRemove={() => toggleRating(ratingMin)}
              />
            )}
            {onSale && (
              <ChipButton
                label={t("products.onSale")}
                onRemove={toggleOnSale}
              />
            )}
            {(priceMin || priceMax) && (
              <ChipButton
                label={
                  priceMin && priceMax
                    ? `${formatCurrency(Number(priceMin))} - ${formatCurrency(Number(priceMax))}`
                    : priceMin
                      ? `>= ${formatCurrency(Number(priceMin))}`
                      : `<= ${formatCurrency(Number(priceMax))}`
                }
                onRemove={() => setPriceRange(undefined, undefined)}
              />
            )}
            {shipping.map((s) => (
              <ChipButton
                key={`ship-${s}`}
                label={s}
                onRemove={() => toggleMulti("shipping", s)}
              />
            ))}
            <button
              onClick={clearAll}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors ml-2 cursor-pointer"
            >
              {t("products.clearAll")}
            </button>
          </div>
        )}

        <div className="flex gap-6">
          <CatalogSidebar
            onSale={onSale}
            categoryItems={categoryFilterItems}
            brandItems={brandFilterItems}
            provinces={provinces ?? []}
            provinceCodes={provinceCodes}
            rating={ratingMin}
            priceMin={priceMin}
            priceMax={priceMax}
            priceBounds={facets?.priceRange ?? null}
            attributes={facets?.attributes ?? {}}
            onSaleChange={toggleOnSale}
            onCategory={(id) => toggleMulti("categoryIds", id)}
            onBrand={(id) => toggleMulti("brandIds", id)}
            onProvince={(code) => toggleMulti("provinceCodes", code)}
            onRating={toggleRating}
            onPrice={setPriceRange}
          />
          <div className="flex-1">
            <CatalogResults
              products={products}
              loading={isLoading}
              failed={Boolean(error)}
              filtered={hasActiveFilter}
              mode={viewMode}
              provinces={provinceNameByCode}
              page={page}
              pages={totalPages}
              onPage={setPage}
              onClear={clearAll}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      }
    >
      <ProductsInner />
    </Suspense>
  );
}
