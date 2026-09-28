"use client";
import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Star, Store } from "lucide-react";
import { Button, Modal } from "@/shared/ui";
import ProductCard from "@/components/product/ProductCard";
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

  const handleReviewButtonClick = () => {
    if (!isAuthenticated) {
      toast.error(t("reviews.loginToReviewNotice"));
      return;
    }
    if (!eligibility?.canReview) {
      if (eligibility?.reason === "NOT_PURCHASED") {
        toast.error(t("productDetail.purchaseBeforeReview"));
      } else if (eligibility?.reason === "ALREADY_REVIEWED") {
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
      <div className="bg-white rounded-sm border border-gray-100 shadow-xs p-6 lg:p-7 mt-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-md">
            {product.merchantId?.charAt(0).toUpperCase() ?? "M"}
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {merchant?.name ?? t("products.storeLabel")}
            </h3>
            <div className="mt-3 flex items-center gap-2.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-8.5 px-3.5 text-xs font-semibold border-red-500/80 bg-red-50/70 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 active:scale-95 transition-all rounded-sm shadow-xs cursor-pointer"
                onClick={handleStartChat}
                loading={chatLoading}
              >
                <MessageCircle size={14} className="mr-1.5 shrink-0" />
                {t("productDetail.chatNow")}
              </Button>
              <Link href={`/merchants/${product.merchantId}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8.5 px-3.5 text-xs font-semibold border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 active:scale-95 transition-all rounded-sm shadow-xs cursor-pointer"
                >
                  <Store size={14} className="mr-1.5 shrink-0 text-gray-500" />
                  {t("products.viewStore")}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm text-gray-600 border-t md:border-t-0 md:border-l border-gray-200 pt-6 md:pt-0 md:pl-6 flex-1 max-w-xl">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              {t("products.ratingLabel")}
            </p>
            <p className="text-base font-bold text--commerce mt-1">4.8 / 5.0</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              {t("common.allProducts")}
            </p>
            <p className="text-base font-bold text-gray-900 mt-1">142</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              {t("productDetail.responseRate")}
            </p>
            <p className="text-base font-bold text-gray-900 mt-1">98%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              {t("productDetail.responseTime")}
            </p>
            <p className="text-base font-bold text-gray-900 mt-1">
              {t("productDetail.withinHours")}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
              {t("merchant.joined")}
            </p>
            <p className="text-base font-bold text-gray-900 mt-1">
              {t("productDetail.twoYearsAgo")}
            </p>
          </div>
        </div>
      </div>
      {product.aiDescription && (
        <div className="bg-white rounded-sm border border-gray-400 p-6 lg:p-8 mt-6 overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("products.descriptionLabel")}
          </h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">
            {product.aiDescription}
          </p>
        </div>
      )}
      <div className="bg-white rounded-sm border border-gray-400 p-6 lg:p-8 mt-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("products.ratingLabel")}
          </h2>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all cursor-pointer text-sm"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
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
                ? undefined
                : lowestVariant?.originalPrice;
              const image = isRec
                ? p.imageUrl || "/images/logo.png"
                : (p.imageList?.[0] ?? "/images/logo.png");
              const recommendationReason = isRec ? p.reason : undefined;
              const merchant = isRec ? undefined : p.merchantId;
              const rating = isRec ? undefined : p.rating;
              const reviewCount = isRec ? undefined : p.reviewCount;
              const sold = isRec ? undefined : p.soldCount;
              const flashSale = isRec ? undefined : p.flashSale;
              const currency = isRec ? p.currency : lowestVariant?.currency;

              return (
                <ProductCard
                  key={p.productId}
                  id={p.productId}
                  name={p.name}
                  price={price}
                  originalPrice={originalPrice}
                  image={image}
                  merchant={merchant}
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
