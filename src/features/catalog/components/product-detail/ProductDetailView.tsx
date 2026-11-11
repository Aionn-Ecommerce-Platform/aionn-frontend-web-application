"use client";

import Link from "next/link";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PackageX, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button, EmptyState } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import {
  productService,
  recommendationService,
  conversationService,
  addressService,
  shippingService,
  inventoryService,
  reviewService,
  merchantService,
  stockAlertService,
} from "@/lib/services";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore } from "@/stores/auth.store";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import { logger } from "@/shared/lib/logger";
import { getErrorMessage } from "@/shared/lib/errors";
import type { Address } from "@/types";
import { getLocalizedAddress } from "@/shared/lib/address-utils";
import { productIdFromParam, productPath } from "@/shared/lib/product-url";
import ProductMainCard from "./ProductMainCard";
import ProductDetailExtras from "./ProductDetailExtras";
import {
  formatVariantKey,
  formatVariantValue,
  getProductImages,
} from "./product-detail-utils";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: routeParam } = use(params);
  const id = productIdFromParam(decodeURIComponent(routeParam));
  const router = useRouter();
  const { t, locale } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.userId);
  const addItem = useCartStore((s) => s.addItem);

  const {
    data: product,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: [...qk.product(id), "active-flash-sale"],
    queryFn: () => productService.getWithActiveFlashSale(id),
  });

  useEffect(() => {
    if (!product) return;
    const canonical = productPath(product);
    if (window.location.pathname !== canonical) {
      router.replace(canonical, { scroll: false });
    }
  }, [product, router]);

  const { data: relatedProducts, isLoading: relatedLoading } = useQuery({
    queryKey: qk.recommendationsSimilar(id, 6),
    queryFn: () => recommendationService.getSimilarProducts(id, 10),
  });

  const { data: merchant } = useQuery({
    queryKey: qk.merchant(product?.merchantId ?? ""),
    queryFn: () => merchantService.get(product!.merchantId),
    enabled: Boolean(product?.merchantId),
  });

  const { data: ratingSummary } = useQuery({
    queryKey: ["product-rating-summary", id],
    queryFn: () => reviewService.getProductRatingSummary(id),
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [id]);

  useEffect(() => {
    if (!product) return;

    if (isAuthenticated) {
      productService.trackView(product.productId).catch((e) => {
        logger.error("Failed to track view on backend", e);
      });
    } else {
      try {
        const storedCats = localStorage.getItem("viewed_categories");
        const storedBrands = localStorage.getItem("viewed_brands");

        let cats: string[] = storedCats ? JSON.parse(storedCats) : [];
        let brands: string[] = storedBrands ? JSON.parse(storedBrands) : [];

        if (!Array.isArray(cats)) cats = [];
        if (!Array.isArray(brands)) brands = [];

        if (product.categoryIds && product.categoryIds.length > 0) {
          cats = Array.from(new Set([...product.categoryIds, ...cats])).slice(
            0,
            5,
          );
        }
        if (product.brandId) {
          brands = Array.from(new Set([product.brandId, ...brands])).slice(
            0,
            5,
          );
        }

        localStorage.setItem("viewed_categories", JSON.stringify(cats));
        localStorage.setItem("viewed_brands", JSON.stringify(brands));
      } catch (e) {
        logger.error("Failed to save viewed history", e);
      }
    }
  }, [product, isAuthenticated]);

  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const { data: eligibility } = useQuery({
    // Include userId so different accounts don't share cached eligibility.
    queryKey: ["review-eligibility", id, userId],
    queryFn: () => reviewService.checkEligibility(id),
    enabled: isAuthenticated,
  });

  const [stock, setStock] = useState<number | null>(null);
  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState<string | null>(
    null,
  );
  const [shippingLoading, setShippingLoading] = useState(false);
  const [destAddress, setDestAddress] = useState<Address | null>(null);

  const currentVariant =
    selectedVariantIdx === null
      ? undefined
      : product?.variants?.[selectedVariantIdx];

  const fallbackFlashSaleSku = product?.flashSale?.skuOffers.reduce(
    (lowest, offer) => (offer.salePrice < lowest.salePrice ? offer : lowest),
  );
  const pricingVariant =
    currentVariant ??
    product?.variants?.find(
      (variant) => variant.skuId === fallbackFlashSaleSku?.skuId,
    ) ??
    product?.variants?.[0];

  const qc = useQueryClient();
  const alertSkuId = pricingVariant?.skuId;
  const { data: stockAlert } = useQuery({
    queryKey: ["stock-alert", id, alertSkuId],
    queryFn: () => stockAlertService.status(id, alertSkuId!),
    enabled: isAuthenticated && !!alertSkuId,
  });
  const stockAlertMutation = useMutation({
    mutationFn: () =>
      stockAlert?.subscribed
        ? stockAlertService.unsubscribe(id, alertSkuId!)
        : stockAlertService.subscribe(id, alertSkuId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-alert", id, alertSkuId] });
      toast.success(
        stockAlert?.subscribed
          ? t("productDetail.stockAlertCancelled")
          : t("productDetail.stockAlertRegistered"),
      );
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
  const handleStockAlert = () => {
    if (!isAuthenticated) {
      toast.error(t("wishlist.loginRequired"));
      router.push(
      `/auth/login?redirect=${encodeURIComponent(
        product ? productPath(product) : `/products/${id}`,
      )}`,
    );
      return;
    }
    if (!alertSkuId) {
      toast.error(t("products.selectVariantNotice"));
      return;
    }
    stockAlertMutation.mutate();
  };

  useEffect(() => {
    let active = true;
    if (!currentVariant) {
      const t = setTimeout(() => setStock(null), 0);
      return () => clearTimeout(t);
    }

    const timer = setTimeout(() => {
      if (!active) return;
      inventoryService
        .listBySku(currentVariant.skuId)
        .then((res) => {
          if (!active) return;
          const total = res.reduce((sum, item) => sum + item.availableQty, 0);
          setStock(total);
        })
        .catch((err) => {
          if (!active) return;
          logger.error("Failed to fetch stock", err);
          setStock(null);
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentVariant]);

  useEffect(() => {
    if (!isAuthenticated) {
      const timer = setTimeout(() => {
        setDestAddress(null);
        setShippingFee(null);
        setEstimatedDeliveryAt(null);
        setShippingLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    addressService
      .list()
      .then((addrs) => {
        if (addrs && addrs.length > 0) {
          const defaultAddr = addrs.find((a) => a.isDefault) ?? addrs[0];
          setDestAddress(defaultAddr ?? null);
        } else {
          setDestAddress(null);
          setShippingFee(null);
          setEstimatedDeliveryAt(null);
        }
      })
      .catch((err) => {
        logger.error("Failed to fetch address", err);
        setDestAddress(null);
        setShippingFee(null);
        setEstimatedDeliveryAt(null);
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !destAddress) return;

    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      setShippingLoading(true);
      setShippingFee(null);
      setEstimatedDeliveryAt(null);
      const quoteAddr = {
        fullName: destAddress.contactName,
        phone: destAddress.phone,
        addressLine: getLocalizedAddress(destAddress, locale),
        wardCode: destAddress.wardCode,
        districtId: destAddress.districtCode,
        provinceCode: destAddress.provinceCode,
        countryCode: "VN",
      };
      const quoteSku = pricingVariant?.skuId ?? product?.variants[0]?.skuId;
      if (!quoteSku) return;

      const quoteVariant = product?.variants.find((v) => v.skuId === quoteSku);
      shippingService
        .quote(
          quoteAddr,
          [{ skuId: quoteSku, qty: 1 }],
          quoteVariant?.currency ?? "VND",
          quoteVariant?.price ?? 0,
        )
        .then((q) => {
          if (!active) return;
          setShippingFee(q.fee);
          setEstimatedDeliveryAt(q.estimatedDeliveryAt ?? null);
        })
        .catch((err) => {
          if (!active) return;
          logger.error("Failed to quote shipping", err);
          setShippingFee(null);
          setEstimatedDeliveryAt(null);
        })
        .finally(() => {
          if (!active) return;
          setShippingLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isAuthenticated, destAddress, locale, product, pricingVariant?.skuId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-900" size={32} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="bg-gray-50 min-h-screen py-12">
        <EmptyState
          icon={PackageX}
          title={t("products.notFound")}
          description={t("products.notFoundDesc")}
          action={
            <Link href="/products">
              <Button variant="outline">{t("products.backToList")}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const images = getProductImages(product.imageList);

  const flashSaleSku = product.flashSale?.skuOffers.find(
    (offer) => offer.skuId === pricingVariant?.skuId,
  );
  const variantPrice = pricingVariant?.price ?? 0;
  const variantOriginal = pricingVariant?.originalPrice;
  const displayPrice = flashSaleSku ? flashSaleSku.salePrice : variantPrice;
  let strikePrice: number | undefined;
  if (flashSaleSku) {
    strikePrice = variantPrice;
  } else if (variantOriginal && variantOriginal > variantPrice) {
    strikePrice = variantOriginal;
  }
  const variantDiscountPercent =
    strikePrice && strikePrice > displayPrice
      ? Math.round((1 - displayPrice / strikePrice) * 100)
      : 0;
  const displayCurrency =
    flashSaleSku?.currency ??
    pricingVariant?.currency ??
    product.flashSale?.currency ??
    product.variants[0]?.currency ??
    "VND";
  const variantDisplayPrices = product.variants
    .map((variant) => {
      const saleOffer = product.flashSale?.skuOffers.find(
        (offer) => offer.skuId === variant.skuId,
      );
      return saleOffer?.salePrice ?? variant.price;
    })
    .filter((price) => price > 0);
  const minDisplayPrice = variantDisplayPrices.length
    ? Math.min(...variantDisplayPrices)
    : displayPrice;
  const maxDisplayPrice = variantDisplayPrices.length
    ? Math.max(...variantDisplayPrices)
    : displayPrice;
  const priceRangeLabel =
    minDisplayPrice !== maxDisplayPrice
      ? `${formatCurrency(minDisplayPrice, displayCurrency)} - ${formatCurrency(maxDisplayPrice, displayCurrency)}`
      : formatCurrency(minDisplayPrice, displayCurrency);
  const priceLabel = currentVariant
    ? formatCurrency(displayPrice, displayCurrency)
    : priceRangeLabel;

  const variantOriginals = product.variants
    .map((variant) => variant.originalPrice)
    .filter((v): v is number => v != null && v > 0);
  const minOriginal = variantOriginals.length
    ? Math.min(...variantOriginals)
    : undefined;
  const maxOriginal = variantOriginals.length
    ? Math.max(...variantOriginals)
    : undefined;
  const strikeRangeLabel =
    !currentVariant && minOriginal != null && maxOriginal != null
      ? minOriginal !== maxOriginal
        ? `${formatCurrency(minOriginal, displayCurrency)} - ${formatCurrency(maxOriginal, displayCurrency)}`
        : formatCurrency(minOriginal, displayCurrency)
      : null;
  const rangeDiscountPercent =
    !currentVariant &&
    minOriginal != null &&
    maxOriginal != null &&
    maxOriginal > minDisplayPrice &&
    minDisplayPrice > 0
      ? Math.round((1 - minDisplayPrice / maxOriginal) * 100)
      : 0;
  const discountPercent = currentVariant
    ? variantDiscountPercent
    : rangeDiscountPercent;
  const reviewCount = ratingSummary?.total ?? product.reviewCount ?? 0;
  const currentRating =
    reviewCount > 0
      ? (ratingSummary?.average ??
        (product.rating !== undefined && product.rating > 0
          ? product.rating
          : 0))
      : 0;
  const roundedRating = Math.round(currentRating);
  const soldCount = product.soldCount ?? 0;
  const deliveryDateLabel = estimatedDeliveryAt
    ? `${t("orders.estimatedDelivery")}: ${formatDate(estimatedDeliveryAt, locale)}`
    : null;

  const handleAddToCart = async (): Promise<boolean> => {
    if (!currentVariant) {
      toast.error(
        t("products.selectVariantNotice"),
      );
      return false;
    }
    if (!isAuthenticated) {
      toast.error(t("products.loginRequiredToAddCart"));
      router.push(
      `/auth/login?redirect=${encodeURIComponent(
        product ? productPath(product) : `/products/${id}`,
      )}`,
    );
      return false;
    }
    setAdding(true);
    try {
      const mappedAttributes: Record<string, string> = {};
      Object.entries(currentVariant.attributeValues).forEach(([k, v]) => {
        mappedAttributes[formatVariantKey(k, locale)] = formatVariantValue(v);
      });

      await addItem(
        {
          skuId: currentVariant.skuId,
          productId: product.productId,
          slug: product.slug,
          productName: product.name,
          imageUrl: images[0] ?? "/images/logo.png",
          price: displayPrice,
          qty: quantity,
          currency: currentVariant.currency,
          variantAttributes: mappedAttributes,
          merchantId: product.merchantId,
        },
        { authenticated: isAuthenticated },
      );
      toast.success(t("products.addedToCart"));
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, t("products.addToCartError")));
      return false;
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!currentVariant) {
      toast.error(
        t("products.selectVariantNotice"),
      );
      return;
    }
    if (!isAuthenticated) {
      router.push(
      `/auth/login?redirect=${encodeURIComponent(
        product ? productPath(product) : `/products/${id}`,
      )}`,
    );
      return;
    }
    const added = await handleAddToCart();
    if (added) {
      router.push("/cart");
    }
  };

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      router.push("/auth/login?redirect=/chat");
      return;
    }
    setChatLoading(true);
    try {
      const conv = await conversationService.start({
        merchantId: product.merchantId,
      });
      router.push(`/chat?conversationId=${conv.conversationId}`);
    } catch {
      toast.error(t("products.cannotStartChat"));
    } finally {
      setChatLoading(false);
    }
  };

  const goToPreviousImage = () => {
    setSelectedImage(
      (current) => (current - 1 + images.length) % images.length,
    );
  };

  const goToNextImage = () => {
    setSelectedImage((current) => (current + 1) % images.length);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-blue-600">
            {t("common.home")}
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-blue-600">
            {t("products.title")}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate max-w-[60vw]">
            {product.name}
          </span>
        </nav>
        <ProductMainCard
          product={product}
          images={images}
          selectedImage={selectedImage}
          setSelectedImage={setSelectedImage}
          goToPreviousImage={goToPreviousImage}
          goToNextImage={goToNextImage}
          reviewCount={reviewCount}
          currentRating={currentRating}
          roundedRating={roundedRating}
          soldCount={soldCount}
          priceLabel={priceLabel}
          currentVariant={currentVariant}
          strikePrice={strikePrice}
          strikeLabel={strikeRangeLabel}
          displayPrice={displayPrice}
          displayCurrency={displayCurrency}
          discountPercent={discountPercent}
          shippingLoading={shippingLoading}
          locale={locale}
          deliveryDateLabel={deliveryDateLabel}
          isAuthenticated={isAuthenticated}
          destAddress={destAddress}
          shippingFee={shippingFee}
          setSelectedVariantIdx={setSelectedVariantIdx}
          stock={stock}
          quantity={quantity}
          setQuantity={setQuantity}
          adding={adding}
          handleAddToCart={handleAddToCart}
          handleBuyNow={handleBuyNow}
          onNotifyRestock={handleStockAlert}
          restockSubscribed={stockAlert?.subscribed ?? false}
          restockLoading={stockAlertMutation.isPending}
          t={t}
        />
        <ProductDetailExtras
          product={product}
          merchant={merchant}
          productId={id}
          authenticated={isAuthenticated}
          locale={locale}
          eligibility={eligibility}
          reviewOpen={showReviewForm}
          chatLoading={chatLoading}
          relatedLoading={relatedLoading}
          related={relatedProducts}
          onChat={handleStartChat}
          onReviewOpen={setShowReviewForm}
          t={t}
        />{" "}
      </div>
    </div>
  );
}
