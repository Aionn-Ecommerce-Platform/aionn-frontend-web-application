"use client";

import Link from "next/link";
import Image from "next/image";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Store,
  MapPin,
  Loader2,
  Calendar,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import { useTranslation } from "@/hooks";
import { formatMonthYear } from "@/shared/lib/utils";
import { merchantService, geographyService } from "@/lib/services";
import { EmptyState, Pagination } from "@/shared/ui";
import { cleanProvinceName } from "@/shared/lib/address-utils";

const MERCHANT_PAGE_SIZE = 12;

function CountUp({
  value,
  suffix = "",
}: Readonly<{ value: number; suffix?: string }>) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reducedMotion ? 0 : 900;

    let frame = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress =
        duration <= 0 ? 1 : Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    // Background tabs pause requestAnimationFrame; make sure the final value
    // still lands even if the counter never paints a frame.
    const settle = window.setTimeout(() => setDisplay(value), duration + 120);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [value]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

export default function MerchantsPage() {
  const { t, locale } = useTranslation();
  const [selectedProvince, setSelectedProvince] = useState("all");
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const deferredSearch = useDeferredValue(searchTerm);
  const provinceDropdownRef = useRef<HTMLDivElement>(null);
  const provinceTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!provinceOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!provinceDropdownRef.current?.contains(event.target as Node)) {
        setProvinceOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProvinceOpen(false);
        provinceTriggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [provinceOpen]);

  const {
    data: merchantPage,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "merchants",
      "list",
      currentPage,
      deferredSearch,
      selectedProvince,
    ],
    queryFn: () =>
      merchantService.listPaged(currentPage - 1, MERCHANT_PAGE_SIZE, {
        search: deferredSearch.trim() || undefined,
        provinceCode: selectedProvince === "all" ? undefined : selectedProvince,
      }),
  });
  const merchants = useMemo(() => merchantPage?.content ?? [], [merchantPage]);
  const totalMerchants = merchantPage?.totalElements ?? 0;

  const { data: provinces } = useQuery({
    queryKey: ["geography", "provinces", "VN", "v2"],
    queryFn: () => geographyService.listProvinces("VN"),
    staleTime: 60 * 60_000,
  });

  const activeProvinces = useMemo(
    () => (provinces ?? []).filter((p) => !p.code.startsWith("VN-")),
    [provinces],
  );

  const provinceNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    activeProvinces.forEach((p) => {
      const name = locale === "en" && p.nameEn ? p.nameEn : p.name;
      m.set(p.code, cleanProvinceName(name));
    });
    return m;
  }, [activeProvinces, locale]);

  const provinceOptions = useMemo(
    () =>
      activeProvinces
        .map((province) => ({
          key: province.code,
          label: provinceNameByCode.get(province.code) ?? province.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [activeProvinces, locale, provinceNameByCode],
  );

  const totalPages = Math.max(1, merchantPage?.totalPages ?? 1);
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const visibleMerchants = merchants;

  const selectedProvinceOption = provinceOptions.find(
    (option) => option.key === selectedProvince,
  );
  const provinceButtonLabel = selectedProvinceOption
    ? selectedProvinceOption.label
    : `${t("merchants.allProvinces")} (${totalMerchants})`;

  return (
    <div className="relative bg-transparent min-h-screen pb-16">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            {t("merchants.title")}
          </h1>
        </div>

        <section className="relative overflow-hidden">
          <div className="grid items-center gap-4 md:grid-cols-[1.15fr_0.85fr]">
            <div className="relative h-[340px] w-full sm:h-[460px] md:h-[620px]">
              <Image
                src="/images/provinceovervn.png"
                alt={t("merchants.heroImageAlt")}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 60vw"
                className="scale-[1.08] object-contain"
                style={{
                  maskImage:
                    "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 6%, #000 14%, #000 86%, rgba(0,0,0,0.5) 94%, transparent 100%), linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 4%, #000 8%, #000 92%, rgba(0,0,0,0.5) 96%, transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 6%, #000 14%, #000 86%, rgba(0,0,0,0.5) 94%, transparent 100%), linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 4%, #000 8%, #000 92%, rgba(0,0,0,0.5) 96%, transparent 100%)",
                  maskComposite: "intersect",
                  WebkitMaskComposite: "source-in",
                  mixBlendMode: "darken",
                }}
              />
            </div>
            <div className="flex flex-col justify-center p-2 sm:p-6 md:p-8">
              <h2 className="text-2xl font-extrabold tracking-tight text-gray-950 sm:text-3xl">
                {t("merchants.heroTitle")}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
                {t("merchants.heroDesc")}
              </p>
              <div className="mt-8 flex w-full items-center justify-center gap-12">
                <div className="text-center">
                  <div className="text-4xl font-black text-brand sm:text-5xl">
                    <CountUp value={totalMerchants} suffix="+" />
                  </div>
                  <div className="mt-1 text-sm font-medium text-gray-500">
                    {t("merchants.heroMerchants")}
                  </div>
                </div>
                <div className="h-12 w-px bg-gray-300" />
                <div className="text-center">
                  <div className="text-4xl font-black text-brand sm:text-5xl">
                    <CountUp
                      value={
                        provinceOptions.filter(
                          (option) => option.key !== "unknown",
                        ).length
                      }
                    />
                  </div>
                  <div className="mt-1 text-sm font-medium text-gray-500">
                    {t("merchants.heroProvinces")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!isLoading && !error && (merchants?.length ?? 0) > 0 && (
          <div
            id="merchant-list"
            className="flex flex-col gap-3 scroll-mt-24 sm:flex-row sm:items-center"
          >
            <div
              ref={provinceDropdownRef}
              className="relative w-full shrink-0 sm:w-64 lg:w-72"
            >
              <button
                ref={provinceTriggerRef}
                type="button"
                onClick={() => setProvinceOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={provinceOpen}
                className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-full border border-gray-950 bg-white px-4 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <span className="truncate">{provinceButtonLabel}</span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition-transform duration-200 ${
                    provinceOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {provinceOpen && (
                <ul
                  role="listbox"
                  aria-label={t("merchants.allProvinces")}
                  className="absolute left-0 z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-gray-400 bg-white p-1.5 shadow-xl"
                >
                  <li>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedProvince === "all"}
                      onClick={() => {
                        setSelectedProvince("all");
                        setCurrentPage(1);
                        setProvinceOpen(false);
                        provinceTriggerRef.current?.focus();
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors sm:text-sm ${
                        selectedProvince === "all"
                          ? "bg-gray-950 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span>{t("merchants.allProvinces")}</span>
                      <span className="text-[11px] opacity-60">
                        {totalMerchants}
                      </span>
                    </button>
                  </li>
                  {provinceOptions.map((option) => {
                    const active = option.key === selectedProvince;
                    return (
                      <li key={option.key}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            setSelectedProvince(option.key);
                            setCurrentPage(1);
                            setProvinceOpen(false);
                            provinceTriggerRef.current?.focus();
                          }}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors sm:text-sm ${
                            active
                              ? "bg-gray-950 text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <span className="truncate">{option.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="relative w-full sm:flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-950"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t("merchants.searchPlaceholder")}
                aria-label={t("merchants.searchPlaceholder")}
                className="h-10 w-full rounded-full border border-gray-950 bg-white pl-10 pr-10 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-thin transition-colors focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  aria-label={t("merchants.clearSearch")}
                  className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

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

        {!isLoading &&
          !error &&
          (merchants?.length ?? 0) > 0 &&
          visibleMerchants.length === 0 && (
            <EmptyState
              icon={Search}
              title={t("merchants.noResultsTitle")}
              description={t("merchants.noResultsDesc")}
              iconWrapperClassName="bg-transparent"
              iconClassName="text-gray-950"
              iconSize={40}
            />
          )}

        {!isLoading && !error && visibleMerchants.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visibleMerchants.map((merchant) => {
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
                  <Link
                    key={merchant.merchantId}
                    href={`/merchants/${merchant.merchantId}`}
                    className="group flex cursor-pointer flex-col justify-between rounded-lg border border-gray-400 bg-white p-4 transition-colors hover:border-gray-950"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        {merchant.logoUrl ? (
                          <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-full border border-gray-200">
                            <Image
                              src={merchant.logoUrl}
                              alt={merchant.name}
                              fill
                              sizes="60px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-gray-950 text-lg font-bold text-white">
                            {initial}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-bold text-gray-900 transition-colors group-hover:text-black">
                            {merchant.name}
                          </h2>
                          {displayProvince && (
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-gray-500">
                              <MapPin
                                size={11}
                                className="shrink-0 text-red-500"
                              />
                              <span className="truncate">
                                {displayProvince}
                              </span>
                            </p>
                          )}
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-gray-500">
                            <Calendar
                              size={11}
                              className="shrink-0 text-amber-500"
                            />
                            {formattedDate}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-600">
                        {merchant.description || t("merchants.noDescription")}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={(page) => {
                setCurrentPage(page);
                document
                  .getElementById("merchant-list")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              scrollToTop={false}
              ariaLabel={t("common.pagination")}
            />
          </>
        )}
      </div>
    </div>
  );
}
