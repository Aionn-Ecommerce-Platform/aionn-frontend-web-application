"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Store, MapPin, Loader2, Calendar } from "lucide-react";
import { useTranslation } from "@/hooks";
import { formatMonthYear } from "@/shared/lib/utils";
import { merchantService, geographyService } from "@/lib/services";
import { EmptyState } from "@/shared/ui";
import { cleanProvinceName } from "@/shared/lib/address-utils";

export default function MerchantsPage() {
  const { t, locale } = useTranslation();

  const {
    data: merchants,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["merchants", "list"],
    queryFn: async () => {
      const res = await merchantService.list(0, 50);
      return res ?? [];
    },
  });

  const { data: provinces } = useQuery({
    queryKey: ["geography", "provinces", "VN"],
    queryFn: () => geographyService.listProvinces("VN"),
    staleTime: 60 * 60_000,
  });

  const provinceNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    (provinces ?? []).forEach((p) => {
      const name = locale === "en" && p.nameEn ? p.nameEn : p.name;
      m.set(p.code, cleanProvinceName(name));
    });
    return m;
  }, [provinces, locale]);

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            {t("merchants.title")}
          </h1>
        </div>

        {isLoading && (
          <div className="min-h-[40vh] flex items-center justify-center">
            <Loader2 className="animate-spin text-gray-950" size={32} />
          </div>
        )}

        {error && (
          <EmptyState
            icon={Store}
            title={t("merchants.errorLoading")}
            description={t("merchants.errorLoadingDesc")}
          />
        )}

        {!isLoading && !error && (!merchants || merchants.length === 0) && (
          <EmptyState
            icon={Store}
            title={t("merchants.emptyTitle")}
            description={t("merchants.emptyDesc")}
          />
        )}

        {!isLoading && !error && merchants && merchants.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {merchants.map((merchant) => {
              const initial = merchant.name?.charAt(0).toUpperCase() ?? "M";

              const formattedDate = merchant.createdAt
                ? formatMonthYear(merchant.createdAt, locale)
                : t("merchants.yearsAgo");

              const displayProvince = merchant.provinceCode
                ? provinceNameByCode.get(merchant.provinceCode)
                : merchant.provinceName
                  ? cleanProvinceName(merchant.provinceName)
                  : undefined;

              return (
                <div
                  key={merchant.merchantId}
                  className="bg-white rounded-2xl border border-gray-400 hover:border-gray-950 shadow-xs hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between group"
                >
                  <div className="p-6">
                    <div className="flex items-center gap-4">
                      {merchant.logoUrl ? (
                        <div className="w-14 h-14 relative rounded-full overflow-hidden border border-gray-200 shadow-2xs shrink-0">
                          <Image
                            src={merchant.logoUrl}
                            alt={merchant.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gray-950 flex items-center justify-center text-white text-xl font-bold shadow-2xs shrink-0">
                          {initial}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-900 group-hover:text-black transition-colors truncate">
                          {merchant.name}
                        </h2>
                        {displayProvince && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 font-medium">
                            <MapPin size={12} className="text-gray-400 shrink-0" />
                            <span className="truncate">{displayProvince}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mt-4 line-clamp-3 min-h-[3.75rem] leading-relaxed">
                      {merchant.description || t("merchants.noDescription")}
                    </p>
                  </div>

                  <div className="relative overflow-hidden px-6 py-4 bg-gradient-to-br from-purple-900 via-indigo-950 to-purple-950 border-t border-purple-800/40 flex items-center justify-between text-xs text-purple-200">
                    <div className="absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-fuchsia-600/20 blur-2xl pointer-events-none" />
                    <span className="relative z-10 flex items-center gap-1.5 font-medium">
                      <Calendar size={13} className="text-purple-300" />
                      {t("merchants.activeSince")} {formattedDate}
                    </span>
                    <Link href={`/merchants/${merchant.merchantId}`} className="relative z-10">
                      <button
                        type="button"
                        className="px-4 py-1.5 text-xs font-semibold rounded-full border border-white/20 bg-white/10 text-white hover:bg-white hover:text-purple-950 transition-all shadow-xs cursor-pointer"
                      >
                        {t("merchants.visit")}
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
