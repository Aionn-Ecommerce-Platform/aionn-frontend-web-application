import api from "@/shared/api";

export type FlashSaleRegistrationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface FlashSaleRegistration {
  registrationId: string;
  campaignId: string;
  merchantId: string;
  productId: string;
  skuId: string;
  salePrice: number;
  currency: string;
  saleStock: number;
  soldCount: number;
  status: FlashSaleRegistrationStatus;
  rejectReason: string | null;
  submittedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  updatedAt: string;
}

export const flashSaleService = {
  register(body: {
    campaignId: string;
    productId: string;
    skuId: string;
    salePrice: number;
    currency: string;
    saleStock: number;
  }) {
    return api.post<FlashSaleRegistration>(
      "/promotions/flash-sales/registrations",
      body,
    );
  },
  cancel(registrationId: string) {
    return api.delete<FlashSaleRegistration>(
      `/promotions/flash-sales/registrations/${registrationId}`,
    );
  },
  listMine(status?: FlashSaleRegistrationStatus, limit = 100) {
    return api.get<FlashSaleRegistration[]>(
      "/promotions/flash-sales/registrations/mine",
      { query: { status, limit } },
    );
  },

  approve(registrationId: string) {
    return api.post<FlashSaleRegistration>(
      `/promotions/flash-sales/registrations/${registrationId}/approve`,
    );
  },
  reject(registrationId: string, reason: string) {
    return api.post<FlashSaleRegistration>(
      `/promotions/flash-sales/registrations/${registrationId}/reject`,
      { reason },
    );
  },
  listByStatus(status: FlashSaleRegistrationStatus, limit = 100) {
    return api.get<FlashSaleRegistration[]>(
      "/promotions/flash-sales/registrations",
      { query: { status, limit } },
    );
  },
  get(registrationId: string) {
    return api.get<FlashSaleRegistration>(
      `/promotions/flash-sales/registrations/${registrationId}`,
    );
  },
};
