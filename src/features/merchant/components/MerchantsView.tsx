"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Store, MapPin, Loader2, Calendar } from "lucide-react";
import { useTranslation } from "@/hooks";
import { formatMonthYear } from "@/shared/lib/utils";
import { merchantService, geographyService } from "@/lib/services";
import { Button, EmptyState } from "@/shared/ui";
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
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Store className="text-blue-600" size={28} />
            {t("merchants.title")}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {t("merchants.subtitle")}
          </p>
        </div>

        {isLoading && (
          <div className="min-h-[40vh] flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" size={32} />
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
                  className="bg-white rounded-2xl border border-gray-400 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="p-6">
                    <div className="flex items-center gap-4">
                      {merchant.logoUrl ? (
                        <div className="w-14 h-14 relative rounded-full overflow-hidden border border-gray-250">
                          <Image
                            src={merchant.logoUrl}
                            alt={merchant.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-sm">
                          {initial}
                        </div>
                      )}
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {merchant.name}
                        </h2>
                        {displayProvince && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin size={12} className="text-gray-400" />
                            {displayProvince}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mt-4 line-clamp-3 min-h-[3.75rem] leading-relaxed">
                      {merchant.description || t("merchants.noDescription")}
                    </p>
                  </div>

                  <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {t("merchants.activeSince")} {formattedDate}
                    </span>
                    <Link href={`/merchants/${merchant.merchantId}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-400 font-semibold"
                      >
                        {t("merchants.visit")}
                      </Button>
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
