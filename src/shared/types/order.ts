export type OrderStatus =
  | "PENDING"
  | "APPROVED"
  | "PLACED"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "PROPOSED";

interface OrderItem {
  skuId: string;
  qty: number;
  unitPrice: number;
  warehouseId: string | null;
  reservationId: string | null;
}

export interface Order {
  orderId: string;
  parentOrderId: string | null;
  userId: string;
  merchantId: string;
  proposalId: string | null;
  paymentMethodId: string | null;
  paymentId: string | null;
  currency: string;
  totalAmount: number;
  shippingFee: number;
  addressId: string;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientAddressLine: string | null;
  recipientWardCode: string | null;
  recipientDistrictCode: string | null;
  recipientProvinceCode: string | null;
  recipientCountryCode: string | null;
  items: OrderItem[];
  status: OrderStatus;
  reasonCode: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface MerchantOrderAnalytics {
  from: string;
  to: string;
  currency: string;
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  revenueTrend: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  statusBreakdown: Array<{
    status: OrderStatus | string;
    count: number;
  }>;
}

export interface ShippingAddressSnapshot {
  addressId: string;
  fullName: string;
  phone: string;
  addressLine: string;
  wardCode?: string | null;
  districtCode?: string | null;
  provinceCode?: string | null;
  countryCode: string;
}

export type ReturnStatus =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "ITEM_RECEIVED"
  | "REFUNDED"
  | "CANCELLED";

export interface OrderReturn {
  returnId: string;
  orderId: string;
  userId: string;
  merchantId: string;
  reason: string;
  evidenceUrl: string | null;
  refundAmount: number | null;
  currency: string | null;
  itemCondition: string | null;
  returnWarehouseId: string | null;
  status: ReturnStatus;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}
