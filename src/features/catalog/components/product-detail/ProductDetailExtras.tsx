"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productService, wishlistService } from "@/lib/services";
import Link from "next/link";
import { Heart, Loader2, MessageCircle, Star, Store } from "lucide-react";
import { AppImage, Modal } from "@/shared/ui";
import ProductCard from "@/components/product/ProductCard";
import ProductQA from "@/components/product/ProductQA";
import { ReviewList, SubmitReviewForm } from "@/components/review";
import toast from "react-hot-toast";
import type { Merchant, Product, RecommendationItem } from "@/types";
import type { Locale } from "@/stores/locale.store";
type T = (key: string, values?: Record<string, string | number>) => string;
interface Props {
  product: Product;
  merchant?: Merchant;
  productId: string;
  authenticated: boolean;
  locale: Locale;
  eligibility?: { canReview: boolean; reason?: string | null };
  reviewOpen?: boolean;
  chatLoading: boolean;
  relatedLoading: boolean;
  related?: Array<RecommendationItem | Product>;
  onChat: () => void;
  onReviewOpen?: (open: boolean) => void;
  t: T;
}
export default function ProductDetailExtras(props: Props) {
  const {
    product,
    merchant,
    productId: id,
    authenticated: isAuthenticated,
    locale: _locale,
    eligibility,
    chatLoading,
    relatedLoading,
    related: relatedProducts,
    onChat: handleStartChat,
    t,
  } = props;

  const [showReviewForm, setShowReviewForm] = useState(false);
  const qc = useQueryClient();

  const { data: wishlistStatus } = useQuery({
    queryKey: ["wishlist-status", id],
    queryFn: () => wishlistService.status(id),
    enabled: isAuthenticated,
  });

  const wishlistMutation = useMutation({
    mutationFn: () =>
      wishlistStatus?.wishlisted
        ? wishlistService.remove(id)
        : wishlistService.add(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wishlist-status", id] });
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success(
        wishlistStatus?.wishlisted
          ? t("wishlist.removed")
          : t("wishlist.added"),
      );
    },
    onError: () => toast.error(t("wishlist.updateFailed")),
  });

  const handleWishlist = () => {
    if (!isAuthenticated) {
      toast.error(t("wishlist.loginRequired"));
      return;
    }
    wishlistMutation.mutate();
  };

  const { data: merchantProductPage } = useQuery({
    queryKey: ["merchant", "product-count", product.merchantId],
    queryFn: () =>
      productService.searchCatalog({ merchantId: product.merchantId, size: 1 }),
    enabled: Boolean(product.merchantId),
    staleTime: 5 * 60_000,
  });
  const merchantProductCount = merchantProductPage?.page.totalElements;

  const handleReviewButtonClick = () => {
    if (!isAuthenticated) {
      toast.error(t("reviews.loginToReviewNotice"));
      return;
    }
    if (!eligibility) {
      return;
    }
    if (!eligibility.canReview) {
      if (eligibility.reason === "ALREADY_REVIEWED") {
        toast.error(t("productDetail.alreadyReviewed"));
      } else {
        toast.error(t("productDetail.purchaseBeforeReview"));
      }
      return;
    }
    setShowReviewForm(true);
  };

  return (
    <>
      {" "}
      <div className="bg-white rounded-2xl border border-gray-300 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 lg:p-7 mt-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
        <div className="flex items-center gap-4">
          {merchant?.logoUrl ? (
            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-gray-200/90 shadow-xs bg-gray-50 shrink-0">
              <AppImage
                src={merchant.logoUrl}
                alt={merchant.name || t("products.storeLabel")}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center text-white text-xl font-bold shadow-xs shrink-0">
              {merchant?.name?.charAt(0).toUpperCase() ?? "M"}
            </div>
          )}
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {merchant?.name ?? t("products.storeLabel")}
            </h3>
            <div className="mt-3 flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                className="h-9 px-4 text-xs font-semibold bg-gray-950 text-white hover:bg-black active:scale-95 transition-all rounded-xl shadow-xs cursor-pointer inline-flex items-center justify-center disabled:opacity-50 select-none"
                onClick={handleStartChat}
                disabled={chatLoading}
              >
                {chatLoading ? (
                  <Loader2
                    size={14}
                    className="mr-1.5 shrink-0 animate-spin text-white"
                  />
                ) : (
                  <MessageCircle
                    size={14}
                    className="mr-1.5 shrink-0 text-white"
                  />
                )}
                <span>{t("productDetail.chatNow")}</span>
              </button>
              <Link href={`/merchants/${product.merchantId}`}>
                <button
                  type="button"
                  className="h-9 px-4 text-xs font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-950 hover:border-gray-300 active:scale-95 transition-all rounded-xl shadow-xs cursor-pointer inline-flex items-center justify-center select-none"
                >
                  <Store size={14} className="mr-1.5 shrink-0 text-gray-500" />
                  <span>{t("products.viewStore")}</span>
                </button>
              </Link>
              <button
                type="button"
                onClick={handleWishlist}
                disabled={wishlistMutation.isPending}
                className={`h-9 px-4 text-xs font-semibold border transition-all rounded-xl shadow-xs cursor-pointer inline-flex items-center justify-center select-none disabled:opacity-50 ${
                  wishlistStatus?.wishlisted
                    ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-950 hover:border-gray-300"
                }`}
              >
                {wishlistMutation.isPending ? (
                  <Loader2 size={14} className="mr-1.5 shrink-0 animate-spin" />
                ) : (
                  <Heart
                    size={14}
                    className={`mr-1.5 shrink-0 ${
                      wishlistStatus?.wishlisted
                        ? "fill-rose-500 text-rose-500"
                        : "text-gray-500"
                    }`}
                  />
                )}
                <span>
                  {wishlistStatus?.wishlisted
                    ? t("wishlist.saved")
                    : t("wishlist.save")}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8 text-sm text-gray-600 border-t md:border-t-0 md:border-l border-gray-200 pt-6 md:pt-0 md:pl-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              {t("common.allProducts")}
            </p>
            <p className="text-base font-bold text-gray-900 mt-1">
              {merchantProductCount ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
              {t("merchants.joined")}
            </p>
            <p className="text-base font-bold text-gray-900 mt-1">
              {formatRelativeJoin(merchant?.createdAt, _locale)}
            </p>
          </div>
        </div>
      </div>
      {product.aiDescription && (
        <div className="bg-white rounded-2xl border border-gray-300 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 lg:p-8 mt-6 overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("products.descriptionLabel")}
          </h2>
          <ProductDescription text={product.aiDescription} />
        </div>
      )}
      <ProductQA productId={id} authenticated={isAuthenticated} />
      <div className="bg-white rounded-2xl border border-gray-300 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 lg:p-8 mt-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("products.ratingLabel")}
          </h2>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-950 hover:bg-black text-white font-semibold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
            onClick={handleReviewButtonClick}
          >
            <Star size={15} className="text-white fill-white" />
            <span>{t("reviews.writeReview")}</span>
          </button>
        </div>

        <Modal
          isOpen={showReviewForm}
          onClose={() => setShowReviewForm(false)}
          title={t("reviews.writeYourReview")}
          size="full"
        >
          <SubmitReviewForm
            productId={id}
            onSuccess={() => setShowReviewForm(false)}
            onCancel={() => setShowReviewForm(false)}
          />
        </Modal>

        <ReviewList productId={id} />
      </div>
      {!relatedLoading && relatedProducts && relatedProducts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            {t("products.relatedProducts")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4">
            {relatedProducts.map((p) => {
              const isRec = "priceFrom" in p;
              const variants = !isRec ? (p.variants ?? []) : [];
              let lowestVariant: (typeof variants)[number] | undefined;
              for (const v of variants) {
                if (!lowestVariant || v.price < lowestVariant.price) {
                  lowestVariant = v;
                }
              }
              const price = isRec ? p.priceFrom : (lowestVariant?.price ?? 0);
              const originalPrice = isRec
                ? (p.originalPriceFrom ?? undefined)
                : lowestVariant?.originalPrice;
              const image = isRec
                ? p.imageUrl || "/images/logo.png"
                : (p.imageList?.[0] ?? "/images/logo.png");
              const recommendationReason = isRec ? p.reason : undefined;
              const rating = p.rating ?? undefined;
              const reviewCount = p.reviewCount ?? undefined;
              const sold = p.soldCount ?? undefined;
              const flashSale = isRec ? undefined : p.flashSale;
              const currency = isRec ? p.currency : lowestVariant?.currency;

              return (
                <ProductCard
                  key={p.productId}
                  id={p.productId}
                  slug={(p as { slug?: string | null }).slug}
                  name={p.name}
                  price={price}
                  originalPrice={originalPrice}
                  image={image}
                  rating={rating}
                  reviewCount={reviewCount}
                  sold={sold}
                  flashSale={flashSale}
                  recommendationReason={recommendationReason}
                  currency={currency}
                />
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

function formatRelativeJoin(
  createdAt: string | undefined,
  locale: string,
): string {
  if (!createdAt) return "—";
  const joined = new Date(createdAt);
  if (Number.isNaN(joined.getTime())) return "—";
  const now = new Date();
  let months =
    (now.getFullYear() - joined.getFullYear()) * 12 +
    (now.getMonth() - joined.getMonth());
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const vi = locale === "vi";
  if (years >= 1) {
    const rem = months % 12;
    return vi
      ? rem > 0
        ? `${years} năm ${rem} tháng trước`
        : `${years} năm trước`
      : rem > 0
        ? `${years}y ${rem}m ago`
        : `${years}y ago`;
  }
  if (months >= 1) return vi ? `${months} tháng trước` : `${months}m ago`;
  const days = Math.floor(
    (now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24),
  );
  return vi ? `${days} ngày trước` : `${days}d ago`;
}

function ProductDescription({ text }: { text: string }) {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n\n")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .trim();
  const body = normalized.replace(
    /^(mô tả sản phẩm|description|product description)\s*\n+/i,
    "",
  );
  const paragraphs = body.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="text-gray-600 leading-relaxed space-y-4">
      {paragraphs.map((para, i) => (
        <p key={i} className="whitespace-pre-line">
          {para}
        </p>
      ))}
    </div>
  );
}
