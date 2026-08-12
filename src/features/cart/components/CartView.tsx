"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Loader2,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, EmptyState } from "@/shared/ui";
import ProductCard from "@/components/product/ProductCard";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore } from "@/stores/auth.store";
import { useTranslation } from "@/hooks";
import { formatCurrency } from "@/shared/lib/utils";
import { productService } from "@/lib/services/product.service";
import { getProductCardSummary } from "@/shared/lib/product-utils";

export default function CartPage() {
  const { t, locale } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthInitializing = useAuthStore((s) => s.isInitializing);
  const items = useCartStore((s) => s.items);
  const syncing = useCartStore((s) => s.syncing);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const [pendingSku, setPendingSku] = useState<string | null>(null);
  const [selectedSkuIds, setSelectedSkuIds] = useState<string[]>([]);
  const selectionInitialized = useRef(false);
  const { data: recommendedProducts = [] } = useQuery({
    queryKey: ["cart-recommendations"],
    queryFn: () => productService.getPopular(18),
  });

  useEffect(() => {
    const currentSkuIds = items.map((item) => item.skuId);
    setSelectedSkuIds((previous) => {
      if (!selectionInitialized.current) {
        selectionInitialized.current = true;
        return currentSkuIds;
      }
      const currentSet = new Set(currentSkuIds);
      return previous.filter((skuId) => currentSet.has(skuId));
    });
  }, [items]);

  const selectedItems = useMemo(() => {
    const selected = new Set(selectedSkuIds);
    return items.filter((item) => selected.has(item.skuId));
  }, [items, selectedSkuIds]);

  const selectedAmount = selectedItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0,
  );
  const allSelected =
    items.length > 0 && selectedSkuIds.length === items.length;
  const selectedCheckoutPath = `/checkout?items=${encodeURIComponent(
    selectedSkuIds.join(","),
  )}`;
  const checkoutHref = isAuthenticated
    ? selectedCheckoutPath
    : `/auth/login?redirect=${encodeURIComponent(selectedCheckoutPath)}`;

  const toggleSku = (skuId: string) => {
    setSelectedSkuIds((previous) =>
      previous.includes(skuId)
        ? previous.filter((id) => id !== skuId)
        : [...previous, skuId],
    );
  };

  const toggleAll = () => {
    setSelectedSkuIds(allSelected ? [] : items.map((item) => item.skuId));
  };

  const handleQty = async (skuId: string, newQty: number) => {
    if (newQty < 1) return;
    setPendingSku(skuId);
    try {
      await updateQuantity(skuId, newQty, { authenticated: isAuthenticated });
    } catch {
    } finally {
      setPendingSku(null);
    }
  };

  const handleRemove = async (skuId: string) => {
    setPendingSku(skuId);
    setSelectedSkuIds((previous) => previous.filter((id) => id !== skuId));
    try {
      await removeItem(skuId, { authenticated: isAuthenticated });
      toast.success(t("cart.remove"));
    } catch {
    } finally {
      setPendingSku(null);
    }
  };

  if (syncing && items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const isEmpty = items.length === 0;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {t("cart.title")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {items.length} {t("products.title").toLowerCase()}
            </p>
          </div>
          {syncing && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin text-blue-600" />
              Syncing
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <div className="space-y-3">
            {isEmpty ? (
              <div className="rounded-md border border-gray-200 bg-white py-16">
                <EmptyState
                  icon={ShoppingBag}
                  title={t("cart.emptyCart")}
                  description={t("cart.emptyCartDesc")}
                  action={
                    <Link href="/products">
                      <Button>{t("cart.continueShopping")}</Button>
                    </Link>
                  }
                />
              </div>
            ) : (
              <>
                <div className="hidden md:grid grid-cols-[32px_minmax(0,1fr)_112px_128px_128px_48px] items-center gap-3 rounded-md border border-gray-400 bg-white px-5 py-3 text-sm text-gray-500">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    aria-label={t("cart.selectAll")}
                  />
                  <span>{t("cart.product")}</span>
                  <span className="text-center">{t("cart.unitPrice")}</span>
                  <span className="text-center">{t("common.quantity")}</span>
                  <span className="text-center">{t("cart.amount")}</span>
                  <span className="text-center">{t("common.actions")}</span>
                </div>

                <AnimatePresence initial={false}>
                  {items.map((item) => {
                    const selected = selectedSkuIds.includes(item.skuId);
                    const lineAmount = item.price * item.qty;

                    return (
                      <motion.div
                        key={item.skuId}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.18 }}
                        className="grid gap-4 rounded-md border border-gray-400 bg-white p-4 transition-all hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-500/10 md:grid-cols-[32px_minmax(0,1fr)_112px_128px_128px_48px] md:items-center md:gap-3 md:px-5 md:py-4"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSku(item.skuId)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          aria-label={t("cart.selectProduct", {
                            product: item.productName,
                          })}
                        />

                        <div className="flex min-w-0 items-center gap-3">
                          <Link
                            href={`/products/${item.productId}`}
                            className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-100 bg-gray-50 sm:h-24 sm:w-24"
                          >
                            <Image
                              src={item.imageUrl || "/images/logo.png"}
                              alt={item.productName}
                              fill
                              sizes="(min-width: 640px) 96px, 80px"
                              className="object-contain p-2"
                            />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/products/${item.productId}`}
                              className="line-clamp-2 text-sm font-semibold leading-5 text-gray-900 hover:text-blue-600 sm:text-base"
                            >
                              {item.productName}
                            </Link>
                            {item.variantAttributes && (
                              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-gray-500">
                                {Object.entries(item.variantAttributes)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(" | ")}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-left md:text-center md:whitespace-nowrap">
                          <p className="text-sm text-gray-500 md:hidden">
                            {t("cart.unitPrice")}
                          </p>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(item.price, item.currency, locale)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 md:justify-center">
                          <button
                            disabled={
                              pendingSku === item.skuId || item.qty <= 1
                            }
                            onClick={() => handleQty(item.skuId, item.qty - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-gray-900">
                            {item.qty}
                          </span>
                          <button
                            disabled={pendingSku === item.skuId}
                            onClick={() => handleQty(item.skuId, item.qty + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <div className="text-left md:text-center md:whitespace-nowrap">
                          <p className="text-sm text-gray-500 md:hidden">
                            {t("cart.amount")}
                          </p>
                          <p className="font-bold text--commerce">
                            {formatCurrency(lineAmount, item.currency, locale)}
                          </p>
                        </div>

                        <button
                          disabled={pendingSku === item.skuId}
                          onClick={() => handleRemove(item.skuId)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-gray-400 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 md:mx-auto"
                          aria-label="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </>
            )}
          </div>

          <div>
            <div className="sticky top-20 rounded-md border border-gray-400 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                {t("cart.orderSummary")}
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t("cart.selected")}</span>
                  <span className="font-medium">
                    {selectedItems.length}/{items.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t("cart.subtotal")}</span>
                  <span className="font-medium">
                    {formatCurrency(selectedAmount, "VND", locale)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3">
                  <span className="font-semibold text-gray-900">
                    {t("cart.total")}
                  </span>
                  <span className="text-2xl font-bold text--commerce">
                    {formatCurrency(selectedAmount, "VND", locale)}
                  </span>
                </div>
              </div>

              {selectedItems.length > 0 && !isAuthInitializing ? (
                <Link href={checkoutHref} className="mt-6 block">
                  <Button className="w-full" size="lg">
                    {t("cart.checkout")} ({selectedItems.length})
                  </Button>
                </Link>
              ) : (
                <Button className="mt-6 w-full" size="lg" disabled>
                  {t("cart.checkout")} ({selectedItems.length})
                </Button>
              )}

              <button
                onClick={toggleAll}
                className="mt-4 w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {allSelected ? t("cart.deselectAll") : t("cart.selectAll")}
              </button>

              <Link
                href="/products"
                className="mt-3 block text-center text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {t("cart.continueShopping")}
              </Link>
            </div>
          </div>
        </div>

        {recommendedProducts.length > 0 && (
          <section className="mt-12">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="hidden">{t("cart.recommendations")}</h2>
              <h2 className="text-xl font-semibold text-gray-900">
                {t("cart.recommendations")}
              </h2>
              <Link href="/products" className="hidden">
                {t("common.seeAll")}
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
              >
                {t("common.seeAll")}
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-4">
              {recommendedProducts.slice(0, 18).map((product) => {
                const card = getProductCardSummary(product);
                return (
                  <ProductCard
                    key={product.productId}
                    id={product.productId}
                    name={product.name}
                    price={card.price}
                    originalPrice={card.originalPrice}
                    image={card.image}
                    merchant={product.merchantId}
                    rating={product.rating}
                    reviewCount={product.reviewCount}
                    sold={product.soldCount}
                    flashSale={product.flashSale}
                    provinceName={product.provinceName ?? undefined}
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
