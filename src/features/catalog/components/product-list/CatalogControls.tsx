"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Badge, Button } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { formatCurrency } from "@/shared/lib/utils";
import type { ProductSort } from "@/types";
interface SortOption {
  value: ProductSort;
  labelKey: string;
}

const SORT_OPTIONS = [
  { value: "NEWEST", labelKey: "products.sortNewest" },
  { value: "BEST_SELLER", labelKey: "products.sortBestSeller" },
  { value: "PRICE_ASC", labelKey: "products.sortPriceAsc" },
  { value: "PRICE_DESC", labelKey: "products.sortPriceDesc" },
] as const satisfies readonly SortOption[];

export function SortDropdown({
  value,
  onChange,
  t,
}: {
  value: ProductSort;
  onChange: (val: ProductSort) => void;
  t: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);
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
  }, [open]);

  const currentOption =
    SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-1.5 px-3.5 rounded-xl text-sm text-gray-700 bg-gray-50/80 border border-gray-400 hover:bg-white transition-all font-medium shadow-sm focus:border-blue-400 focus:outline-none"
        aria-label="Sort products"
        aria-expanded={open}
      >
        <span>
          {t("products.sortLabel")}: {t(currentOption.labelKey)}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-gray-400 shadow-lg py-1 z-50 overflow-hidden">
          {SORT_OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{t(opt.labelKey)}</span>
                {active && (
                  <Check size={14} className="text-blue-700 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ChipButton({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
    >
      <Badge variant="info">
        <span className="mr-1">{label}</span>
        <X size={10} />
      </Badge>
    </button>
  );
}

export function FacetSection({
  title,
  items,
  emptyHint,
  onToggle,
}: {
  title: string;
  items: { id: string; label: string; count: number; selected: boolean }[];
  emptyHint: string;
  onToggle: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0 && !emptyHint) return null;

  const visible = expanded ? items : items.slice(0, 6);
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-800 mb-2">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">{emptyHint}</p>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((item, index) => (
            <li key={`${item.id}-${index}`}>
              <label className="flex items-center justify-between text-sm cursor-pointer hover:text-blue-600 group">
                <span className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    aria-label={item.label}
                    checked={item.selected}
                    onChange={() => onToggle(item.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate text-gray-700 group-hover:text-blue-600">
                    {item.label}
                  </span>
                </span>
              </label>
            </li>
          ))}
          {items.length > 6 && (
            <li>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-blue-600 hover:underline"
              >
                {expanded
                  ? t("products.collapse")
                  : t("products.showMore").replace(
                      "{count}",
                      String(items.length - 6),
                    )}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export function PriceFilter({
  priceMin,
  priceMax,
  bounds,
  onApply,
  t,
}: {
  priceMin: string | null;
  priceMax: string | null;
  bounds: { min: number | null; max: number | null } | null;
  onApply: (min?: string, max?: string) => void;
  t: (key: string) => string;
}) {
  const [minInput, setMinInput] = useState(priceMin ?? "");
  const [maxInput, setMaxInput] = useState(priceMax ?? "");

  const placeholderMin = bounds?.min != null ? formatCurrency(bounds.min) : "0";
  const placeholderMax =
    bounds?.max != null
      ? formatCurrency(bounds.max)
      : t("products.priceNoLimit");

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-800 mb-2">
        {t("products.priceRange")}
      </h4>
      <div className="space-y-2">
        <input
          type="number"
          value={minInput}
          onChange={(e) => setMinInput(e.target.value)}
          placeholder={`${t("products.priceFrom")} ${placeholderMin}`}
          className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:border-blue-500 focus:outline-none"
        />
        <input
          type="number"
          value={maxInput}
          onChange={(e) => setMaxInput(e.target.value)}
          placeholder={`${t("products.priceTo")} ${placeholderMax}`}
          className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:border-blue-500 focus:outline-none"
        />
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => onApply(minInput || undefined, maxInput || undefined)}
        >
          {t("products.apply")}
        </Button>
      </div>
    </div>
  );
}
