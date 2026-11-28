"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Truck } from "lucide-react";
import toast from "react-hot-toast";
import { Button, EmptyState } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { isStripeClientConfigured } from "@/components/payment/StripeCardSetupModal";
import { useTranslation } from "@/hooks";
import {
  addressService,
  paymentMethodService,
  paymentPreferenceService,
  orderService,
  paymentService,
  shippingService,
  voucherService,
} from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getPaymentFailureMessage } from "@/lib/payment-i18n";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore } from "@/stores/auth.store";
import { getErrorMessage } from "@/shared/lib/errors";
import {
  calculateCheckoutPricing,
  calculateShopVoucherDiscount,
  findAddress,
  getVerifiedPaymentMethods,
  resolveAddressId,
  resolvePaymentOption,
  selectCheckoutItems,
} from "@/lib/domain/checkout";
import type { StripeSetupIntent } from "@/lib/services";
import CheckoutDeliveryPanel from "./CheckoutDeliveryPanel";
import CheckoutVoucherPanel from "./CheckoutVoucherPanel";
import CheckoutOrderItems from "./CheckoutOrderItems";
import VoucherPickerModal from "@/components/promotion/VoucherPickerModal";
import type { VoucherPickerMode } from "@/components/promotion/VoucherPickerModal";
import { useMerchantNameMap } from "@/hooks/useMerchantNameMap";
import CheckoutPaymentPanel from "./CheckoutPaymentPanel";
import { CheckoutSummary } from "./CheckoutSummary";
import {
  CHECKOUT_SELECTION_STORAGE_KEY,
  getStoredCheckoutSelection,
} from "./checkout-storage";

