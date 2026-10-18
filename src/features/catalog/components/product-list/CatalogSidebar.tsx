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
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 space-y-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <h3 className="font-bold text-gray-950 text-base">{t("products.filters")}</h3>
        <label className="flex items-center gap-2.5 text-sm cursor-pointer font-medium text-gray-800 hover:text-brand transition-colors">
          <input
            type="checkbox"
            checked={props.onSale}
            onChange={props.onSaleChange}
            className="rounded border-gray-300 text-brand focus:ring-brand accent-brand cursor-pointer"
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
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-bold text-gray-900 mb-2">
            {t("products.location")}
          </h4>
          <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {props.provinces.map((province, index) => (
              <li key={`${province.code}-${index}`}>
                <label className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={props.provinceCodes.includes(province.code)}
                    onChange={() => props.onProvince(province.code)}
                    className="rounded border-gray-300 text-brand focus:ring-brand accent-brand cursor-pointer"
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
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-bold text-gray-900 mb-2">{t("products.rating")}</h4>
          {[5, 4, 3, 2, 1].map((stars) => (
            <button
              key={stars}
              onClick={() => props.onRating(stars)}
              className={`flex items-center gap-2 text-sm w-full p-2 rounded-xl transition-all cursor-pointer ${
                props.rating === stars
                  ? "bg-brand/10 text-brand font-bold"
                  : "text-gray-700 hover:bg-gray-100"
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
                        : "text-gray-200"
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
