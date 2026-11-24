"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Flag,
  HelpCircle,
  Loader2,
  MessageSquare,
  Package,
  Reply,
  Search,
  Send,
  Star,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import AuthGuard from "@/components/auth/AuthGuard";
import { Button, Modal, Pagination, Textarea } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { qk } from "@/lib/query-keys";
import {
  merchantService,
  productService,
  questionService,
  reviewService,
} from "@/lib/services";
import { getReviewStatus } from "@/lib/domain/status/review";
import { getErrorMessage, isNotImplemented } from "@/shared/lib/errors";
import { getProductCoverImage } from "@/shared/lib/media";
import { formatDateTime, formatNumber } from "@/shared/lib/utils";
import { ConsoleFilterDropdown } from "../shared/ConsoleFilterDropdown";
import { ConsoleStatGrid } from "../shared/ConsoleStatGrid";
import { ConsoleEmptyState, ConsolePanel } from "../shared/ConsoleShell";

export type MerchantFeedbackTab = "reviews" | "questions";

const REVIEW_PAGE_SIZE = 30;
const QUESTION_PAGE_SIZE = 30;

type ReviewFilter = "ALL" | "PENDING" | "REPLIED";
type QuestionFilter = "UNANSWERED" | "ALL";

const REVIEW_BADGE_CLASS = {
  VISIBLE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  HIDDEN: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  REPORTED: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  DELETED: "border-slate-500/40 bg-white/5 text-slate-300",
} as const;

const DARK_BUTTON_CLASS =
  "inline-flex items-center gap-1.5 rounded-xl border border-gray-500 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-gray-400 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50";

