import type { ProductStatus } from "@/types";

type ProductStatusConfig = {
  labelKey: string;
  variant: "default" | "info" | "success" | "warning" | "danger";
};

const PRODUCT_STATUS: Record<ProductStatus, ProductStatusConfig> = {
  DRAFT: { labelKey: "merchant.productStatus.DRAFT", variant: "default" },
  PENDING_REVIEW: {
    labelKey: "merchant.productStatus.PENDING_REVIEW",
    variant: "warning",
  },
  PUBLISHED: {
    labelKey: "merchant.productStatus.PUBLISHED",
    variant: "success",
  },
  DEACTIVATED: {
    labelKey: "merchant.productStatus.DEACTIVATED",
    variant: "warning",
  },
  TAKEN_DOWN: {
    labelKey: "merchant.productStatus.TAKEN_DOWN",
    variant: "danger",
  },
  REJECTED: {
    labelKey: "merchant.productStatus.REJECTED",
    variant: "danger",
  },
};

export function getProductStatus(status: ProductStatus) {
  return PRODUCT_STATUS[status];
}
