"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Eye, Loader2 } from "lucide-react";
import { Button, Badge, EmptyState } from "@/shared/ui";
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

  const TABS = [
    { key: "all", label: t("orders.all") },
    { key: "PENDING,APPROVED", label: t("orders.pending") },
    { key: "PREPARING", label: t("orders.processing") },
    { key: "SHIPPED", label: t("orders.shipping") },
    { key: "COMPLETED", label: t("orders.completed") },
    { key: "CANCELLED,REJECTED", label: t("orders.cancelled") },
  ] as const;

  const [activeTab, setActiveTab] =
    useState<(typeof TABS)[number]["key"]>("all");

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

      <div className="flex overflow-x-auto gap-1 mb-6 bg-white rounded-xl border border-gray-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-100 py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <EmptyState
              icon={Package}
              title={t("orders.noOrders")}
              description={t("orders.noOrdersDesc")}
              action={
                <Link href="/products">
                  <Button>{t("cart.continueShopping")}</Button>
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
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-gray-500 truncate">
                        #{order.orderId.slice(0, 12).toUpperCase()}
                      </span>
                      {cfg && (
                        <Badge variant={cfg.variant}>{t(cfg.labelKey)}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">
                      {formatDate(order.createdAt, locale)}
                    </span>
                  </div>

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
                          href={`/orders/${order.orderId}`}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-md border border-gray-100 bg-gray-50">
                            <Image
                              src={image}
                              alt={productName}
                              fill
                              className="object-contain p-1.5"
                              sizes="80px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-5">
                              {productName}
                            </p>
                            {variantLabel && (
                              <p className="mt-1 text-xs text-gray-500 truncate">
                                {variantLabel}
                              </p>
                            )}
                            <p className="mt-1.5 text-xs text-gray-500">
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

                  <div className="flex items-center justify-between gap-3 px-5 py-3 bg-gray-50/60 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {t("orders.itemCount", { count: totalQty })}
                    </span>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs text-gray-500">
                          {t("orders.total")}{" "}
                        </span>
                        <span className="text-base font-bold text--commerce">
                          {formatCurrency(
                            order.totalAmount + order.shippingFee,
                            order.currency,
                          )}
                        </span>
                      </div>
                      <Link href={`/orders/${order.orderId}`}>
                        <Button variant="outline" size="sm">
                          <Eye size={14} className="mr-1" />
                          {t("orders.viewDetails")}
                        </Button>
                      </Link>
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
      <OrdersInner />
    </AuthGuard>
  );
}
