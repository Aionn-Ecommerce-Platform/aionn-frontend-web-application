"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
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
        className="flex items-center gap-1.5 rounded-xl border border-gray-500 bg-white/5 px-3.5 py-2 text-sm font-medium text-slate-200 shadow-sm transition-all hover:border-gray-400 hover:bg-white/10 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        aria-expanded={open}
      >
        <span className="text-slate-400">
          {t("merchant.productList.statusHeading")}:
        </span>
        <span>{currentLabel}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-gray-500 bg-console-panel-raised py-1 shadow-2xl shadow-black/40">
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
        className="flex items-center gap-1.5 rounded-xl border border-gray-500 bg-white/5 px-3.5 py-2 text-sm font-medium text-slate-200 shadow-sm transition-all hover:border-gray-400 hover:bg-white/10 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        aria-expanded={open}
      >
        <span className="text-slate-400">
          {t("merchant.productList.categoryHeading")}:
        </span>
        <span className="max-w-[160px] truncate">{currentLabel}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl border border-gray-500 bg-console-panel-raised py-1 shadow-2xl shadow-black/40">
          <DropdownItem
            label={t("merchant.productList.categoryAll")}
            active={!value}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          />
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">
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
        className="flex items-center gap-1.5 rounded-xl border border-gray-500 bg-white/5 px-3.5 py-2 text-sm font-medium text-slate-200 shadow-sm transition-all hover:border-gray-400 hover:bg-white/10 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        aria-expanded={open}
      >
        <span className="text-slate-400">
          {t("merchant.productList.priceHeading")}:
        </span>
        <span className="max-w-[180px] truncate">{summary}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-64 rounded-xl border border-gray-500 bg-console-panel-raised p-3 shadow-2xl shadow-black/40">
          <div className="space-y-2">
            <input
              type="number"
              value={minInput}
              onChange={(e) => setDraft({ min: e.target.value, max: maxInput })}
              placeholder={t("merchant.productList.priceFromPlaceholder", {
                value: "0",
              })}
              className="w-full rounded-md border border-gray-500 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
            <input
              type="number"
              value={maxInput}
              onChange={(e) => setDraft({ min: minInput, max: e.target.value })}
              placeholder={t("merchant.productList.priceToPlaceholder", {
                value: t("merchant.productList.priceUnlimited"),
              })}
              className="w-full rounded-md border border-gray-500 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="flex-1 rounded-lg border border-gray-500 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                onClick={() => closeWith(undefined, undefined)}
              >
                {t("merchant.productList.priceClear")}
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-purple-500"
                onClick={() =>
                  closeWith(minInput || undefined, maxInput || undefined)
                }
              >
                {t("merchant.productList.applyBtn")}
              </button>
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
          ? "bg-purple-500/20 text-purple-200 font-semibold"
          : "text-slate-300 hover:bg-white/5"
      }`}
    >
      <span className="truncate">{label}</span>
      {active && <Check size={14} className="ml-2 shrink-0 text-purple-300" />}
    </button>
  );
}
