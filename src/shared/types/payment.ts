type PaymentMethodStatus =
  | "ACTIVE"
  | "PENDING_VERIFICATION"
  | "DELETED"
  | "LINKED"
  | "VERIFIED"
  | "REMOVED";

export interface PaymentMethod {
  methodId: string;
  userId: string;
  provider: string;
  last4Digits: string | null;
  status: PaymentMethodStatus | string;
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
}

export type PaymentStatus =
  | "INITIATED"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export interface Payment {
  paymentId: string;
  orderId: string;
  userId: string;
  paymentMethodId: string | null;
  amount: number;
  refundedAmount: number;
  currency: string;
  gateway: string;
  status: PaymentStatus;
  transactionNo: string | null;
  invoiceUrl: string | null;
  errorCode: string | null;
  errorReason: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  failedAt: string | null;

  redirectUrl: string | null;
}
