"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/shared/ui";
import { getProductStatus } from "@/lib/domain/status/product";
import { formatCurrency } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import type { ProductStatus } from "@/types";
const STATUS_VALUES: ProductStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "DEACTIVATED",
  "TAKEN_DOWN",
  "REJECTED",
];
function useDropdownClose(open: boolean, setOpen: (v: boolean) => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, setOpen]);
  return ref;
}

export function StatusDropdown({
  value,
  onChange,
}: {
  value: ProductStatus | null;
  onChange: (val: ProductStatus | null) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useDropdownClose(open, setOpen);

  const currentLabel = value
    ? t(getProductStatus(value as ProductStatus).labelKey)
    : t("merchant.productList.statusAll");

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm text-gray-700 bg-white border border-gray-400 hover:bg-gray-50 transition-all font-medium shadow-sm focus:border-blue-400 focus:outline-none"
        aria-expanded={open}
      >
        <span className="text-gray-500">
          {t("merchant.productList.statusHeading")}:
        </span>
        <span>{currentLabel}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl border border-gray-400 shadow-lg py-1 z-50 overflow-hidden">
          <DropdownItem
            label={t("merchant.productList.statusAll")}
            active={!value}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          />
          {STATUS_VALUES.map((s) => (
            <DropdownItem
              key={s}
              label={t(getProductStatus(s).labelKey)}
              active={value === s}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryDropdown({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: { id: string; label: string }[];
  onChange: (val: string | null) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useDropdownClose(open, setOpen);

  const currentLabel = value
    ? (options.find((o) => o.id === value)?.label ?? value)
    : t("merchant.productList.categoryAll");

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm text-gray-700 bg-white border border-gray-400 hover:bg-gray-50 transition-all font-medium shadow-sm focus:border-blue-400 focus:outline-none"
        aria-expanded={open}
      >
        <span className="text-gray-500">
          {t("merchant.productList.categoryHeading")}:
        </span>
        <span className="max-w-[160px] truncate">{currentLabel}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl border border-gray-400 shadow-lg py-1 z-50 overflow-hidden max-h-72 overflow-y-auto">
          <DropdownItem
            label={t("merchant.productList.categoryAll")}
            active={!value}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          />
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">
              {t("merchant.productList.categoryEmpty")}
            </p>
          ) : (
            options.map((opt) => (
              <DropdownItem
                key={opt.id}
                label={opt.label}
                active={value === opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function PricePopover({
  priceMin,
  priceMax,
  onApply,
}: {
  priceMin: string | null;
  priceMax: string | null;
  onApply: (min?: string, max?: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useDropdownClose(open, setOpen);
  const [draft, setDraft] = useState<{ min: string; max: string } | null>(null);
  const minInput = draft?.min ?? priceMin ?? "";
  const maxInput = draft?.max ?? priceMax ?? "";

  function togglePopover() {
    if (!open) setDraft(null);
    setOpen(!open);
  }

  function closeWith(min?: string, max?: string) {
    setDraft(null);
    onApply(min, max);
    setOpen(false);
  }

  const summary =
    priceMin && priceMax
      ? `${formatCurrency(Number(priceMin))} - ${formatCurrency(Number(priceMax))}`
      : priceMin
        ? `>= ${formatCurrency(Number(priceMin))}`
        : priceMax
          ? `<= ${formatCurrency(Number(priceMax))}`
          : t("merchant.productList.priceAll");

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={togglePopover}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm text-gray-700 bg-white border border-gray-400 hover:bg-gray-50 transition-all font-medium shadow-sm focus:border-blue-400 focus:outline-none"
        aria-expanded={open}
      >
        <span className="text-gray-500">
          {t("merchant.productList.priceHeading")}:
        </span>
        <span className="max-w-[180px] truncate">{summary}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl border border-gray-400 shadow-lg p-3 z-50">
          <div className="space-y-2">
            <input
              type="number"
              value={minInput}
              onChange={(e) => setDraft({ min: e.target.value, max: maxInput })}
              placeholder={t("merchant.productList.priceFromPlaceholder", {
                value: "0",
              })}
              className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:border-blue-500 focus:outline-none"
            />
            <input
              type="number"
              value={maxInput}
              onChange={(e) => setDraft({ min: minInput, max: e.target.value })}
              placeholder={t("merchant.productList.priceToPlaceholder", {
                value: t("merchant.productList.priceUnlimited"),
              })}
              className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:border-blue-500 focus:outline-none"
            />
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => closeWith(undefined, undefined)}
              >
                {t("merchant.productList.priceClear")}
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() =>
                  closeWith(minInput || undefined, maxInput || undefined)
                }
              >
                {t("merchant.productList.applyBtn")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-blue-50 text-blue-700 font-semibold"
          : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span className="truncate">{label}</span>
      {active && <Check size={14} className="text-blue-700 shrink-0 ml-2" />}
    </button>
  );
}
