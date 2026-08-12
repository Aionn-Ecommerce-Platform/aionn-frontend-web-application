"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Edit2, Eye, Loader2, Package, TrendingUp } from "lucide-react";
import { Button, Badge, EmptyState } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { categoryService, productService } from "@/lib/services";
import { useAuthStore } from "@/stores/auth.store";
import { getProductStatus } from "@/lib/domain/status/product";
import { formatCurrency } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import type { ProductStatus } from "@/types";
import {
  CategoryDropdown,
  PricePopover,
  StatusDropdown,
} from "./ProductFilters";

function MerchantProductsInner() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.userId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatus | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priceMin, setPriceMin] = useState<string | null>(null);
  const [priceMax, setPriceMax] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-products", userId],
    queryFn: () =>
      userId
        ? productService.listByMerchant(userId, 0, 200)
        : Promise.resolve(undefined),
    enabled: !!userId,
  });

  const { data: categories } = useQuery({
    queryKey: ["category-roots"],
    queryFn: categoryService.listRoots,
  });
  const visibleProducts = useMemo(() => {
    const products = data?.content ?? [];
    const query = search.trim().toLowerCase();
    const minimum = priceMin ? Number(priceMin) : null;
    const maximum = priceMax ? Number(priceMax) : null;
    return products.filter((product) => {
      const prices = product.variants.map((variant) => variant.price);
      const lowest = prices.length ? Math.min(...prices) : null;
      return (
        (!query || product.name.toLowerCase().includes(query)) &&
        (!status || product.status === status) &&
        (!categoryId || product.categoryIds.includes(categoryId)) &&
        (minimum === null || (lowest !== null && lowest >= minimum)) &&
        (maximum === null || (lowest !== null && lowest <= maximum))
      );
    });
  }, [categoryId, data?.content, priceMax, priceMin, search, status]);
  const hasFilters = Boolean(
    search || status || categoryId || priceMin || priceMax,
  );
  const clearFilters = () => {
    setSearch("");
    setStatus(null);
    setCategoryId(null);
    setPriceMin(null);
    setPriceMax(null);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("merchant.productList.title")}
          </h1>
          <div className="flex items-center gap-2">
            <Link href="/merchant/products/bulk-price">
              <Button variant="outline">
                <TrendingUp size={16} className="mr-1" />
                {t("merchant.productList.bulkPriceBtn")}
              </Button>
            </Link>
            <Link href="/merchant/products/new">
              <Button>
                <Plus size={16} className="mr-1" />
                {t("merchant.productList.addProductBtn")}
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("merchant.productList.searchPlaceholder")}
            className="min-w-64 flex-1 rounded-xl border border-gray-400 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <StatusDropdown value={status} onChange={setStatus} />
          <CategoryDropdown
            value={categoryId}
            options={(categories ?? []).map((category) => ({
              id: category.categoryId,
              label: category.name,
            }))}
            onChange={setCategoryId}
          />
          <PricePopover
            priceMin={priceMin}
            priceMax={priceMax}
            onApply={(minimum, maximum) => {
              setPriceMin(minimum ?? null);
              setPriceMax(maximum ?? null);
            }}
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {t("merchant.productList.clearAll")}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : visibleProducts.length === 0 ? (
          <EmptyState
            icon={Package}
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
            action={
              <Link href="/merchant/products/new">
                <Button>
                  <Plus size={16} className="mr-1" />
                  {t("merchant.productList.addProductBtn")}
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="bg-white rounded-md border border-gray-400 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-400 bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("merchant.productList.colProduct")}
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("merchant.productList.colStatus")}
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("merchant.productList.colVariants")}
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("merchant.productList.colMinPrice")}
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("merchant.productList.colActions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((product) => {
                    const cfg = getProductStatus(product.status);
                    const minPrice =
                      product.variants.length > 0
                        ? Math.min(...product.variants.map((v) => v.price))
                        : null;
                    return (
                      <tr
                        key={product.productId}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {product.name}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono">
                            {product.productId.slice(0, 8)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {cfg ? (
                            <Badge variant={cfg.variant}>
                              {t(cfg.labelKey)}
                            </Badge>
                          ) : (
                            <Badge>{product.status}</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {product.variants.length}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {minPrice !== null ? formatCurrency(minPrice) : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/products/${product.productId}`}>
                              <button
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600"
                                title={t("merchant.productList.viewAction")}
                              >
                                <Eye size={16} />
                              </button>
                            </Link>
                            <Link
                              href={`/merchant/products/${product.productId}/edit`}
                            >
                              <button
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600"
                                title={t("merchant.productList.editAction")}
                              >
                                <Edit2 size={16} />
                              </button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
