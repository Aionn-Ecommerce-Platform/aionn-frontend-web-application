"use client";
import Link from "next/link";
import { Loader2, MapPin, PlusCircle } from "lucide-react";
import { Badge, Button, Modal } from "@/shared/ui";
import { getLocalizedAddress } from "@/shared/lib/address-utils";
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
    onModal: setAddressModalOpen,
    onAddress: setSelectedAddressId,
    t,
  } = props;
  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-400 shadow-sm p-6">
        <h2 className="flex items-center gap-2.5 text-base font-semibold text-gray-900 mb-4">
          <MapPin size={22} className="shrink-0 text-red-600" />
          {t("checkout.shippingAddress")}
        </h2>
        {loadingAddr ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="animate-spin text-brand" size={20} />
          </div>
        ) : !addresses || addresses.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-3">
              {t("checkout.noAddress")}
            </p>
            <Link href="/account#addresses">
              <Button variant="outline" size="sm">
                <PlusCircle size={14} className="mr-1" />
                {t("checkout.addAddress")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-6 border-t border-gray-300 pt-4">
            <div className="min-w-0 space-y-1.5 text-sm leading-6">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-gray-600">
                  <span className="font-semibold text-gray-900">
                    {t("checkout.recipient")}:
                  </span>{" "}
                  {activeAddress?.contactName}
                </p>
                {activeAddress?.isDefault && (
                  <Badge variant="danger">{t("addresses.defaultBadge")}</Badge>
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
              className="shrink-0 text-sm font-semibold text-brand hover:text-brand-strong"
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
          <Link href="/account#addresses" className="block pt-2">
            <Button variant="outline" className="w-full">
              <PlusCircle size={16} className="mr-2" />
              {t("checkout.addNewAddress")}
            </Button>
          </Link>
        </div>
      </Modal>
    </>
  );
}