function ProductSummary({
  productId,
  product,
}: {
  productId: string;
  product?: { name: string; imageList: string[] } | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-600 bg-white/5">
        {product ? (
          <Image
            src={getProductCoverImage(product.imageList)}
            alt={product.name}
            width={44}
            height={44}
            className="h-11 w-11 object-cover"
          />
        ) : (
          <Package size={18} className="text-slate-500" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">
          {product?.name ?? t("merchant.feedback.productUnknown")}
        </p>
        <p className="truncate font-mono text-[11px] text-slate-500">
          {productId}
        </p>
      </div>
    </div>
  );
}

function MerchantFeedbackInner({
  defaultTab = "reviews",
}: {
  defaultTab?: MerchantFeedbackTab;
}) {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<MerchantFeedbackTab>(defaultTab);

  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("ALL");
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewSearch, setReviewSearch] = useState("");

  const [questionFilter, setQuestionFilter] = useState<QuestionFilter>("ALL");
  const [questionPage, setQuestionPage] = useState(1);
  const [questionSearch, setQuestionSearch] = useState("");

  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [answerTarget, setAnswerTarget] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [saving, setSaving] = useState(false);

  const reviewParams = {
    page: reviewPage - 1,
    size: REVIEW_PAGE_SIZE,
    replied:
      reviewFilter === "REPLIED"
        ? true
        : reviewFilter === "PENDING"
          ? false
          : undefined,
    search: reviewSearch.trim() || undefined,
  };

  const {
    data: reviewPageData,
    isLoading: loadingReviews,
    error: reviewError,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: qk.merchantReviews(reviewParams),
    queryFn: () => reviewService.listForMerchant(reviewParams),
    enabled: tab === "reviews",
  });

  const {
    data: questionPageData,
    isLoading: loadingQuestions,
    error: questionError,
    refetch: refetchQuestions,
  } = useQuery({
    queryKey: [
      "merchant-questions",
      questionFilter,
      questionPage,
      questionSearch.trim(),
    ],
    queryFn: () =>
      questionService.listForMerchant({
        answered: questionFilter === "UNANSWERED" ? false : undefined,
        page: questionPage - 1,
        size: QUESTION_PAGE_SIZE,
        search: questionSearch.trim() || undefined,
      }),
    enabled: tab === "questions",
  });

  const reviews = reviewPageData?.content ?? [];
  const questions = questionPageData?.content ?? [];
  const productIds = [
    ...new Set([
      ...reviews.map((review) => review.productId),
      ...questions.map((question) => question.productId),
    ]),
  ];
  const { data: productMap } = useQuery({
    queryKey: ["merchant-feedback-products", productIds.join(",")],
    queryFn: async () => {
      const products = await Promise.all(
        productIds.map((id) => productService.get(id).catch(() => null)),
      );
      return new Map(
        products
          .filter((product): product is NonNullable<typeof product> =>
            Boolean(product),
          )
          .map((product) => [product.productId, product]),
      );
    },
    enabled: productIds.length > 0,
  });

  const { data: merchant } = useQuery({
    queryKey: ["merchant", "me"],
    queryFn: () => merchantService.getMine(),
  });
  const merchantId = merchant?.merchantId;

  const { data: storefrontStats } = useQuery({
    queryKey: ["merchant-storefront-stats", merchantId],
    queryFn: () => merchantService.getStorefrontStats(merchantId!),
    enabled: !!merchantId,
  });

  const { data: reviewTotals } = useQuery({
    queryKey: ["merchant-feedback-stats", "reviews-total"],
    queryFn: () => reviewService.listForMerchant({ page: 0, size: 1 }),
  });
  const { data: reviewPendingTotals } = useQuery({
    queryKey: ["merchant-feedback-stats", "reviews-pending"],
    queryFn: () =>
      reviewService.listForMerchant({ page: 0, size: 1, replied: false }),
  });
  const { data: questionTotals } = useQuery({
    queryKey: ["merchant-feedback-stats", "questions-total"],
    queryFn: () => questionService.listForMerchant({ page: 0, size: 1 }),
  });
  const { data: questionUnansweredTotals } = useQuery({
    queryKey: ["merchant-feedback-stats", "questions-unanswered"],
    queryFn: () =>
      questionService.listForMerchant({ page: 0, size: 1, answered: false }),
  });

  const feedbackStats = [
    {
      label: t("merchant.feedback.statsReviews"),
      value: formatNumber(reviewTotals?.totalElements ?? 0, locale),
      icon: MessageSquare,
      iconClass: "text-purple-300",
    },
    {
      label: t("merchant.feedback.statsAverageRating"),
      value: storefrontStats
        ? new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
            maximumFractionDigits: 1,
          }).format(storefrontStats.averageRating)
        : "…",
      icon: Star,
      iconClass: "text-amber-300",
    },
    {
      label: t("merchant.feedback.statsReviewPending"),
      value: formatNumber(reviewPendingTotals?.totalElements ?? 0, locale),
      icon: Clock,
      iconClass: "text-rose-300",
    },
    {
      label: t("merchant.feedback.statsQuestions"),
      value: formatNumber(questionTotals?.totalElements ?? 0, locale),
      icon: HelpCircle,
      iconClass: "text-sky-300",
    },
    {
      label: t("merchant.feedback.statsQuestionUnanswered"),
      value: formatNumber(questionUnansweredTotals?.totalElements ?? 0, locale),
      icon: Clock,
      iconClass: "text-amber-300",
    },
  ];

  const reviewTotalPages = Math.max(1, reviewPageData?.totalPages ?? 1);
  const safeReviewPage = Math.min(reviewPage, reviewTotalPages);
  if (reviewPageData && reviewPage > safeReviewPage) {
    setReviewPage(safeReviewPage);
  }

  const questionTotalPages = Math.max(1, questionPageData?.totalPages ?? 1);
  const safeQuestionPage = Math.min(questionPage, questionTotalPages);
  if (questionPageData && questionPage > safeQuestionPage) {
    setQuestionPage(safeQuestionPage);
  }

  const refreshReviews = () => {
    void qc.invalidateQueries({ queryKey: ["reviews"] });
    void qc.invalidateQueries({ queryKey: ["merchant-feedback-stats"] });
  };
  const refreshQuestions = () => {
    void qc.invalidateQueries({ queryKey: ["merchant-questions"] });
    void qc.invalidateQueries({ queryKey: ["merchant-feedback-stats"] });
  };

  async function handleReply(reviewId: string) {
    setSaving(true);
    try {
      await reviewService.merchantReply(reviewId, { content: replyText });
      toast.success(t("merchant.reviews.toastReplied"));
      setReplyTarget(null);
      setReplyText("");
      refreshReviews();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleReport(reviewId: string) {
    setSaving(true);
    try {
      await reviewService.report(reviewId, { reason: reportReason.trim() });
      toast.success(t("merchant.reviews.toastReported"));
      setReportTarget(null);
      setReportReason("");
      refreshReviews();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAnswer() {
    if (!answerTarget) return;
    setSaving(true);
    try {
      await questionService.answer(answerTarget, answerText.trim());
      toast.success(t("merchantQuestions.answered"));
      setAnswerTarget(null);
      setAnswerText("");
      refreshQuestions();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  let reviewContent: ReactNode;
  if (loadingReviews) {
    reviewContent = (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-purple-400" size={28} />
      </div>
    );
  } else if (reviewError) {
    reviewContent = isNotImplemented(reviewError) ? (
      <ConsoleEmptyState
        icon={MessageSquare}
        title={t("merchant.reviews.unavailableTitle")}
        description={t("merchant.reviews.unavailableDescription")}
      />
    ) : (
      <ConsoleEmptyState
        icon={MessageSquare}
        iconClassName="text-rose-300"
        title={t("common.error")}
        description={t("common.tryAgain")}
      >
        <button
          type="button"
          onClick={() => void refetchReviews()}
          className={DARK_BUTTON_CLASS}
        >
          {t("common.retry")}
        </button>
      </ConsoleEmptyState>
    );
  } else if (reviews.length === 0) {
    reviewContent = (
      <ConsoleEmptyState
        icon={MessageSquare}
        title={t("merchant.reviews.emptyTitle")}
        description={t("merchant.reviews.emptyDescription")}
      />
    );
  } else {
    reviewContent = (
      <div className="space-y-3">
        {reviews.map((review) => {
          const statusConfig = getReviewStatus(review.status);
          const buyerName =
            review.userDisplayName ||
            review.userName ||
            t("merchant.reviews.anonymousUser");
          return (
            <div
              key={review.reviewId}
              className="rounded-2xl border border-gray-600 bg-white/[0.04] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <ProductSummary
                  productId={review.productId}
                  product={productMap?.get(review.productId)}
                />
                <div className="flex shrink-0 items-center gap-2">
                  {review.status !== "VISIBLE" && (
                    <span
                      className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${REVIEW_BADGE_CLASS[review.status]}`}
                    >
                      {t(statusConfig.labelKey)}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    {formatDateTime(review.createdAt, locale)}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-100">
                  {buyerName}
                </span>
                <span className="flex">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      size={14}
                      className={
                        index < review.rating
                          ? "fill-current text-amber-300"
                          : "text-slate-600"
                      }
                    />
                  ))}
                </span>
              </div>

              {review.content && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                  {review.content}
                </p>
              )}

              {review.imageUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.imageUrls.map((imageUrl) => (
                    <Image
                      key={imageUrl}
                      src={imageUrl}
                      alt={t("merchant.reviews.reviewImageAlt")}
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-lg border border-gray-600 object-cover"
                    />
                  ))}
                </div>
              )}

              {review.merchantReply ? (
                <div className="mt-3 rounded-xl border border-purple-400/30 bg-purple-500/10 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-purple-200">
                    <Reply size={13} />
                    {t("merchant.reviews.merchantReplyLabel")}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">
                    {review.merchantReply}
                  </p>
                  {review.merchantRepliedAt && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      {formatDateTime(review.merchantRepliedAt, locale)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTarget(review.reviewId);
                      setReplyText("");
                    }}
                    className={DARK_BUTTON_CLASS}
                  >
                    <Reply size={13} />
                    {t("merchant.reviews.replyButton")}
                  </button>
                </div>
              )}
              {review.status === "VISIBLE" && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReportTarget(review.reviewId);
                      setReportReason("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-300 transition-colors hover:text-rose-200"
                  >
                    <Flag size={13} />
                    {t("merchant.reviews.reportButton")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  let questionContent: ReactNode;
  if (loadingQuestions) {
    questionContent = (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-purple-400" size={28} />
      </div>
    );
  } else if (questionError) {
    questionContent = (
      <ConsoleEmptyState
        icon={HelpCircle}
        iconClassName="text-rose-300"
        title={t("common.error")}
        description={t("common.tryAgain")}
      >
        <button
          type="button"
          onClick={() => void refetchQuestions()}
          className={DARK_BUTTON_CLASS}
        >
          {t("common.retry")}
        </button>
      </ConsoleEmptyState>
    );
  } else if (questions.length === 0) {
    questionContent = (
      <ConsoleEmptyState
        icon={HelpCircle}
        title={t("merchantQuestions.empty")}
        description={t("merchantQuestions.emptyDescription")}
      />
    );
  } else {
    questionContent = (
      <div className="space-y-3">
        {questions.map((question) => (
          <div
            key={question.questionId}
            className="rounded-2xl border border-gray-600 bg-white/[0.04] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <ProductSummary
                productId={question.productId}
                product={productMap?.get(question.productId)}
              />
              <span className="shrink-0 text-xs text-slate-500">
                {formatDateTime(question.createdAt, locale)}
              </span>
            </div>

            <p className="mt-3 text-sm font-semibold text-white">
              {question.question}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {question.userDisplayName ||
                question.userName ||
                t("productQa.buyer")}
            </p>

            {question.answer ? (
              <div className="mt-3 rounded-xl border border-purple-400/30 bg-purple-500/10 p-3">
                <p className="text-xs font-semibold text-purple-200">
                  {t("productQa.sellerAnswer")}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">
                  {question.answer}
                </p>
                {question.answeredAt && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    {formatDateTime(question.answeredAt, locale)}
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAnswerTarget(question.questionId);
                  setAnswerText("");
                }}
                className={`${DARK_BUTTON_CLASS} mt-3`}
              >
                <Send size={13} />
                {t("merchantQuestions.answer")}
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <ConsolePanel>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <MessageSquare size={22} className="text-purple-300" />
          <span className="text-purple-300">
            {t("merchant.feedback.title")}
          </span>
        </h1>
      </div>

      <ConsoleStatGrid
        stats={feedbackStats}
        columnsClassName="lg:grid-cols-5"
      />

      <div className="mb-5 flex w-full border-b border-slate-600/60">
        <button
          type="button"
          onClick={() => setTab("reviews")}
          className={`relative flex w-1/2 min-w-0 items-center justify-center gap-2 px-4 pb-3 pt-2 text-sm font-semibold transition-colors ${
            tab === "reviews"
              ? "text-purple-300"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Star size={16} />
          {t("merchant.feedback.tabReviews")}
          {tab === "reviews" && (
            <span className="absolute inset-x-0 -bottom-px h-0.5 bg-purple-400" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("questions")}
          className={`relative flex w-1/2 min-w-0 items-center justify-center gap-2 px-4 pb-3 pt-2 text-sm font-semibold transition-colors ${
            tab === "questions"
              ? "text-purple-300"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <HelpCircle size={16} />
          {t("merchant.feedback.tabQuestions")}
          {tab === "questions" && (
            <span className="absolute inset-x-0 -bottom-px h-0.5 bg-purple-400" />
          )}
        </button>
      </div>

      {tab === "reviews" ? (
        <>
          <div className="relative z-30 mb-5 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-64 flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={reviewSearch}
                onChange={(event) => {
                  setReviewSearch(event.target.value);
                  setReviewPage(1);
                }}
                placeholder={t("merchant.feedback.searchReviewsPlaceholder")}
                className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>
            <ConsoleFilterDropdown
              label={t("merchant.feedback.reviewFilterLabel")}
              value={reviewFilter}
              options={[
                {
                  value: "ALL",
                  label: t("merchant.reviews.filterAll"),
                },
                {
                  value: "PENDING",
                  label: t("merchant.reviews.filterPending"),
                },
                {
                  value: "REPLIED",
                  label: t("merchant.reviews.filterReplied"),
                },
              ]}
              onChange={(value) => {
                setReviewFilter(value as ReviewFilter);
                setReviewPage(1);
              }}
              menuClassName="w-52"
            />
          </div>
          {reviewContent}
          <Pagination
            currentPage={safeReviewPage}
            totalPages={reviewTotalPages}
            onPageChange={setReviewPage}
          />
        </>
      ) : (
        <>
          <div className="relative z-30 mb-5 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-64 flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={questionSearch}
                onChange={(event) => {
                  setQuestionSearch(event.target.value);
                  setQuestionPage(1);
                }}
                placeholder={t("merchant.feedback.searchQuestionsPlaceholder")}
                className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>
            <ConsoleFilterDropdown
              label={t("merchant.feedback.questionFilterLabel")}
              value={questionFilter}
              options={[
                {
                  value: "ALL",
                  label: t("merchantQuestions.tabAll"),
                },
                {
                  value: "UNANSWERED",
                  label: t("merchantQuestions.tabUnanswered"),
                },
              ]}
              onChange={(value) => {
                setQuestionFilter(value as QuestionFilter);
                setQuestionPage(1);
              }}
              menuClassName="w-52"
            />
          </div>
          {questionContent}
          <Pagination
            currentPage={safeQuestionPage}
            totalPages={questionTotalPages}
            onPageChange={setQuestionPage}
          />
        </>
      )}

      <Modal
        isOpen={replyTarget !== null}
        onClose={() => setReplyTarget(null)}
        title={t("merchant.reviews.modalTitle")}
        size="md"
      >
        <div className="space-y-4">
          <Textarea
            label={t("merchant.reviews.replyTextareaLabel")}
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            placeholder={t("merchant.reviews.replyTextareaPlaceholder")}
            rows={4}
          />
          <Button
            onClick={() => replyTarget && handleReply(replyTarget)}
            className="w-full"
            loading={saving}
            disabled={!replyText.trim()}
          >
            {t("merchant.reviews.submitReply")}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        title={t("merchant.reviews.reportTitle")}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {t("merchant.reviews.reportDescription")}
          </p>
          <Textarea
            label={t("merchant.reviews.reportReasonLabel")}
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            placeholder={t("merchant.reviews.reportReasonPlaceholder")}
            rows={4}
          />
          <Button
            onClick={() => reportTarget && handleReport(reportTarget)}
            className="w-full"
            loading={saving}
            disabled={!reportReason.trim()}
          >
            {t("merchant.reviews.submitReport")}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={answerTarget !== null}
        onClose={() => setAnswerTarget(null)}
        title={t("merchantQuestions.answerTitle")}
      >
        <div className="space-y-4">
          <Textarea
            label={t("merchantQuestions.answerLabel")}
            value={answerText}
            onChange={(event) => setAnswerText(event.target.value)}
            rows={4}
            placeholder={t("merchantQuestions.answerPlaceholder")}
          />
          <Button
            className="w-full"
            onClick={() => void handleAnswer()}
            loading={saving}
            disabled={!answerText.trim()}
          >
            {t("merchantQuestions.submit")}
          </Button>
        </div>
      </Modal>
    </ConsolePanel>
  );
}

export default function MerchantFeedbackView({
  defaultTab = "reviews",
}: {
  defaultTab?: MerchantFeedbackTab;
}) {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantFeedbackInner defaultTab={defaultTab} />
    </AuthGuard>
  );
}
