"use client";
import { Star } from "lucide-react";
import { useTranslation } from "@/hooks";
import { cleanProvinceName } from "@/shared/lib/address-utils";
import { FacetSection, PriceFilter } from "./CatalogControls";

interface FilterItem {
  id: string;
  label: string;
  count: number;
  selected: boolean;
}
interface Province {
  code: string;
  name: string;
  nameEn?: string | null;
}
interface Props {
  onSale: boolean;
  categoryItems: FilterItem[];
  brandItems: FilterItem[];
  provinces: Province[];
  provinceCodes: string[];
  rating?: number;
  priceMin: string | null;
  priceMax: string | null;
  priceBounds: { min: number | null; max: number | null } | null;
  attributes: Record<string, Record<string, number>>;
  onSaleChange: () => void;
  onCategory: (id: string) => void;
  onBrand: (id: string) => void;
  onProvince: (code: string) => void;
  onRating: (rating: number) => void;
  onPrice: (min?: string, max?: string) => void;
}

export default function CatalogSidebar(props: Props) {
  const { t, locale } = useTranslation();
  return (
    <aside className="hidden lg:block w-64 flex-shrink-0">
      <div className="relative bg-gradient-to-br from-purple-900 via-indigo-950 to-purple-950 rounded-2xl border border-purple-800/60 p-5 space-y-6 shadow-xl shadow-purple-950/20 text-white overflow-hidden">
        {/* Ambient subtle glows matching FlashSale theme */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-purple-600/25 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-fuchsia-600/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <h3 className="font-bold text-white text-base tracking-wide">{t("products.filters")}</h3>
        </div>

        <label className="relative z-10 flex items-center gap-2.5 text-sm cursor-pointer font-medium text-purple-200 hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={props.onSale}
            onChange={props.onSaleChange}
            className="rounded border-purple-500/40 text-purple-600 focus:ring-purple-400 accent-purple-500 cursor-pointer bg-purple-950/50"
          />
          {t("products.onSale")}
        </label>

        <FacetSection
          title={t("products.category")}
          emptyHint={t("products.noCategoriesFound")}
          items={props.categoryItems}
          onToggle={props.onCategory}
        />

        <FacetSection
          title={t("products.brand")}
          emptyHint={t("products.noBrandsFound")}
          items={props.brandItems}
          onToggle={props.onBrand}
        />

        <div className="relative z-10 border-t border-purple-800/50 pt-4">
          <h4 className="text-sm font-bold text-purple-100 mb-2">
            {t("products.location")}
          </h4>
          <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {props.provinces.map((province, index) => (
              <li key={`${province.code}-${index}`}>
                <label className="flex items-center gap-2 text-sm text-purple-200 hover:text-white cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={props.provinceCodes.includes(province.code)}
                    onChange={() => props.onProvince(province.code)}
                    className="rounded border-purple-500/40 text-purple-600 focus:ring-purple-400 accent-purple-500 cursor-pointer bg-purple-950/50"
                  />
                  {cleanProvinceName(
                    locale === "en" && province.nameEn
                      ? province.nameEn
                      : province.name,
                  )}
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 border-t border-purple-800/50 pt-4">
          <h4 className="text-sm font-bold text-purple-100 mb-2">{t("products.rating")}</h4>
          {[5, 4, 3, 2, 1].map((stars) => (
            <button
              key={stars}
              onClick={() => props.onRating(stars)}
              className={`flex items-center gap-2 text-sm w-full p-2 rounded-xl transition-all cursor-pointer ${
                props.rating === stars
                  ? "bg-purple-600 text-white font-bold shadow-md shadow-purple-600/40"
                  : "text-purple-200 hover:bg-purple-800/40 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    size={13}
                    className={
                      index < stars
                        ? "fill-amber-400 text-amber-400"
                        : "text-purple-300/30"
                    }
                  />
                ))}
              </div>
              <span className="text-xs">{stars === 5 ? "5 sao" : `${stars}+ sao`}</span>
            </button>
          ))}
        </div>

        <PriceFilter
          key={`${props.priceMin}:${props.priceMax}`}
          priceMin={props.priceMin}
          priceMax={props.priceMax}
          bounds={props.priceBounds}
          onApply={props.onPrice}
          t={t}
        />

        {Object.entries(props.attributes).map(([key, values]) => (
          <FacetSection
            key={key}
            title={key}
            emptyHint=""
            items={Object.entries(values)
              .map(([value, count]) => ({
                id: value,
                label: value,
                count,
                selected: false,
              }))
              .sort((a, b) => b.count - a.count)}
            onToggle={() => undefined}
          />
        ))}
      </div>
    </aside>
  );
}
