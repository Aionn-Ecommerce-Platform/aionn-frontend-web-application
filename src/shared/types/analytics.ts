export interface PlatformOrderAnalytics {
  from: string;
  to: string;
  currency: string;
  totalGmv: number;
  totalOrders: number;
  completedOrders: number;
  revenueTrend: Array<{ date: string; revenue: number; orders: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  topMerchants: Array<{ merchantId: string; revenue: number; orders: number }>;
}

export interface TopProduct {
  skuId: string;
  unitsSold: number;
  revenue: number;
}

export interface ReturnAnalytics {
  from: string;
  to: string;
  totalReturns: number;
  totalCompletedOrders: number;
  returnRate: number;
  totalRefundAmount: number;
  currency: string;
  returnsByStatus: Array<{ status: string; count: number }>;
  returnsByReason: Array<{ reason: string; count: number }>;
}

export interface PaymentAnalytics {
  from: string;
  to: string;
  currency: string;
  totalRefundAmount: number;
  totalRefundCount: number;
  totalPaidCount: number;
  refundRate: number;
  totalPayoutAmount: number;
  totalPayoutCount: number;
  payoutVolumeTrend: Array<{ date: string; amount: number; count: number }>;
  paymentStatusBreakdown: Array<{ status: string; count: number }>;
  payoutStatusBreakdown: Array<{ status: string; count: number }>;
}

export interface UserAnalytics {
  from: string;
  to: string;
  totalUsers: number;
  newUsersInRange: number;
  signupTrend: Array<{ date: string; count: number }>;
  roleBreakdown: Array<{ role: string; count: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
}

export interface KycAnalytics {
  from: string;
  to: string;
  pending: number;
  approved: number;
  rejected: number;
  submitted: number;
  approvalRate: number;
  avgProcessingHours: number;
}

export interface FeedbackAnalytics {
  from: string;
  to: string;
  open: number;
  resolved: number;
  otherActive: number;
  avgResolutionHours: number;
  byCategory: Array<{ category: string; count: number }>;
}

export interface ProductAnalytics {
  totalPublished: number;
  totalDraft: number;
  totalPendingReview: number;
  totalArchived: number;
  totalReviews: number;
  averageRating: number;
  topCategories: Array<{ categoryId: string; count: number }>;
}

export interface MerchantVoucherAnalytics {
  totalIssued: number;
  totalRedeemed: number;
  totalRemaining: number;
  redemptionRate: number;
  totalDiscountValue: number;
  topVouchers: Array<{
    voucherCode: string;
    campaignId: string | null;
    redeemed: number;
    usageLimit: number;
    discountAmount: number;
  }>;
}

export interface LowStockAlert {
  skuId: string;
  warehouseId: string;
  physicalQty: number;
  availableQty: number;
  safetyStockQty: number;
}
