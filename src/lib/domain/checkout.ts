import type { Address, CartItem, PaymentMethod, UserVoucher } from "@/types";

interface PaymentPreference {
  paymentType: "COD" | "SAVED_CARD" | "VNPAY";
  paymentMethodId?: string | null;
}

export function selectCheckoutItems(
  items: CartItem[],
  selectedSkuIds: string[] | null,
) {
  if (selectedSkuIds === null) return [];
  if (selectedSkuIds.length === 0) return items;
  const selected = new Set(selectedSkuIds);
  return items.filter((item) => selected.has(item.skuId));
}

export function resolveAddressId(
  selectedAddressId: string | null,
  addresses: Address[] | undefined,
) {
  if (selectedAddressId) return selectedAddressId;
  return (
    (addresses?.find((address) => address.isDefault) ?? addresses?.[0])
      ?.addressId ?? null
  );
}

export function getVerifiedPaymentMethods(
  methods: PaymentMethod[] | undefined,
) {
  return (methods ?? []).filter((method) => method.status === "VERIFIED");
}

export function resolvePaymentOption(
  selectedOption: string | null,
  preference: PaymentPreference | undefined,
  methods: PaymentMethod[],
) {
  if (selectedOption) return selectedOption;
  if (preference?.paymentType === "VNPAY") return "VNPAY";
  if (
    preference?.paymentType === "SAVED_CARD" &&
    preference.paymentMethodId &&
    methods.some((method) => method.methodId === preference.paymentMethodId)
  ) {
    return preference.paymentMethodId;
  }
  return "COD";
}

export function findAddress(
  addresses: Address[] | undefined,
  addressId: string | null,
) {
  return addresses?.find((address) => address.addressId === addressId) ?? null;
}

export function calculateCheckoutPricing(
  items: CartItem[],
  voucher: UserVoucher | null,
) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const meetsMinimum =
    !voucher?.minOrderValue || subtotal >= voucher.minOrderValue;
  const discount =
    voucher && meetsMinimum
      ? Math.min(voucher.voucherDiscountAmount ?? 0, subtotal)
      : 0;
  return {
    subtotal,
    meetsMinimum,
    discount,
    merchandiseTotal: Math.max(subtotal - discount, 0),
  };
}
