"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Eye, Loader2, Truck, CheckCircle2 } from "lucide-react";
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

  const activeTab: (typeof TABS)[number]["key"] =
    tabParam && TABS.some((t) => t.key === tabParam)
      ? (tabParam as (typeof TABS)[number]["key"])
      : "all";

  const handleTabChange = (key: (typeof TABS)[number]["key"]) => {
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
    queryKey: qk.orders({ status, limit: 50 }),
    queryFn: () => orderService.listMine({ status, limit: 50 }),
  });

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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t("orders.title")}
      </h1>

      {/* Filter Tabs Bar - coordinated with product & address pages */}
      <div className="flex overflow-x-auto bg-white border border-gray-100 mb-6 rounded-sm shadow-xs">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex-1 min-w-[120px] py-3.5 px-4 text-center text-sm font-medium whitespace-nowrap transition-colors relative cursor-pointer ${
                isActive
                  ? "text-blue-700 font-bold bg-blue-100"
                  : "text-gray-600 hover:text-blue-700 hover:bg-gray-50/70"
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700" />
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-sm border border-gray-100 py-20 flex justify-center shadow-xs">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="bg-white rounded-sm border border-gray-100 p-8 shadow-xs">
            <EmptyState
              icon={Package}
              title={t("orders.noOrders")}
              description={t("orders.noOrdersDesc")}
              action={
                <Link href="/products">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xs">
                    {t("cart.continueShopping")}
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {orders.map((order) => {
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
                  className="bg-white rounded-sm border border-gray-100 shadow-xs overflow-hidden transition-all hover:border-gray-200"
                >
                  {/* Order header - styled like Address page / Product card */}
                  <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-b border-gray-100 bg-gray-50/60">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center gap-2 font-semibold text-sm text-gray-900">
                        <Package size={16} className="text-blue-600 shrink-0" />
                        <span className="font-mono text-xs text-gray-700">
                          #{order.orderId.slice(0, 12).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-gray-300">|</span>
                      <span className="text-xs text-gray-500 shrink-0">
                        {formatDate(order.createdAt, locale)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {order.status === "COMPLETED" && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-600 font-medium mr-1">
                          <CheckCircle2 size={14} />
                          {t("orders.statusCompleted")}
                        </span>
                      )}
                      {order.status === "SHIPPED" && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-blue-600 font-medium mr-1">
                          <Truck size={14} />
                          {t("orders.statusShipped")}
                        </span>
                      )}
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
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-gray-200 bg-white rounded-xs">
                            <Image
                              src={image}
                              alt={productName}
                              fill
                              className="object-contain p-1.5"
                              sizes="80px"
                            />
                          </div>
                          <div className="flex-1 min-w-0 pr-4">
                            <h4 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
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
                    <div className="flex items-baseline justify-end gap-2 text-right">
                      <span className="text-xs text-gray-500">
                        {t("orders.total")} ({totalQty}{" "}
                        {t("orders.products").toLowerCase()}):
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-gray-900">
                        {formatCurrency(
                          order.totalAmount + order.shippingFee,
                          order.currency,
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                      <span className="text-xs font-mono text-gray-400">
                        #{order.orderId.slice(0, 12).toUpperCase()}
                      </span>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/orders/${order.orderId}?fromTab=${encodeURIComponent(activeTab)}`}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-4 text-xs font-normal border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xs"
                          >
                            <Eye size={14} className="mr-1.5 text-gray-400" />
                            {t("orders.viewDetails")}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
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
