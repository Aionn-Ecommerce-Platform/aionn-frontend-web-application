"use client";
import Link from "next/link";
import {
  AlertCircle,
  Clock,
  Loader2,
  MapPin,
  PlusCircle,
  Truck,
  Zap,
} from "lucide-react";
import { Button, Modal } from "@/shared/ui";
import { getLocalizedAddress } from "@/shared/lib/address-utils";
import { formatCurrency } from "@/shared/lib/utils";
import type { Address } from "@/types";
import { AddressOption } from "./CheckoutOptions";
type T = (key: string, values?: Record<string, string | number>) => string;
interface Props {
  loading: boolean;
  addresses?: Address[];
  active?: Address | null;
  locale: "vi" | "en";
  modalOpen: boolean;
  selectedId?: string | null;
  quoteLoading: boolean;
  deliveryDate: string | null;
  shippingFee: number;
  currency?: string;
  onModal: (open: boolean) => void;
  onAddress: (id: string) => void;
  t: T;
}
export default function CheckoutDeliveryPanel(props: Props) {
  const {
    loading: loadingAddr,
    addresses,
    active: activeAddress,
    locale,
    modalOpen: addressModalOpen,
    selectedId: effectiveAddressId,
    quoteLoading: loadingQuote,
    deliveryDate: deliveryDateLabel,
    shippingFee: resolvedShippingFee,
    currency,
    onModal: setAddressModalOpen,
    onAddress: setSelectedAddressId,
    t,
  } = props;
  return (
    <>
      {" "}
      <div className="bg-white rounded-2xl border border-gray-400 shadow-sm p-6">
        <h2 className="flex items-center gap-2.5 text-base font-semibold text-gray-900 mb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <MapPin size={16} />
          </span>
          {t("checkout.shippingAddress")}
        </h2>
        {loadingAddr ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={20} />
          </div>
        ) : !addresses || addresses.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-3">
              {t("checkout.noAddress")}
            </p>
            <Link href="/account/addresses">
              <Button variant="outline" size="sm">
                <PlusCircle size={14} className="mr-1" />
                {t("checkout.addAddress")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-6 border-t border-gray-100 pt-4">
            <div className="min-w-0 space-y-1.5 text-sm leading-6">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-gray-600">
                  <span className="font-semibold text-gray-900">
                    {t("checkout.recipient")}:
                  </span>{" "}
                  {activeAddress?.contactName}
                </p>
                {activeAddress?.isDefault && (
                  <span className="border border-orange-200 px-1.5 py-0.5 text-xs font-medium text--commerce">
                    {t("addresses.defaultBadge")}
                  </span>
                )}
              </div>
              <p className="text-gray-600">
                <span className="font-semibold text-gray-900">
                  {t("common.phone")}:
                </span>{" "}
                {activeAddress?.phone}
              </p>
              <p className="text-gray-600">
                <span className="font-semibold text-gray-900">
                  {t("common.address")}:
                </span>{" "}
                {activeAddress
                  ? getLocalizedAddress(activeAddress, locale)
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddressModalOpen(true)}
              className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              {t("checkout.change")}
            </button>
          </div>
        )}
      </div>
      <Modal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        title={
          locale === "vi"
            ? t("checkout.selectShippingAddress")
            : "Select shipping address"
        }
        size="lg"
      >
        <div className="space-y-3">
          {[...(addresses || [])]
            .sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : 0))
            .map((addr) => (
              <AddressOption
                key={addr.addressId}
                address={addr}
                selected={effectiveAddressId === addr.addressId}
                onSelect={() => {
                  setSelectedAddressId(addr.addressId);
                  setAddressModalOpen(false);
                }}
                locale={locale}
              />
            ))}
          <Link href="/account/addresses" className="block pt-2">
            <Button variant="outline" className="w-full">
              <PlusCircle size={16} className="mr-2" />
              {t("checkout.addNewAddress")}
            </Button>
          </Link>
        </div>
      </Modal>
      <div className="bg-white rounded-2xl border border-gray-400 shadow-sm p-6">
        <h2 className="flex items-center gap-2.5 text-base font-semibold text-gray-900 mb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Truck size={16} />
          </span>
          {t("checkout.shippingMethod")}
        </h2>
        {!activeAddress ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{t("checkout.shippingNeedsAddress")}</span>
          </div>
        ) : loadingQuote ? (
          <div className="py-6 flex justify-center items-center gap-2">
            <Loader2 className="animate-spin text-blue-600" size={18} />
            <span className="text-sm text-gray-500">
              {t("checkout.calculatingShipping")}
            </span>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
                  <Zap size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {t("checkout.express")}{" "}
                    <span className="text-gray-400">·</span> GHN
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-600">
                    <Clock size={11} />
                    {deliveryDateLabel ??
                      (locale === "vi"
                        ? t("checkout.noEstimatedDelivery")
                        : "GHN ETA unavailable")}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-green-600">
                {resolvedShippingFee === 0
                  ? t("cart.free")
                  : formatCurrency(resolvedShippingFee, currency)}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
