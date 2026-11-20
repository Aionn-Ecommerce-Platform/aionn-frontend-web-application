"use client";
import { useTranslation } from "@/hooks";
import { getLocalizedAddress } from "@/shared/lib/address-utils";
import type { Address, PaymentMethod } from "@/types";
export function AddressOption({
  address,
  selected,
  onSelect,
  locale,
}: {
  address: Address;
  selected: boolean;
  onSelect: () => void;
  locale: string;
}) {
  const { t } = useTranslation();
  return (
    <label
      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
        selected
          ? "border-brand bg-brand/5"
          : "border-gray-400 hover:border-gray-400"
      }`}
    >
      <input
        type="radio"
        aria-label={`${address.contactName}, ${getLocalizedAddress(address, locale)}`}
        name="address"
        checked={selected}
        onChange={onSelect}
        className="mt-1 text-brand focus:ring-brand/30"
      />
      <div>
        <p className="text-sm font-medium text-gray-900">
          {address.contactName} • {address.phone}
          {address.isDefault && (
            <span className="ml-2 text-xs bg-brand/10 text-brand-strong px-2 py-0.5 rounded-full">
              {t("addresses.defaultBadge")}
            </span>
          )}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {getLocalizedAddress(address, locale)}
        </p>
      </div>
    </label>
  );
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return method.last4Digits != null
    ? `${method.provider} **** ${method.last4Digits}`
    : method.provider;
}
