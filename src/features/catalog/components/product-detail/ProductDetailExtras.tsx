"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { merchantService } from "@/lib/services";
import Link from "next/link";
import { Heart, Loader2, Star, Store } from "lucide-react";
import { AppImage, Modal } from "@/shared/ui";
import ProductCard from "@/components/product/ProductCard";
import ProductQA from "@/components/product/ProductQA";
import { ReviewList, SubmitReviewForm } from "@/components/review";
import toast from "react-hot-toast";
import type { Merchant, Product, RecommendationItem } from "@/types";
import type { Locale } from "@/stores/locale.store";
import { translate } from "@/i18n/translate";
import { getProductCoverImage } from "@/shared/lib/media";
import { DESCRIPTION_HEADING_PATTERN } from "./product-detail-utils";
type T = (key: string, values?: Record<string, string | number>) => string;
interface Props {
  product: Product;
  merchant?: Merchant;
  productId: string;
  authenticated: boolean;
  locale: Locale;
  eligibility?: { canReview: boolean; reason?: string | null };
  reviewOpen?: boolean;
  relatedLoading: boolean;
  related?: Array<RecommendationItem | Product>;
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
    relatedLoading,
    related: relatedProducts,
    t,
  } = props;

  const [showReviewForm, setShowReviewForm] = useState(false);
  const qc = useQueryClient();

  const { data: storefrontStats, isLoading: storefrontStatsLoading } = useQuery(
    {
      queryKey: ["merchant-storefront-stats", product.merchantId],
      queryFn: () => merchantService.getStorefrontStats(product.merchantId),
      enabled: Boolean(product.merchantId),
      staleTime: 5 * 60_000,
    },
  );

  const followMutation = useMutation({
    mutationFn: () =>
      storefrontStats?.following
        ? merchantService.unfollow(product.merchantId)
        : merchantService.follow(product.merchantId),
    onSuccess: async () => {
      const wasFollowing = storefrontStats?.following;
      qc.setQueryData<typeof storefrontStats>(
        ["merchant-storefront-stats", product.merchantId],
        (old) => (old ? { ...old, following: !wasFollowing } : old),
      );
      await qc.invalidateQueries({
        queryKey: ["merchant-storefront-stats", product.merchantId],
      });
      toast.success(
        wasFollowing
          ? t("merchantStore.unfollowed")
          : t("merchantStore.followed"),
      );
    },
    onError: () => toast.error(t("merchantStore.followError")),
  });

  const handleFollow = () => {
    if (!isAuthenticated) {
      toast.error(t("merchantStore.loginRequiredToFollow"));
      return;
    }
    followMutation.mutate();
  };

  const compactNumber = (value: number) =>
    new Intl.NumberFormat(_locale === "en" ? "en-US" : "vi-VN", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);

  const responseTimeLabel = t(
    `merchantStore.responseTime.${storefrontStats?.responseTimeBucket ?? "MINUTES"}`,
  );

  const storeMetrics = [
    {
      label: t("merchantStore.reviews"),
      value:
        (storefrontStats?.reviewCount ?? 0) > 0
          ? `${(storefrontStats?.averageRating ?? 0).toFixed(1)} (${compactNumber(
              storefrontStats?.reviewCount ?? 0,
            )})`
          : "—",
    },
    {
      label: t("merchantStore.products"),
      value: compactNumber(storefrontStats?.productCount ?? 0),
    },
    {
      label: t("merchantStore.responseRate"),
      value:
        (storefrontStats?.conversations ?? 0) > 0
          ? `${storefrontStats?.responseRatePercent ?? 0}%`
          : "—",
    },
    {
      label: t("merchantStore.responseTimeLabel"),
      value: responseTimeLabel,
    },
    {
      label: t("merchantStore.followers"),
      value: compactNumber(storefrontStats?.followerCount ?? 0),
    },
    {
      label: t("merchantStore.joined"),
      value: formatRelativeJoin(
        storefrontStats?.joinedAt ?? merchant?.createdAt,
        _locale,
      ),
    },
  ];

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
      <div className="bg-white rounded-2xl border border-gray-400 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 lg:p-7 mt-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
        <div className="flex items-stretch gap-4">
          {merchant?.logoUrl ? (
            <Link
              href={`/merchants/${product.merchantId}`}
              className="w-[72px] h-[72px] self-start rounded-full overflow-hidden border border-gray-400 shadow-xs bg-gray-50 shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-950"
              aria-label={merchant.name || t("products.storeLabel")}
            >
              <AppImage
                src={merchant.logoUrl}
                alt={merchant.name || t("products.storeLabel")}
                className="w-full h-full object-cover"
              />
            </Link>
          ) : (
            <Link
              href={`/merchants/${product.merchantId}`}
              aria-label={merchant?.name || t("products.storeLabel")}
              className="w-[72px] h-[72px] self-start rounded-full bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center text-white text-xl font-bold shadow-xs shrink-0 cursor-pointer"
            >
              {merchant?.name?.charAt(0).toUpperCase() ?? "M"}
            </Link>
          )}
          <div className="flex flex-col justify-between">
            <h3 className="text-base font-bold text-gray-900">
              {merchant?.name ?? t("products.storeLabel")}
            </h3>
            <div className="mt-3 flex items-center gap-2.5 flex-wrap">
              <Link href={`/merchants/${product.merchantId}`}>
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-gray-950 bg-gray-950 px-4 text-xs font-semibold text-white shadow-xs transition-all hover:border-neutral-800 hover:bg-neutral-800 active:scale-95 cursor-pointer select-none"
                >
                  <Store size={14} className="shrink-0" />
                  <span>{t("merchantStore.viewShop")}</span>
                </button>
              </Link>
              <button
                type="button"
                onClick={handleFollow}
                disabled={
                  followMutation.isPending ||
                  storefrontStatsLoading ||
                  !storefrontStats
                }
                className={`h-9 px-4 text-xs font-semibold border transition-all rounded-xl shadow-xs cursor-pointer inline-flex items-center justify-center select-none disabled:opacity-50 ${
                  storefrontStats?.following
                    ? "border-brand/30 bg-brand/10 text-brand hover:bg-brand/15"
                    : "border-brand bg-brand text-white hover:bg-brand-strong hover:border-brand-strong"
                }`}
              >
                {followMutation.isPending ? (
                  <Loader2 size={14} className="mr-1.5 shrink-0 animate-spin" />
                ) : (
                  <Heart
                    size={14}
                    className={`mr-1.5 shrink-0 ${
                      storefrontStats?.following
                        ? "fill-brand text-brand"
                        : "fill-white text-white"
                    }`}
                  />
                )}
                <span>
                  {storefrontStats?.following
                    ? t("merchantStore.following")
                    : t("merchantStore.follow")}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="w-full md:flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-5 border-t md:border-t-0 md:border-l border-gray-400 pt-6 md:pt-0 md:pl-6">
          {storeMetrics.map((metric) => (
            <div key={metric.label}>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">
                {metric.label}
              </p>
              <p className="text-sm font-bold text-gray-900 mt-1">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </div>
      {product.description ? (
        <div className="bg-white rounded-2xl border border-gray-400 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 lg:p-8 mt-6 overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("products.descriptionLabel")}
          </h2>
          <ProductDescription text={product.description} />
        </div>
      ) : null}
      <div className="bg-white rounded-2xl border border-gray-400 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 lg:p-8 mt-6 overflow-hidden">
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
      <ProductQA productId={id} authenticated={isAuthenticated} />
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
                : getProductCoverImage(p.imageList);
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
                  provinceName={p.provinceName}
                  provinceCode={p.provinceCode}
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
  const resolved: Locale = locale === "en" ? "en" : "vi";
  if (years >= 1) {
    const rem = months % 12;
    return rem > 0
      ? translate(resolved, "productDetail.yearsMonthsAgo", {
          years,
          months: rem,
        })
      : translate(resolved, "productDetail.yearsAgo", { years });
  }
  if (months >= 1) {
    return translate(resolved, "productDetail.monthsAgo", { months });
  }
  const days = Math.floor(
    (now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24),
  );
  return translate(resolved, "productDetail.daysAgo", { days });
}

function ProductDescription({ text }: { text: string }) {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n\n")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .trim();
  const body = normalized.replace(DESCRIPTION_HEADING_PATTERN, "");
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
