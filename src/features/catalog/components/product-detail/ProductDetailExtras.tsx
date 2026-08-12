"use client";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Button, Modal } from "@/shared/ui";
import ProductCard from "@/components/product/ProductCard";
import { ReviewList, SubmitReviewForm } from "@/components/review";
import type { Product } from "@/types";
import type { Locale } from "@/stores/locale.store";
type T = (key: string, values?: Record<string, string | number>) => string;
interface Props {
  product: Product;
  productId: string;
  authenticated: boolean;
  locale: Locale;
  eligibility?: { canReview: boolean; reason?: string | null };
  reviewOpen: boolean;
  chatLoading: boolean;
  relatedLoading: boolean;
  related?: Product[];
  onChat: () => void;
  onReviewOpen: (open: boolean) => void;
  t: T;
}
export default function ProductDetailExtras(props: Props) {
  const {
    product,
    productId: id,
    authenticated: isAuthenticated,
    locale,
    eligibility,
    reviewOpen: showReviewForm,
    chatLoading,
    relatedLoading,
    related: relatedProducts,
    onChat: handleStartChat,
    onReviewOpen,
    t,
  } = props;
  const setShowReviewForm = onReviewOpen;
  return (
    <>
      {" "}
      <div className="bg-white rounded-2xl border border-gray-400 p-6 lg:p-8 mt-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-md">
            {product.merchantId?.charAt(0).toUpperCase() ?? "M"}
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {t("products.storeLabel")} ({product.merchantId})
            </h3>
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-400"
                onClick={handleStartChat}
                loading={chatLoading}
              >
                <MessageCircle size={14} className="mr-1" />
                Chat ngay
              </Button>
              <Link href={`/merchants/${product.merchantId}`}>
                <Button variant="outline" size="sm" className="border-gray-400">
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
              Tham gia
            </p>
            <p className="text-base font-bold text-gray-900 mt-1">
              {t("productDetail.twoYearsAgo")}
            </p>
          </div>
        </div>
      </div>
      {product.aiDescription && (
        <div className="bg-white rounded-2xl border border-gray-400 p-6 lg:p-8 mt-6 overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("products.descriptionLabel")}
          </h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">
            {product.aiDescription}
          </p>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-400 p-6 lg:p-8 mt-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("products.ratingLabel")}
          </h2>
          {isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              className="border-gray-400"
              disabled={!eligibility?.canReview}
              title={
                eligibility?.reason === "ALREADY_REVIEWED"
                  ? locale === "vi"
                    ? t("productDetail.alreadyReviewed")
                    : "You have already reviewed this product"
                  : eligibility?.reason === "NOT_PURCHASED"
                    ? locale === "vi"
                      ? t("productDetail.purchaseBeforeReview")
                      : "You must purchase and receive this product before reviewing"
                    : undefined
              }
              onClick={() => setShowReviewForm(true)}
            >
              {eligibility?.reason === "ALREADY_REVIEWED"
                ? locale === "vi"
                  ? t("productDetail.reviewed")
                  : "Reviewed"
                : eligibility?.reason === "NOT_PURCHASED"
                  ? locale === "vi"
                    ? t("productDetail.notPurchased")
                    : "Not purchased"
                  : t("reviews.writeWriteReview") || t("reviews.writeReview")}
            </Button>
          )}
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
              const variants = p.variants ?? [];
              let lowestVariant: (typeof variants)[number] | undefined;
              for (const v of variants) {
                if (!lowestVariant || v.price < lowestVariant.price) {
                  lowestVariant = v;
                }
              }
              const price = lowestVariant?.price ?? 0;
              const originalPrice = lowestVariant?.originalPrice;
              const image = p.imageList?.[0] ?? "/images/logo.png";
              return (
                <ProductCard
                  key={p.productId}
                  id={p.productId}
                  name={p.name}
                  price={price}
                  originalPrice={originalPrice}
                  image={image}
                  merchant={p.merchantId}
                  rating={p.rating}
                  reviewCount={p.reviewCount}
                  sold={p.soldCount}
                  flashSale={p.flashSale}
                />
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
