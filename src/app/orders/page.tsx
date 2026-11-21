"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Loader2, Store } from "lucide-react";
import { Button, EmptyState, Badge, Pagination } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
import OrderReturns from "./_components/OrderReturns";
import { orderService, productService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getOrderStatus } from "@/lib/domain/status/order";
import { formatVariantLabel } from "@/shared/lib/product-utils";
import { productPath } from "@/shared/lib/product-url";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import { useMerchantNameMap, useTranslation } from "@/hooks";
import type { Product } from "@/types";

const STATUS_DOT_CLASS: Record<string, string> = {
  default: "bg-gray-500",
  success: "bg-green-600",
  warning: "bg-yellow-500",
  danger: "bg-red-600",
  info: "bg-blue-600",
};

function OrdersInner() {
  const { t, locale } = useTranslation();
  const merchantNameById = useMerchantNameMap();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const TABS = [
    { key: "all", label: t("orders.all") },
    { key: "PENDING,APPROVED", label: t("orders.pending") },
    { key: "PREPARING", label: t("orders.processing") },
    { key: "SHIPPED", label: t("orders.shipping") },
    { key: "COMPLETED", label: t("orders.completed") },
    { key: "CANCELLED,REJECTED", label: t("orders.cancelled") },
    { key: "RETURNS", label: t("orders.returns.title") },
  ] as const;

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const activeTab: (typeof TABS)[number]["key"] =
    tabParam && TABS.some((t) => t.key === tabParam)
      ? (tabParam as (typeof TABS)[number]["key"])
      : "all";

  const handleTabChange = (key: (typeof TABS)[number]["key"]) => {
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (key === "all") {
      params.delete("tab");
    } else {
      params.set("tab", key);
    }
    const query = params.toString();
    router.replace(query ? `/orders?${query}` : "/orders", { scroll: false });
  };

  const isReturnsTab = activeTab === "RETURNS";
  const status =
    activeTab === "all" || isReturnsTab ? undefined : activeTab;
  const { data: orders, isLoading } = useQuery({
    queryKey: qk.orders({ status, limit: 100 }),
    queryFn: () => orderService.listMine({ status, limit: 100 }),
    enabled: !isReturnsTab,
  });

  const totalOrders = orders?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    if (!orders) return [];
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return orders.slice(start, start + PAGE_SIZE);
  }, [orders, safeCurrentPage]);

  const allSkuIds = useMemo(() => {
    if (!orders) return [];
    const set = new Set<string>();
    orders.forEach((o) => o.items.forEach((i) => set.add(i.skuId)));
    return Array.from(set);
  }, [orders]);

  const { data: productList } = useQuery({
    queryKey: ["orders-products", allSkuIds.join(",")],
    queryFn: () => productService.resolveBySkuIds(allSkuIds),
    enabled: allSkuIds.length > 0,
  });

  const skuLookup = useMemo(() => {
    const map = new Map<string, { product: Product; variantIdx: number }>();
    productList?.forEach((p) => {
      p.variants.forEach((v, idx) => {
        map.set(v.skuId, { product: p, variantIdx: idx });
      });
    });
    return map;
  }, [productList]);

  return (
    <MemberPageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            {t("orders.title")}
          </h1>
        </div>
      </div>

      {/* Filter Tabs Bar - Apple-style distinct outline pill tabs */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-gray-950 text-white border border-gray-950 shadow-xs"
                  : "bg-white text-gray-700 border border-gray-950 hover:bg-gray-100 hover:text-black"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {isReturnsTab ? (
        <OrderReturns
          highlight={searchParams.get("highlight")}
          onViewOrders={() => handleTabChange("all")}
        />
      ) : (
        <div className="space-y-4">
          {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-400 py-20 flex justify-center shadow-xs">
            <Loader2 className="animate-spin text-brand" size={32} />
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-400 p-8 shadow-xs">
            <EmptyState
              icon={Package}
              title={t("orders.noOrders")}
              description={t("orders.noOrdersDesc")}
              action={
                <Link href="/products">
                  <Button className="bg-brand hover:bg-brand-strong text-white rounded-xl">
                    {t("cart.continueShopping")}
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {paginatedOrders.map((order) => {
                const cfg = getOrderStatus(order.status);
                return (
                  <motion.div
                    key={order.orderId}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl border border-gray-400 shadow-xs overflow-hidden transition-all hover:shadow-md"
                  >
                    {/* Order header - styled cleanly like Apple / Modern e-commerce */}
                    <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-b border-gray-100 bg-gray-50/60">
                      <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                        <div className="flex h-10 w-10 items-center justify-center text-brand shrink-0">
                          <Package size={24} />
                        </div>
                        <Link
                          href={`/merchants/${order.merchantId}`}
                          className="truncate text-base sm:text-lg font-bold text-gray-950 transition-colors hover:text-brand"
                        >
                          {merchantNameById.get(order.merchantId) ??
                            t("orders.store")}
                        </Link>
                        <Link
                          href={`/merchants/${order.merchantId}`}
                          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-gray-950 bg-gray-950 px-2.5 text-[11px] font-semibold text-white transition-colors hover:border-neutral-800 hover:bg-neutral-800"
                        >
                          <Store size={12} />
                          {t("orders.viewStore")}
                        </Link>
                        <span
                          className={`hidden h-2 w-2 shrink-0 rounded-full sm:inline-block ${STATUS_DOT_CLASS[cfg?.variant ?? "default"]}`}
                        />
                        <span className="text-sm font-medium text-gray-500">
                          {formatDate(order.createdAt, locale)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={cfg?.variant ?? "default"}
                          className="!rounded-full !px-3 !py-1 !text-sm"
                        >
                          {cfg ? t(cfg.labelKey) : order.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Product rows */}
                    <div className="divide-y divide-gray-100">
                      {order.items.map((item) => {
                        const lookup = skuLookup.get(item.skuId);
                        const product = lookup?.product;
                        const variant = product?.variants[lookup!.variantIdx];
                        const image =
                          product?.imageList?.[0] ?? "/images/logo.png";
                        const productName = product?.name ?? item.skuId;
                        const originalUnit = item.originalUnitPrice;
                        const hasDiscount =
                          originalUnit != null && originalUnit > item.unitPrice;
                        const variantLabel = formatVariantLabel(
                          variant?.attributeValues,
                          " · ",
                        );
                        return (
                          <Link
                            key={item.skuId}
                            href={
                              product
                                ? productPath(product)
                                : `/orders/${order.orderId}?fromTab=${encodeURIComponent(activeTab)}`
                            }
                            className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors group"
                          >
                            <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-gray-400 bg-white rounded-xl">
                              <Image
                                src={image}
                                alt={productName}
                                fill
                                className="object-contain p-1.5"
                                sizes="80px"
                              />
                            </div>
                            <div className="flex-1 min-w-0 pr-4">
                              <h4 className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-brand transition-colors">
                                {productName}
                              </h4>
                              {variantLabel && (
                                <p className="mt-1 text-sm text-gray-500 truncate">
                                  {t("orders.variantLabel")}
                                  {variantLabel}
                                </p>
                              )}
                              <p className="mt-1 text-sm text-gray-500 font-mono">
                                x{item.qty}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-baseline justify-end gap-2 text-right">
                              {hasDiscount && (
                                <span className="text-sm text-gray-400 line-through">
                                  {formatCurrency(
                                    originalUnit ?? item.unitPrice,
                                    order.currency,
                                  )}
                                </span>
                              )}
                              <span
                                className={`text-lg font-extrabold ${
                                  hasDiscount
                                    ? "bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 bg-clip-text text-transparent"
                                    : "text-gray-950"
                                }`}
                              >
                                {formatCurrency(item.unitPrice, order.currency)}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>

                    {/* Order footer with total & action buttons */}
                    <div className="bg-white px-6 py-4 border-t border-gray-100">
                      <div className="flex flex-col items-end gap-0.5 text-right">
                        <div className="flex items-baseline justify-end gap-2">
                          <span className="text-sm text-gray-600">
                            {t("orders.total")}:
                          </span>
                          <span className="text-2xl sm:text-3xl font-extrabold text-gray-950">
                            {formatCurrency(order.totalAmount, order.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-3 mt-3">
                        <Link
                          href={`/orders/${order.orderId}?fromTab=${encodeURIComponent(activeTab)}`}
                        >
                          <Button
                            size="sm"
                            className="h-9 rounded-xl border border-purple-500/40 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 px-4 text-xs font-bold text-white shadow-md shadow-purple-600/20 transition-all hover:from-purple-600 hover:via-fuchsia-500 hover:to-indigo-600"
                          >
                            {t("orders.viewDetails")}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              className="border-t border-gray-100"
            />
          </>
        )}
        </div>
      )}
    </MemberPageLayout>
  );
}

export default function OrdersPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <MemberPageLayout>
            <div className="min-h-[60vh] flex justify-center items-center">
              <Loader2 className="animate-spin text-brand" size={32} />
            </div>
          </MemberPageLayout>
        }
      >
        <OrdersInner />
      </Suspense>
    </AuthGuard>
  );
}
