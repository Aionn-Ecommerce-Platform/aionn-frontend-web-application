"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { productPath } from "@/shared/lib/product-url";
import { useAuthStore } from "@/stores/auth.store";
import { useTranslation } from "@/hooks";
import { formatCurrency } from "@/shared/lib/utils";
import {
  formatVariantKey,
  formatVariantValue,
} from "@/shared/lib/product-utils";
import { recommendationService } from "@/lib/services";
import { qk } from "@/lib/query-keys";

export default function CartPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.userId);
  const isAuthInitializing = useAuthStore((s) => s.isInitializing);
  const items = useCartStore((s) => s.items);
  const syncing = useCartStore((s) => s.syncing);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const hydrateFromServer = useCartStore((s) => s.hydrateFromServer);

  const [pendingSku, setPendingSku] = useState<string | null>(null);
  const [selectedSkuIds, setSelectedSkuIds] = useState<string[]>([]);
  const selectionInitialized = useRef(false);
  const allCartSkuIds = useMemo(() => items.map((item) => item.skuId), [items]);
  const shouldFetchCartSuggestions =
    isAuthenticated && allCartSkuIds.length > 0;

  useEffect(() => {
    if (isAuthInitializing || isAuthenticated) return;
    router.replace(`/auth/login?redirect=${encodeURIComponent("/cart")}`);
  }, [isAuthInitializing, isAuthenticated, router]);

  useEffect(() => {
    const now = Date.now();
    let nextExpiry: number | null = null;
    for (const item of items) {
      if (!item.flashSaleEndAt) continue;
      const expiresAt = new Date(item.flashSaleEndAt).getTime();
      if (expiresAt <= now) continue;
      if (nextExpiry === null || expiresAt < nextExpiry) nextExpiry = expiresAt;
    }
    if (nextExpiry === null) return;
    const timer = window.setTimeout(
      () => void hydrateFromServer(),
      Math.min(nextExpiry - now + 2_000, 2_147_483_647),
    );
    return () => window.clearTimeout(timer);
  }, [items, hydrateFromServer]);

  const { data: recommendedProducts = [] } = useQuery({
    queryKey: shouldFetchCartSuggestions
      ? qk.recommendationsCart(allCartSkuIds, 18, userId)
      : qk.recommendationsHome(18, userId),
    queryFn: () => {
      if (shouldFetchCartSuggestions) {
        return recommendationService.getCartSuggestions(allCartSkuIds, 18);
      }
      return recommendationService.getHomeFeed(18);
    },
  });

  useEffect(() => {
    const currentSkuIds = items.map((item) => item.skuId);
    setSelectedSkuIds((previous) => {
      if (!selectionInitialized.current) {
        if (currentSkuIds.length === 0) return previous;
        selectionInitialized.current = true;
        const requested = new URLSearchParams(window.location.search).get(
          "select",
        );
        if (!requested) return [];
        const currentSet = new Set(currentSkuIds);
        return requested.split(",").filter((skuId) => currentSet.has(skuId));
      }
      const currentSet = new Set(currentSkuIds);
      return previous.filter((skuId) => currentSet.has(skuId));
    });
  }, [items]);

  const selectedItems = useMemo(() => {
    const selected = new Set(selectedSkuIds);
    return items.filter((item) => selected.has(item.skuId));
  }, [items, selectedSkuIds]);

  const cartCurrency =
    selectedItems[0]?.currency ?? items[0]?.currency ?? "VND";
  const selectedSubtotal = useMemo(
    () =>
      selectedItems.reduce(
        (sum, item) => sum + item.price * (item.qty ?? 1),
        0,
      ),
    [selectedItems],
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
      await updateQuantity(skuId, newQty);
    } catch {
    } finally {
      setPendingSku(null);
    }
  };

  const handleRemove = async (skuId: string) => {
    setPendingSku(skuId);
    setSelectedSkuIds((previous) => previous.filter((id) => id !== skuId));
    try {
      await removeItem(skuId);
      toast.success(t("cart.remove"));
    } catch {
    } finally {
      setPendingSku(null);
    }
  };

  if (syncing && items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  const isEmpty = items.length === 0;

  return (
    <div className="min-h-screen pb-44">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              {t("cart.title")}
            </h1>
          </div>
          {syncing && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin text-brand" />
              Syncing
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-3">
            {isEmpty ? (
              <div className="rounded-2xl border border-gray-400 bg-white py-16 shadow-xs">
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
              <div className="overflow-hidden rounded-2xl border border-gray-400 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px]">
                    <thead>
                      <tr className="border-b border-gray-300 bg-gray-50 text-sm text-gray-500">
                        <th className="w-12 px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            className="h-4 w-4 rounded border-gray-400 text-brand focus:ring-brand/30"
                            aria-label={t("cart.selectAll")}
                          />
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          {t("cart.product")}
                        </th>
                        <th className="w-32 px-4 py-3 text-center font-medium">
                          {t("cart.unitPrice")}
                        </th>
                        <th className="w-36 px-4 py-3 text-center font-medium">
                          {t("common.quantity")}
                        </th>
                        <th className="w-32 px-4 py-3 text-center font-medium">
                          {t("cart.amount")}
                        </th>
                        <th className="w-16 px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <AnimatePresence initial={false}>
                        {items.map((item) => {
                          const selected = selectedSkuIds.includes(item.skuId);
                          const lineAmount = item.price * item.qty;
                          const canDecreaseQty =
                            pendingSku !== item.skuId && item.qty > 1;
                          const canIncreaseQty = pendingSku !== item.skuId;

                          return (
                            <motion.tr
                              key={item.skuId}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.18 }}
                              className="transition-colors hover:bg-gray-50/70"
                            >
                              <td className="px-4 py-4 text-center align-middle">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleSku(item.skuId)}
                                  className="h-4 w-4 rounded border-gray-400 text-brand focus:ring-brand/30"
                                  aria-label={t("cart.selectProduct", {
                                    product: item.productName,
                                  })}
                                />
                              </td>

                              <td className="min-w-[280px] px-4 py-4 align-middle">
                                <div className="flex min-w-0 items-center gap-3">
                                  <Link
                                    href={productPath({
                                      productId: item.productId,
                                      slug: item.slug,
                                    })}
                                    className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-gray-400 bg-gray-50 sm:h-24 sm:w-24"
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
                                      href={productPath({
                                        productId: item.productId,
                                        slug: item.slug,
                                      })}
                                      className="line-clamp-2 text-sm font-semibold leading-5 text-gray-900 hover:text-brand sm:text-base"
                                    >
                                      {item.productName}
                                    </Link>
                                    {item.variantAttributes && (
                                      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-gray-500">
                                        {Object.entries(item.variantAttributes)
                                          .map(
                                            ([k, v]) =>
                                              `${formatVariantKey(k, locale)}: ${formatVariantValue(v)}`,
                                          )
                                          .join(" | ")}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="whitespace-nowrap px-4 py-4 text-center align-middle text-sm font-medium text-gray-900">
                                {formatCurrency(
                                  item.price,
                                  item.currency,
                                  locale,
                                )}
                              </td>

                              <td className="px-4 py-4 align-middle">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    disabled={!canDecreaseQty}
                                    onClick={() =>
                                      handleQty(item.skuId, item.qty - 1)
                                    }
                                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150 ${
                                      canDecreaseQty
                                        ? "border border-gray-400 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-100 active:scale-95 cursor-pointer shadow-2xs"
                                        : "border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
                                    }`}
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <span className="w-8 text-center text-sm font-semibold text-gray-900">
                                    {item.qty}
                                  </span>
                                  <button
                                    disabled={!canIncreaseQty}
                                    onClick={() =>
                                      handleQty(item.skuId, item.qty + 1)
                                    }
                                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150 ${
                                      canIncreaseQty
                                        ? "border border-gray-400 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-100 active:scale-95 cursor-pointer shadow-2xs"
                                        : "border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
                                    }`}
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              </td>

                              <td className="whitespace-nowrap px-4 py-4 text-center align-middle font-bold text-sale">
                                {formatCurrency(
                                  lineAmount,
                                  item.currency,
                                  locale,
                                )}
                              </td>

                              <td className="px-4 py-4 text-center align-middle">
                                <button
                                  disabled={pendingSku === item.skuId}
                                  onClick={() => handleRemove(item.skuId)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-gray-400 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                                  aria-label={t("cart.remove")}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {recommendedProducts.length > 0 && (
          <section className="mt-12">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-950">
                {t("cart.recommendations")}
              </h2>
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-strong"
              >
                {t("common.seeAll")}
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4">
              {recommendedProducts.slice(0, 10).map((product) => (
                <ProductCard
                  key={product.productId}
                  id={product.productId}
                  name={product.name}
                  price={product.priceFrom}
                  originalPrice={product.originalPriceFrom ?? undefined}
                  image={product.imageUrl || "/images/logo.png"}
                  rating={product.rating ?? undefined}
                  reviewCount={product.reviewCount ?? undefined}
                  sold={product.soldCount ?? undefined}
                  recommendationReason={product.reason}
                  provinceName={product.provinceName}
                  provinceCode={product.provinceCode}
                  currency={product.currency}
                />
              ))}
            </div>
          </section>
        )}

        {!isEmpty && (
          <div className="fixed inset-x-0 bottom-0 z-40">
            <div className="border-t border-gray-950 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <ShoppingBag size={20} />
                  </div>
                  <p className="truncate text-sm font-semibold text-gray-700">
                    {t("cart.total")}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3 sm:gap-5">
                  <div className="hidden text-right sm:block">
                    <p className="text-xs font-medium text-gray-600">
                      {t("cart.selectedItemsCount", {
                        count: selectedItems.length,
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t("cart.subtotal")}:{" "}
                      {formatCurrency(selectedSubtotal, cartCurrency, locale)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="truncate text-lg font-bold text-sale">
                      {formatCurrency(selectedSubtotal, cartCurrency, locale)}
                    </p>
                  </div>
                  {selectedItems.length > 0 && !isAuthInitializing ? (
                    <Link
                      href={checkoutHref}
                      className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 px-6 text-sm font-bold text-white shadow-lg shadow-purple-600/30 transition-all hover:from-fuchsia-500 hover:via-purple-500 hover:to-indigo-500 active:scale-[0.99]"
                    >
                      {t("cart.checkout")} ({selectedItems.length})
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-11 cursor-not-allowed items-center justify-center whitespace-nowrap rounded-full bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 px-6 text-sm font-bold text-white opacity-50 shadow-lg shadow-purple-600/30"
                    >
                      {t("cart.checkout")} ({selectedItems.length})
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
