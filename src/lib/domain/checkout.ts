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

interface CheckoutVoucherSelection {
  platform?: UserVoucher | null;
  shop?: UserVoucher | null;
  shipping?: UserVoucher | null;
}

function isVoucherSelection(
  value: UserVoucher | CheckoutVoucherSelection,
): value is CheckoutVoucherSelection {
  return "platform" in value || "shop" in value || "shipping" in value;
}

/** Shop vouchers apply only to that shop's goods total and respect its minimum. */
export function calculateShopVoucherDiscount(
  voucher: UserVoucher | null | undefined,
  goodsTotal: number,
) {
  if (!voucher) return 0;
  if (voucher.minOrderValue && goodsTotal < voucher.minOrderValue) return 0;
  return Math.min(voucher.voucherDiscountAmount ?? 0, goodsTotal);
}

/** Final payable amount: subtotal minus goods/shop discounts plus net shipping. */
export function calculateCheckoutTotal(input: {
  subtotal: number;
  platformDiscount: number;
  shopDiscount?: number;
  shipping: number;
  shippingDiscount: number;
}) {
  const shippingAfterDiscount = Math.max(
    input.shipping - input.shippingDiscount,
    0,
  );
  return Math.max(
    input.subtotal -
      input.platformDiscount -
      (input.shopDiscount ?? 0) +
      shippingAfterDiscount,
    0,
  );
}

export function calculateCheckoutPricing(
  items: CartItem[],
  selection: UserVoucher | CheckoutVoucherSelection | null,
  shippingFee = 0,
) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  let platform: UserVoucher | null | undefined = null;
  let shop: UserVoucher | null | undefined = null;
  let shippingVoucher: UserVoucher | null | undefined = null;
  if (selection && isVoucherSelection(selection)) {
    platform = selection.platform;
    shop = selection.shop;
    shippingVoucher = selection.shipping;
  } else if (selection) {
    if (selection.voucherType === "FREE_SHIPPING") {
      shippingVoucher = selection;
    } else {
      platform = selection;
    }
  }

  const eligible = (voucher: UserVoucher | null | undefined) =>
    !voucher?.minOrderValue || subtotal >= voucher.minOrderValue;

  const platformDiscount =
    platform && eligible(platform)
      ? Math.min(platform.voucherDiscountAmount ?? 0, subtotal)
      : 0;
  const shopDiscount =
    shop && eligible(shop)
      ? Math.min(shop.voucherDiscountAmount ?? 0, subtotal - platformDiscount)
      : 0;
  const shippingDiscount =
    shippingVoucher && eligible(shippingVoucher)
      ? Math.min(shippingVoucher.voucherDiscountAmount ?? 0, shippingFee)
      : 0;
  const goodsDiscount = platformDiscount + shopDiscount;

  return {
    subtotal,
    meetsMinimum:
      (platform ? eligible(platform) : true) &&
      (shop ? eligible(shop) : true) &&
      (shippingVoucher ? eligible(shippingVoucher) : true),
    discount: goodsDiscount + shippingDiscount,
    goodsDiscount,
    shippingDiscount,
    merchandiseTotal: Math.max(subtotal - goodsDiscount, 0),
  };
}
