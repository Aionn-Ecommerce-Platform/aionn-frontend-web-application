"use client";
import { useTranslation } from "@/hooks";
import type { InventoryItem } from "@/types";
export function ActionBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-1.5 rounded-md text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
    >
      {children}
    </button>
  );
}

export function ItemHeader({ item }: { item: InventoryItem }) {
  const { t } = useTranslation();
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
      <p>
        <span className="text-gray-500">
          {t("merchant.inventory.itemHeaderSku")}
        </span>{" "}
        <span className="font-mono">{item.skuId}</span>
      </p>
      <p>
        <span className="text-gray-500">
          {t("merchant.inventory.itemHeaderPhysical")}
        </span>{" "}
        {item.physicalQty} ·{" "}
        <span className="text-gray-500">
          {t("merchant.inventory.itemHeaderAvailable")}
        </span>{" "}
        {item.availableQty}
      </p>
    </div>
  );
}
