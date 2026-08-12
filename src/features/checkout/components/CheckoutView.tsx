"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Truck } from "lucide-react";
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
  productService,
  voucherService,
} from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getPaymentFailureMessage } from "@/lib/payment-i18n";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore } from "@/stores/auth.store";
import { formatDate } from "@/shared/lib/utils";
import { getErrorMessage } from "@/shared/lib/errors";
import {
  calculateCheckoutPricing,
  findAddress,
  getVerifiedPaymentMethods,
  resolveAddressId,
  resolvePaymentOption,
  selectCheckoutItems,
} from "@/lib/domain/checkout";
import type { StripeSetupIntent } from "@/lib/services";
import CheckoutDeliveryPanel from "./CheckoutDeliveryPanel";
import CheckoutVoucherPanel from "./CheckoutVoucherPanel";
import CheckoutPaymentPanel from "./CheckoutPaymentPanel";
import { CheckoutRecommendations, CheckoutSummary } from "./CheckoutSummary";
import {
  CHECKOUT_SELECTION_STORAGE_KEY,
  getStoredCheckoutSelection,
} from "./checkout-storage";

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { t, locale } = useTranslation();
  const items = useCartStore((s) => s.items);
  const hydrateFromServer = useCartStore((s) => s.hydrateFromServer);
  const voucherCode = useCartStore((s) => s.voucherCode);
  const applyVoucher = useCartStore((s) => s.applyVoucher);
  const removeVoucher = useCartStore((s) => s.removeVoucher);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const selectedSkuParam = searchParams.get("items") ?? "";
  const [selectedSkuIds, setSelectedSkuIds] = useState<string[] | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [stripeCardModalOpen, setStripeCardModalOpen] = useState(false);
  const [stripeSetupIntent, setStripeSetupIntent] =
    useState<StripeSetupIntent | null>(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<
    string | null
  >(null);
  const [savingPaymentPreference, setSavingPaymentPreference] = useState(false);

  useEffect(() => {
    const selection = getStoredCheckoutSelection(selectedSkuParam);
    const frameId = window.requestAnimationFrame(() => {
      setSelectedSkuIds(selection);
    });
    if (selectedSkuParam) {
      router.replace("/checkout", { scroll: false });
    }
    return () => window.cancelAnimationFrame(frameId);
  }, [router, selectedSkuParam]);
  const checkoutItems = useMemo(
    () => selectCheckoutItems(items, selectedSkuIds),
    [items, selectedSkuIds],
  );

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
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

  const { data: shippingQuote, isLoading: loadingQuote } = useQuery({
    queryKey: [
      "shipping-quote",
      effectiveAddressId,
      checkoutItems.map((item) => item.skuId).join(","),
      checkoutItems[0]?.currency,
    ],
    queryFn: async () => {
      if (!activeAddress) return null;
      const dimensions = {
        weightGram: 500,
        lengthCm: 15,
        widthCm: 10,
        heightCm: 5,
      };
      const quoteAddr = {
        fullName: activeAddress.contactName,
        phone: activeAddress.phone,
        addressLine: activeAddress.fullAddress ?? activeAddress.detailAddress,
        wardCode: activeAddress.wardCode,
        districtId: activeAddress.districtCode,
        provinceCode: activeAddress.provinceCode,
        countryCode: "VN",
      };
      return shippingService.quote(
        quoteAddr,
        dimensions,
        checkoutItems[0]?.currency ?? "VND",
      );
    },
    enabled: !!activeAddress && checkoutItems.length > 0,
  });

  const resolvedShippingFee = shippingQuote?.fee ?? 0;

  const selectedVoucher = useMemo(
    () =>
      userVouchers.find((voucher) => voucher.voucherCode === voucherCode) ??
      null,
    [userVouchers, voucherCode],
  );
  const {
    subtotal: totalAmount,
    meetsMinimum: voucherMeetsMinimum,
    discount: voucherDiscount,
  } = useMemo(
    () => calculateCheckoutPricing(checkoutItems, selectedVoucher),
    [checkoutItems, selectedVoucher],
  );
  const deliveryDateLabel = shippingQuote?.estimatedDeliveryAt
    ? `${t("checkout.estimatedDelivery")}: ${formatDate(shippingQuote.estimatedDeliveryAt, locale)}`
    : null;

  const { data: recommendedProducts } = useQuery({
    queryKey: ["checkout-recommendations"],
    queryFn: () => productService.getPopular(12),
  });

  const handleApplyVoucher = async (code: string) => {
    setApplyingVoucher(true);
    try {
      await applyVoucher(code, { authenticated: isAuthenticated });
      setVoucherModalOpen(false);
      toast.success(t("checkout.voucherApplied"));
    } catch {
    } finally {
      setApplyingVoucher(false);
    }
  };

  const handleRemoveVoucher = async () => {
    setApplyingVoucher(true);
    try {
      await removeVoucher({ authenticated: isAuthenticated });
    } finally {
      setApplyingVoucher(false);
    }
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

  const placeMutation = useMutation({
    mutationFn: async () => {
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
      const order = await orderService.place({
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
      });

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
        idempotencyKey:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      });
      return { order, payment };
    },
    onSuccess: async ({ order, payment }) => {
      try {
        if (isAuthenticated) {
          await hydrateFromServer();
        }
      } catch {}
      window.sessionStorage.removeItem(CHECKOUT_SELECTION_STORAGE_KEY);
      qc.invalidateQueries({ queryKey: ["orders"] });

      if (!payment) {
        toast.success(t("checkout.orderSuccess"));
        router.push(`/orders/${order.orderId}`);
        return;
      }

      if (payment.status === "PAID") {
        toast.success(t("checkout.paymentSuccess"));
        router.push(`/orders/${order.orderId}`);
        return;
      }
      if (payment.status === "FAILED") {
        toast.error(getPaymentFailureMessage(payment, t));
        router.push(`/orders/${order.orderId}`);
        return;
      }
      if (payment.redirectUrl) {
        toast.success(t("checkout.redirectingToGateway"));
        window.location.href = payment.redirectUrl;
        return;
      }

      router.push(
        `/payments/return?paymentId=${encodeURIComponent(payment.paymentId)}&orderId=${encodeURIComponent(order.orderId)}`,
      );
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, t("checkout.orderFailed")));
    },
  });

  if (selectedSkuIds === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-end justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t("checkout.title")}
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Check size={14} className="text-green-600" />
            {t("checkout.securedBy")}
          </span>
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
              quoteLoading={loadingQuote}
              deliveryDate={deliveryDateLabel}
              shippingFee={resolvedShippingFee}
              currency={checkoutItems[0]?.currency}
              onModal={setAddressModalOpen}
              onAddress={setSelectedAddressId}
              t={t}
            />
            <CheckoutVoucherPanel
              locale={locale}
              code={voucherCode}
              selected={selectedVoucher}
              meetsMinimum={voucherMeetsMinimum}
              applying={applyingVoucher}
              modalOpen={voucherModalOpen}
              loading={loadingVouchers}
              vouchers={userVouchers}
              total={totalAmount}
              currency={checkoutItems[0]?.currency}
              onModal={setVoucherModalOpen}
              onRemove={handleRemoveVoucher}
              onApply={handleApplyVoucher}
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
            voucher={selectedVoucher}
            voucherValid={voucherMeetsMinimum}
            discount={voucherDiscount}
            address={activeAddress}
            quoteLoading={loadingQuote}
            shipping={resolvedShippingFee}
            placing={placeMutation.isPending}
            locale={locale}
            onPlace={() => placeMutation.mutate()}
            t={t}
          />
        </div>

        <CheckoutRecommendations products={recommendedProducts} t={t} />
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
