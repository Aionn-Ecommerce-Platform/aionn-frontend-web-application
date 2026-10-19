"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Eye, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, EmptyState, Badge } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
import { orderService, productService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getOrderStatus } from "@/lib/domain/status/order";
import { formatVariantLabel } from "@/shared/lib/product-utils";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import type { Product } from "@/types";

function OrdersInner() {
  const { t, locale } = useTranslation();
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

  const status = activeTab === "all" ? undefined : activeTab;
  const { data: orders, isLoading } = useQuery({
    queryKey: qk.orders({ status, limit: 100 }),
    queryFn: () => orderService.listMine({ status, limit: 100 }),
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
                  ? "bg-gray-950 text-white border-2 border-gray-950 shadow-xs"
                  : "bg-white text-gray-700 border-2 border-gray-900 hover:bg-gray-100 hover:text-black"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-200/90 py-20 flex justify-center shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <Loader2 className="animate-spin text-brand" size={32} />
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/90 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
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
                const totalQty = order.items.reduce((s, i) => s + i.qty, 0);
                return (
                  <motion.div
                    key={order.orderId}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-md"
                  >
                    {/* Order header - styled cleanly like Apple / Modern e-commerce */}
                    <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-b border-gray-100 bg-gray-50/60">
                      <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                        <div className="w-7 h-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                          <Package size={15} />
                        </div>
                        <span className="text-xs font-mono font-bold text-gray-950 bg-white border border-gray-200/80 px-2 py-0.5 rounded-md">
                          {order.orderSn || order.orderId}
                        </span>
                        <span className="text-gray-300 hidden sm:inline">•</span>
                        <span className="text-xs sm:text-sm font-medium text-gray-500">
                          {formatDate(order.createdAt, locale)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={cfg?.variant ?? "default"}>
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
                        const variantLabel = formatVariantLabel(
                          variant?.attributeValues,
                          " · ",
                        );
                        return (
                          <Link
                            key={item.skuId}
                            href={`/orders/${order.orderId}?fromTab=${encodeURIComponent(activeTab)}`}
                            className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors group"
                          >
                            <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-gray-200 bg-white rounded-xl">
                              <Image
                                src={image}
                                alt={productName}
                                fill
                                className="object-contain p-1.5"
                                sizes="80px"
                              />
                            </div>
                            <div className="flex-1 min-w-0 pr-4">
                              <h4 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug group-hover:text-brand transition-colors">
                                {productName}
                              </h4>
                              {variantLabel && (
                                <p className="mt-1 text-xs text-gray-500 truncate">
                                  {t("orders.variantLabel")}
                                  {variantLabel}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-gray-500 font-mono">
                                x{item.qty}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-gray-900">
                                {formatCurrency(item.unitPrice, order.currency)}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>

                    {/* Order footer with total & action buttons */}
                    <div className="bg-white px-6 py-4 border-t border-gray-100">
                      <div className="flex flex-col items-end gap-0.5 text-right">
                        <div className="flex items-baseline justify-end gap-2">
                          <span className="text-xs text-gray-500">
                            {t("orders.total")} ({totalQty}{" "}
                            {t("orders.products").toLowerCase()}):
                          </span>
                          <span className="text-xl sm:text-2xl font-bold text-gray-900">
                            {formatCurrency(order.totalAmount, order.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-3 mt-3 border-t border-gray-100">
                        <Link
                          href={`/orders/${order.orderId}?fromTab=${encodeURIComponent(activeTab)}`}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-4 text-xs font-semibold border-gray-200 hover:border-brand hover:text-brand text-gray-800 rounded-xl"
                          >
                            <Eye size={14} className="mr-1.5 text-gray-400" />
                            {t("orders.viewDetails")}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Apple-style Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-6 pb-2 flex items-center justify-between border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium">
                  {safeCurrentPage} / {totalPages} ({(safeCurrentPage - 1) * PAGE_SIZE + 1} - {Math.min(safeCurrentPage * PAGE_SIZE, totalOrders)} / {totalOrders})
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={safeCurrentPage <= 1}
                    aria-label="Previous Page"
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-900 bg-white text-gray-900 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
                      (pageNum) => {
                        const isSelected = pageNum === safeCurrentPage;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => {
                              setCurrentPage(pageNum);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className={`h-9 min-w-9 px-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                              isSelected
                                ? "bg-gray-950 text-white border-2 border-gray-950 shadow-xs"
                                : "bg-white text-gray-800 border-2 border-gray-900 hover:bg-gray-100"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      },
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={safeCurrentPage >= totalPages}
                    aria-label="Next Page"
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-900 bg-white text-gray-900 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
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
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          </MemberPageLayout>
        }
      >
        <OrdersInner />
      </Suspense>
    </AuthGuard>
  );
}
