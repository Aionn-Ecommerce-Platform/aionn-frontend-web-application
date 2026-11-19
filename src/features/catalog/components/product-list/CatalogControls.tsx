"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useTranslation } from "@/hooks";
import { formatCurrency } from "@/shared/lib/utils";
import type { ProductSort } from "@/types";

export function QuickSortTabs({
  value,
  onChange,
  t,
}: {
  value: ProductSort;
  onChange: (val: ProductSort) => void;
  t: (key: string) => string;
}) {
  const tabs = [
    { value: "RELEVANCE", label: t("products.sortPopular") },
    { value: "NEWEST", label: t("products.sortNewest") },
    { value: "BEST_SELLER", label: t("products.sortBestSeller") },
  ] as const;

  const priceOptions = [
    {
      value: "PRICE_ASC" as const,
      label: t("products.sortPriceAsc"),
    },
    {
      value: "PRICE_DESC" as const,
      label: t("products.sortPriceDesc"),
    },
  ];

  const [priceOpen, setPriceOpen] = useState(false);
  const priceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!priceOpen) return;
    const onClick = (e: MouseEvent) => {
      if (priceRef.current && !priceRef.current.contains(e.target as Node)) {
        setPriceOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [priceOpen]);

  const activePrice = priceOptions.find((o) => o.value === value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value as ProductSort)}
            className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-150 cursor-pointer ${
              active
                ? "bg-gray-950 text-white border border-gray-950 shadow-xs"
                : "bg-white text-gray-800 border border-gray-950 hover:bg-gray-100 hover:text-black"
            }`}
          >
            {tab.label}
          </button>
        );
      })}

      {/* Price sort dropdown - matches the merchant province dropdown style */}
      <div className="relative" ref={priceRef}>
        <button
          type="button"
          onClick={() => setPriceOpen((v) => !v)}
          className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-gray-950 bg-white px-3.5 py-1.5 text-xs font-semibold transition-colors hover:bg-gray-50 sm:text-sm ${
            activePrice ? "text-gray-950" : "text-gray-800"
          }`}
          aria-expanded={priceOpen}
          aria-haspopup="listbox"
        >
          <span>
            {activePrice ? activePrice.label : t("products.sortPrice")}
          </span>
          <ChevronDown
            size={14}
            className={`text-gray-700 transition-transform ${priceOpen ? "rotate-180" : ""}`}
          />
        </button>

        {priceOpen && (
          <div className="absolute left-0 z-50 mt-2 w-48 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl">
            {priceOptions.map((opt) => {
              const active = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setPriceOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors sm:text-sm ${
                    active
                      ? "bg-gray-950 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="flex-1 text-left">{opt.label}</span>
                  {active && (
                    <Check size={14} className="shrink-0 text-white" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
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
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-white text-purple-900 hover:bg-purple-100 hover:text-purple-950 transition-colors cursor-pointer shadow-sm"
    >
      <span>{label}</span>
      <X size={12} className="text-purple-500" />
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
    <div className="relative z-10 border-t border-amber-400/70 pt-4">
      <h4 className="text-sm font-bold text-purple-100 mb-2">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-purple-300/60">{emptyHint}</p>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((item, index) => (
            <li key={`${item.id}-${index}`}>
              <label className="flex items-center justify-between text-sm cursor-pointer hover:text-white group">
                <span className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    aria-label={item.label}
                    checked={item.selected}
                    onChange={() => onToggle(item.id)}
                    className="rounded border-purple-500/40 text-purple-600 focus:ring-purple-400 accent-purple-500 cursor-pointer bg-purple-950/50"
                  />
                  <span className="truncate text-purple-200 group-hover:text-white font-medium">
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
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
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
    <div className="relative z-10 border-t border-amber-400/70 pt-4">
      <h4 className="text-sm font-bold text-purple-100 mb-2">
        {t("products.priceRange")}
      </h4>
      <div className="space-y-2">
        <input
          type="number"
          value={minInput}
          onChange={(e) => setMinInput(e.target.value)}
          placeholder={`${t("products.priceFrom")} ${placeholderMin}`}
          className="w-full px-3 py-2 text-xs border border-purple-400/70 bg-purple-950/60 text-white placeholder:text-purple-200/70 rounded-xl focus:border-purple-300 focus:outline-none transition-colors"
        />
        <input
          type="number"
          value={maxInput}
          onChange={(e) => setMaxInput(e.target.value)}
          placeholder={`${t("products.priceTo")} ${placeholderMax}`}
          className="w-full px-3 py-2 text-xs border border-purple-400/70 bg-purple-950/60 text-white placeholder:text-purple-200/70 rounded-xl focus:border-purple-300 focus:outline-none transition-colors"
        />
        <button
          type="button"
          onClick={() => onApply(minInput || undefined, maxInput || undefined)}
          className="w-full py-1.5 text-xs font-semibold rounded-full border border-purple-400/60 bg-purple-700/60 text-white hover:bg-purple-600 hover:border-purple-300 transition-all shadow-xs cursor-pointer"
        >
          {t("products.apply")}
        </button>
      </div>
    </div>
  );
}
