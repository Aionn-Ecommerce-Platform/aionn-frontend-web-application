import type { ReviewStatus } from "@/lib/services/review.service";

type ReviewStatusConfig = {
  labelKey: string;
  variant: "success" | "warning";
};

const REVIEW_STATUS: Record<ReviewStatus, ReviewStatusConfig> = {
  VISIBLE: { labelKey: "statuses.review.VISIBLE", variant: "success" },
  HIDDEN: { labelKey: "statuses.review.HIDDEN", variant: "warning" },
  REPORTED: { labelKey: "statuses.review.REPORTED", variant: "warning" },
  DELETED: { labelKey: "statuses.review.DELETED", variant: "warning" },
};

export function getReviewStatus(status: ReviewStatus) {
  return REVIEW_STATUS[status];
}