function ordersListWithFocus(orderId: string) {
  return `/orders?tab=PENDING%2CAPPROVED&focus=${encodeURIComponent(orderId)}`;
}

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { t, locale } = useTranslation();
  const items = useCartStore((s) => s.items);
  const hydrateFromServer = useCartStore((s) => s.hydrateFromServer);
  const platformVoucherCode = useCartStore((s) => s.platformVoucherCode);
  const shopVoucherCode = useCartStore((s) => s.shopVoucherCode);
  const shippingVoucherCode = useCartStore((s) => s.shippingVoucherCode);
  const setVoucher = useCartStore((s) => s.setVoucher);
  const clearVoucher = useCartStore((s) => s.clearVoucher);
  const shopVoucherCodesState = useCartStore((s) => s.shopVoucherCodes);
  const shopVoucherCodes = useMemo(
    () => shopVoucherCodesState ?? {},
    [shopVoucherCodesState],
  );
  const setShopVoucher = useCartStore((s) => s.setShopVoucher);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const selectedSkuParam = searchParams.get("items") ?? "";
  const [selectedSkuIds] = useState<string[]>(() =>
    getStoredCheckoutSelection(selectedSkuParam),
  );
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [stripeCardModalOpen, setStripeCardModalOpen] = useState(false);
  const [stripeSetupIntent, setStripeSetupIntent] =
    useState<StripeSetupIntent | null>(null);
  const [applyingVoucher, setApplyingVoucher] =
    useState<VoucherPickerMode | null>(null);
  const [shopVoucherMerchant, setShopVoucherMerchant] = useState<string | null>(
    null,
  );
  const [shopVoucherOpen, setShopVoucherOpen] = useState(false);
  const openShopVoucher = (merchantId: string) => {
    setShopVoucherMerchant(merchantId);
    setShopVoucherOpen(true);
  };
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<
    string | null
  >(null);
  const [savingPaymentPreference, setSavingPaymentPreference] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  useEffect(() => {
    if (selectedSkuParam) {
      router.replace("/checkout", { scroll: false });
    }
  }, [router, selectedSkuParam]);
  const checkoutItems = useMemo(
    () => selectCheckoutItems(items, selectedSkuIds),
    [items, selectedSkuIds],
  );
  const selectedMerchantIds = useMemo(
    () =>
      new Set(
        checkoutItems
          .map((item) => item.merchantId)
          .filter((id): id is string => Boolean(id)),
      ),
    [checkoutItems],
  );
  const isMultiShop = selectedMerchantIds.size > 1;
  const checkoutShopVoucherCodes = useMemo(() => {
    const codes: Record<string, string> = {};
    for (const merchantId of selectedMerchantIds) {
      const code = shopVoucherCodes[merchantId];
      if (code) {
        codes[merchantId] = code;
      }
    }
    return codes;
  }, [selectedMerchantIds, shopVoucherCodes]);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [notesByMerchant, setNotesByMerchant] = useState<
    Record<string, string>
  >({});
  const [selectedShippingService] = useState("STANDARD");
  const { data: addresses, isLoading: loadingAddr } = useQuery({
    queryKey: qk.addresses,
    queryFn: () => addressService.list(),
  });

  const { data: paymentMethods, isLoading: loadingPm } = useQuery({
    queryKey: qk.paymentMethods,
    queryFn: () => paymentMethodService.listMine(),
  });

  const { data: paymentPreference, isLoading: loadingPaymentPreference } =
    useQuery({
      queryKey: qk.paymentPreference,
      queryFn: () => paymentPreferenceService.get(),
    });

  const { data: userVouchers = [], isLoading: loadingVouchers } = useQuery({
    queryKey: qk.myVouchers(),
    queryFn: () => voucherService.listMine(),
    enabled: isAuthenticated,
  });

  const createStripeSetupMutation = useMutation({
    mutationFn: () => paymentMethodService.createStripeSetupIntent(),
    onSuccess: (intent) => setStripeSetupIntent(intent),
    onError: (error) => {
      setStripeCardModalOpen(false);
      toast.error(getErrorMessage(error));
    },
  });

  const completeStripeSetupMutation = useMutation({
    mutationFn: (input: { setupIntentId: string }) =>
      paymentMethodService.completeStripeSetupIntent(input),
    onSuccess: async (method) => {
      setStripeSetupIntent(null);
      setStripeCardModalOpen(false);
      setSelectedPaymentOption(method.methodId);
      try {
        await paymentPreferenceService.update({
          paymentType: "SAVED_CARD",
          paymentMethodId: method.methodId,
        });
        await Promise.all([
          qc.invalidateQueries({ queryKey: qk.paymentMethods }),
          qc.invalidateQueries({ queryKey: qk.paymentPreference }),
        ]);
        toast.success(
          locale === "vi"
            ? t("checkout.stripeCardSelected")
            : "Stripe card added and selected",
        );
      } catch (error) {
        setSelectedPaymentOption(null);
        toast.error(getErrorMessage(error));
      }
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const effectiveAddressId = useMemo(
    () => resolveAddressId(selectedAddressId, addresses),
    [selectedAddressId, addresses],
  );

  const usablePaymentMethods = useMemo(
    () => getVerifiedPaymentMethods(paymentMethods),
    [paymentMethods],
  );

  const effectivePaymentOption = useMemo(
    () =>
      resolvePaymentOption(
        selectedPaymentOption,
        paymentPreference,
        usablePaymentMethods,
      ),
    [paymentPreference, selectedPaymentOption, usablePaymentMethods],
  );

  const effectivePaymentMethod = useMemo(
    () =>
      usablePaymentMethods.find(
        (method) => method.methodId === effectivePaymentOption,
      ) ?? null,
    [effectivePaymentOption, usablePaymentMethods],
  );
  const isVnpay = effectivePaymentOption === "VNPAY";

  const activeAddress = useMemo(
    () => findAddress(addresses, effectiveAddressId),
    [addresses, effectiveAddressId],
  );
  const merchantNames = useMerchantNameMap();
  const merchantGroups = useMemo(() => {
    const groups = new Map<string, typeof checkoutItems>();
    for (const item of checkoutItems) {
      const key = item.merchantId ?? "unknown";
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return Array.from(groups.entries());
  }, [checkoutItems]);
  const quoteAddress = useMemo(() => {
    if (!activeAddress) return null;
    return {
      fullName: activeAddress.contactName,
      phone: activeAddress.phone,
      addressLine: activeAddress.fullAddress ?? activeAddress.detailAddress,
      wardCode: activeAddress.wardCode,
      districtId: activeAddress.districtCode,
      provinceCode: activeAddress.provinceCode,
      countryCode: "VN",
    };
  }, [activeAddress]);

  const { data: shippingQuote, isLoading: loadingSingleQuote } = useQuery({
    queryKey: [
      "shipping-quote",
      effectiveAddressId,
      activeAddress?.districtCode,
      activeAddress?.wardCode,
      checkoutItems.map((item) => `${item.skuId}x${item.qty ?? 1}`).join(","),
      checkoutItems[0]?.currency,
      // Goods subtotal affects the quoted fee, so it belongs in the key.
      checkoutItems.reduce(
        (sum, item) => sum + item.price * (item.qty ?? 1),
        0,
      ),
    ],
    queryFn: async () => {
      if (!quoteAddress) return null;
      const items = checkoutItems.map((item) => ({
        skuId: item.skuId,
        qty: item.qty ?? 1,
      }));
      const goodsSubtotal = checkoutItems.reduce(
        (sum, item) => sum + item.price * (item.qty ?? 1),
        0,
      );
      return shippingService.quote(
        quoteAddress,
        items,
        checkoutItems[0]?.currency ?? "VND",
        goodsSubtotal,
      );
    },
    enabled: !!activeAddress && checkoutItems.length > 0 && !isMultiShop,
  });

  const {
    data: multiShopShipping = new Map<string, number>(),
    isLoading: loadingMultiQuote,
  } = useQuery({
    queryKey: [
      "shipping-quote-shops",
      effectiveAddressId,
      activeAddress?.districtCode,
      activeAddress?.wardCode,
      selectedShippingService,
      merchantGroups
        .map(
          ([merchantId, groupItems]) =>
            `${merchantId}:${groupItems
              .map((item) => `${item.skuId}x${item.qty ?? 1}`)
              .join(",")}`,
        )
        .join("|"),
    ],
    enabled:
      !!activeAddress &&
      isMultiShop &&
      checkoutItems.length > 0 &&
      merchantGroups.length > 0,
    queryFn: async () => {
      if (!quoteAddress) return new Map<string, number>();
      const entries = await Promise.all(
        merchantGroups.map(async ([merchantId, groupItems]) => {
          const goodsSubtotal = groupItems.reduce(
            (sum, item) => sum + item.price * (item.qty ?? 1),
            0,
          );
          const quote = await shippingService.quote(
            quoteAddress,
            groupItems.map((item) => ({
              skuId: item.skuId,
              qty: item.qty ?? 1,
            })),
            groupItems[0]?.currency ?? "VND",
            goodsSubtotal,
          );
          const option =
            quote.options?.find(
              (item) => item.code === selectedShippingService,
            ) ?? quote.options?.[0];
          return [merchantId, option?.fee ?? quote.fee ?? 0] as const;
        }),
      );
      return new Map(entries);
    },
  });

  const shippingOptions = shippingQuote?.options ?? [];
  const selectedShippingOption =
    shippingOptions.find((option) => option.code === selectedShippingService) ??
    shippingOptions[0];
  const multiShopShippingFee = Array.from(multiShopShipping.values()).reduce(
    (sum, fee) => sum + fee,
    0,
  );
  const loadingQuote = isMultiShop ? loadingMultiQuote : loadingSingleQuote;
  const resolvedShippingFee = isMultiShop
    ? multiShopShippingFee
    : (selectedShippingOption?.fee ?? shippingQuote?.fee ?? 0);
  const shippingByMerchant = useMemo(() => {
    if (isMultiShop) return multiShopShipping;
    const map = new Map<string, number>();
    for (const merchantId of selectedMerchantIds) {
      map.set(merchantId, resolvedShippingFee);
    }
    return map;
  }, [
    isMultiShop,
    multiShopShipping,
    resolvedShippingFee,
    selectedMerchantIds,
  ]);
  const selectedPlatformVoucher = useMemo(
    () =>
      userVouchers.find(
        (voucher) => voucher.voucherCode === platformVoucherCode,
      ) ?? null,
    [userVouchers, platformVoucherCode],
  );
  const selectedShopVoucher = useMemo(
    () =>
      userVouchers.find((voucher) => voucher.voucherCode === shopVoucherCode) ??
      null,
    [userVouchers, shopVoucherCode],
  );
  const selectedShippingVoucher = useMemo(
    () =>
      userVouchers.find(
        (voucher) => voucher.voucherCode === shippingVoucherCode,
      ) ?? null,
    [userVouchers, shippingVoucherCode],
  );
  const shopDiscountsByMerchant = useMemo(() => {
    const discounts = new Map<string, number>();
    for (const [merchantId, groupItems] of merchantGroups) {
      const code = shopVoucherCodes[merchantId];
      if (!code) continue;
      const voucher = userVouchers.find((item) => item.voucherCode === code);
      if (!voucher) continue;
      const goodsTotal = groupItems.reduce(
        (sum, item) => sum + item.price * (item.qty ?? 1),
        0,
      );
      discounts.set(
        merchantId,
        calculateShopVoucherDiscount(voucher, goodsTotal),
      );
    }
    return discounts;
  }, [merchantGroups, shopVoucherCodes, userVouchers]);
  const shopDiscountTotal = useMemo(
    () =>
      Array.from(shopDiscountsByMerchant.values()).reduce(
        (sum, value) => sum + value,
        0,
      ),
    [shopDiscountsByMerchant],
  );
  const {
    subtotal: totalAmount,
    goodsDiscount: platformDiscount,
    shippingDiscount,
  } = useMemo(
    () =>
      calculateCheckoutPricing(
        checkoutItems,
        {
          platform: selectedPlatformVoucher,
          shop: null,
          shipping: selectedShippingVoucher,
        },
        resolvedShippingFee,
      ),
    [
      checkoutItems,
      selectedPlatformVoucher,
      selectedShippingVoucher,
      resolvedShippingFee,
    ],
  );
  const handleApplyVoucher = (mode: VoucherPickerMode, code: string) => {
    setApplyingVoucher(mode);
    try {
      setVoucher(mode, code);
      toast.success(t("checkout.voucherApplied"));
    } finally {
      setApplyingVoucher(null);
    }
  };

  const handleRemoveVoucher = (mode: VoucherPickerMode) => {
    clearVoucher(mode);
    toast.success(t("cart.voucherRemoved"));
  };

  const openStripeCardModal = () => {
    if (!isStripeClientConfigured) {
      toast.error(
        locale === "vi"
          ? t("checkout.stripeKeyMissing")
          : "Stripe publishable key is missing. Configure NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.",
      );
      return;
    }
    setPaymentModalOpen(false);
    setStripeSetupIntent(null);
    setStripeCardModalOpen(true);
    createStripeSetupMutation.mutate();
  };

  const handlePaymentSelection = async (option: string) => {
    setSelectedPaymentOption(option);
    setPaymentModalOpen(false);
    setSavingPaymentPreference(true);
    try {
      await paymentPreferenceService.update(
        option === "COD"
          ? { paymentType: "COD", paymentMethodId: null }
          : option === "VNPAY"
            ? { paymentType: "VNPAY", paymentMethodId: null }
            : { paymentType: "SAVED_CARD", paymentMethodId: option },
      );
      qc.invalidateQueries({ queryKey: qk.paymentPreference });
    } catch (error) {
      setSelectedPaymentOption(null);
      toast.error(
        getErrorMessage(
          error,
          locale === "vi"
            ? t("checkout.savePaymentFailed")
            : "Could not save payment preference",
        ),
      );
    } finally {
      setSavingPaymentPreference(false);
    }
  };

  // One idempotency key per place-order attempt, held in a ref so a React
  // Query retry reuses it instead of minting a new payment.
  const placeIdempotencyKeyRef = useRef<string | null>(null);
  const placeMutation = useMutation({
    mutationFn: async () => {
      if (!placeIdempotencyKeyRef.current) {
        placeIdempotencyKeyRef.current = crypto.randomUUID();
      }
      const idempotencyKey = placeIdempotencyKeyRef.current;
      if (checkoutItems.length === 0) {
        throw new Error(t("cart.emptyCart"));
      }
      if (!effectiveAddressId) {
        throw new Error(t("checkout.selectAddressAndPayment"));
      }
      const addr = (addresses ?? []).find(
        (a) => a.addressId === effectiveAddressId,
      );
      if (!addr) throw new Error(t("checkout.invalidAddress"));
      const method = effectivePaymentMethod;

      const isCod = effectivePaymentOption === "COD";
      const gateway: "STRIPE" | "VNPAY" | "COD" = isCod
        ? "COD"
        : isVnpay || String(method?.provider).toUpperCase().includes("VNPAY")
          ? "VNPAY"
          : "STRIPE";
      const body: Parameters<typeof orderService.place>[0] = {
        addressId: addr.addressId,
        paymentMethodId: method?.methodId ?? (isVnpay ? "VNPAY" : "COD"),
        currency: checkoutItems[0]?.currency ?? "VND",
        shippingFee: resolvedShippingFee,
        shippingAddress: {
          addressId: addr.addressId,
          fullName: addr.contactName,
          phone: addr.phone,
          addressLine: addr.fullAddress ?? addr.detailAddress,
          wardCode: addr.wardCode,
          districtCode: addr.districtCode,
          provinceCode: addr.provinceCode,
          countryCode: "VN",
        },
        selectedSkuIds: checkoutItems.map((item) => item.skuId),
        gateway,
        shippingService:
          selectedShippingService || selectedShippingOption?.code,
        platformVoucherCode: platformVoucherCode ?? undefined,
        shopVoucherCode: shopVoucherCode ?? undefined,
        shippingVoucherCode: shippingVoucherCode ?? undefined,
        shopVoucherCodes: checkoutShopVoucherCodes,
        notesByMerchant: Object.fromEntries(
          Object.entries(notesByMerchant)
            .map(
              ([merchantId, value]) =>
                [merchantId, value?.trim() ?? ""] as const,
            )
            .filter(([, value]) => value.length > 0),
        ),
      };

      if (isMultiShop) {
        const group = await orderService.placeGroup(body);
        const [order, ...rest] = group.orders;
        if (!order) {
          throw new Error(t("checkout.orderFailed"));
        }
        if (!method && !isVnpay) {
          return { order, payment: null, groupId: group.groupId };
        }
        // The backend owns the group total: sum every persisted sub-order total.
        const total = group.orders.reduce(
          (sum, line) => sum + (line.totalAmount ?? 0),
          0,
        );
        const payment = await paymentService.initiate({
          orderId: group.groupId,
          groupId: group.groupId,
          orderIds: group.orders.map((line) => line.orderId),
          paymentMethodId: method?.methodId ?? null,
          amount: total,
          currency: group.orders[0]?.currency ?? body.currency,
          gateway,
          idempotencyKey,
        });
        return {
          order,
          payment,
          groupId: group.groupId,
          orders: [order, ...rest],
        };
      }

      const order = await orderService.place(body);

      if (!method && !isVnpay) {
        return { order, payment: null };
      }

      const total = order.totalAmount + (order.shippingFee ?? 0);
      const payment = await paymentService.initiate({
        orderId: order.orderId,
        paymentMethodId: method?.methodId ?? null,
        amount: total,
        currency: order.currency,
        gateway,
        idempotencyKey,
      });
      return { order, payment };
    },
    onSuccess: ({ order, payment }) => {
      // Navigate first and hydrate the now-empty cart afterwards, otherwise the
      // emptied cart re-renders the checkout page as "cart is empty" before the
      // order detail route takes over.
      setOrderPlaced(true);
      window.sessionStorage.removeItem(CHECKOUT_SELECTION_STORAGE_KEY);
      qc.invalidateQueries({ queryKey: ["orders"] });

      if (!payment) {
        toast.success(t("checkout.orderSuccess"));
        router.push(ordersListWithFocus(order.orderId));
      } else if (payment.status === "PAID") {
        toast.success(t("checkout.paymentSuccess"));
        router.push(ordersListWithFocus(order.orderId));
      } else if (payment.status === "FAILED") {
        toast.error(getPaymentFailureMessage(payment, t));
        router.push(ordersListWithFocus(order.orderId));
      } else if (payment.redirectUrl) {
        toast.success(t("checkout.redirectingToGateway"));
        window.location.href = payment.redirectUrl;
      } else {
        router.push(
          `/payments/return?paymentId=${encodeURIComponent(payment.paymentId)}&orderId=${encodeURIComponent(order.orderId)}`,
        );
      }

      if (isAuthenticated) {
        void hydrateFromServer().catch(() => {});
      }
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, t("checkout.orderFailed")));
    },
    onSettled: () => {
      placeIdempotencyKeyRef.current = null;
    },
  });

  if (orderPlaced) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={28} />
      </div>
    );
  }

  if (items.length === 0 || checkoutItems.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <EmptyState
          icon={Truck}
          title={t("cart.emptyCart")}
          description={t("cart.emptyCartDesc")}
          action={
            <Link href="/products">
              <Button>{t("cart.continueShopping")}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-end justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t("checkout.title")}
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <CheckoutDeliveryPanel
              loading={loadingAddr}
              addresses={addresses}
              active={activeAddress}
              locale={locale}
              modalOpen={addressModalOpen}
              selectedId={effectiveAddressId}
              onModal={setAddressModalOpen}
              onAddress={setSelectedAddressId}
              t={t}
            />
            <CheckoutOrderItems
              items={checkoutItems}
              merchantNames={merchantNames}
              shippingByMerchant={shippingByMerchant}
              shopVoucherCodes={shopVoucherCodes}
              vouchers={userVouchers}
              onChooseShopVoucher={openShopVoucher}
              notesByMerchant={notesByMerchant}
              onNote={(merchantId, value) =>
                setNotesByMerchant((current) => ({
                  ...current,
                  [merchantId]: value,
                }))
              }
              currency={checkoutItems[0]?.currency}
              locale={locale}
              t={t}
            />
            <CheckoutVoucherPanel
              locale={locale}
              platformCode={platformVoucherCode}
              shopCode={shopVoucherCode}
              shippingCode={shippingVoucherCode}
              selected={{
                platform: selectedPlatformVoucher,
                shop: selectedShopVoucher,
                shipping: selectedShippingVoucher,
              }}
              applying={applyingVoucher}
              loading={loadingVouchers}
              vouchers={userVouchers}
              total={totalAmount}
              shippingFee={resolvedShippingFee}
              currency={checkoutItems[0]?.currency}
              onApply={handleApplyVoucher}
              onClear={handleRemoveVoucher}
              t={t}
            />
            <CheckoutPaymentPanel
              locale={locale}
              loading={loadingPm || loadingPaymentPreference}
              vnpay={isVnpay}
              method={effectivePaymentMethod}
              modalOpen={paymentModalOpen}
              saving={savingPaymentPreference}
              option={effectivePaymentOption}
              methods={usablePaymentMethods}
              stripeOpen={stripeCardModalOpen}
              setup={stripeSetupIntent}
              preparing={createStripeSetupMutation.isPending}
              completing={completeStripeSetupMutation.isPending}
              onModal={setPaymentModalOpen}
              onSelect={handlePaymentSelection}
              onOpenStripe={openStripeCardModal}
              onCloseStripe={() => {
                setStripeCardModalOpen(false);
                setStripeSetupIntent(null);
              }}
              onCompleteStripe={(setupIntentId) =>
                completeStripeSetupMutation.mutate({ setupIntentId })
              }
              t={t}
            />{" "}
          </div>

          <CheckoutSummary
            itemCount={checkoutItems.length}
            currency={checkoutItems[0]?.currency}
            total={totalAmount}
            platformDiscount={platformDiscount}
            shopDiscount={shopDiscountTotal}
            shippingDiscount={shippingDiscount}
            address={activeAddress}
            quoteLoading={loadingQuote}
            shipping={resolvedShippingFee}
            placing={placeMutation.isPending}
            locale={locale}
            onPlace={() => placeMutation.mutate()}
            t={t}
          />
        </div>

        <VoucherPickerModal
          open={shopVoucherOpen}
          onClose={() => setShopVoucherOpen(false)}
          locale={locale}
          mode="shop"
          merchantId={shopVoucherMerchant}
          vouchers={userVouchers}
          loading={loadingVouchers}
          total={totalAmount}
          currency={checkoutItems[0]?.currency}
          selectedCode={
            shopVoucherMerchant
              ? (shopVoucherCodes[shopVoucherMerchant] ?? null)
              : null
          }
          applying={applyingVoucher !== null}
          onApply={(code) => {
            if (shopVoucherMerchant) setShopVoucher(shopVoucherMerchant, code);
            setShopVoucherOpen(false);
          }}
          t={t}
        />
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <AuthGuard>
      <CheckoutInner />
    </AuthGuard>
  );
}
