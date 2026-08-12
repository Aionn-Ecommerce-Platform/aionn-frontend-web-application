"use client";

import { AppImage } from "@/shared/ui";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ticket, Clock, Zap, Gift, Loader2, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { Button, EmptyState } from "@/shared/ui";
import {
  campaignService,
  voucherService,
  shopVoucherService,
  merchantService,
} from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth.store";
import { getErrorMessage } from "@/shared/lib/errors";
import { logger } from "@/shared/lib/logger";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks";
import type { UserVoucher } from "@/types";

interface ExtendedVoucher {
  voucherCode: string;
  campaignId: string | null;
  scope: "PLATFORM" | "SHOP";
  merchantId: string | null;
  discountAmount: number;
  currency: string;
  usageLimit: number;
  usedCount: number;
  reservedCount: number;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;

  campaignName?: string;
  campaignType?: string;
  minOrderValue?: number;
  merchantName?: string;
  merchantLogo?: string;
}

export default function PromotionsPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "ALL" | "PLATFORM" | "SHOP" | "MINE"
  >("ALL");
  const [claimingVoucherCode, setClaimingVoucherCode] = useState<string | null>(
    null,
  );

  const {
    data: campaigns,
    isLoading: loadingCamp,
    isError: campaignsError,
    refetch: refetchCampaigns,
  } = useQuery({
    queryKey: qk.campaigns("RUNNING"),
    queryFn: () => campaignService.listByStatus("RUNNING", 20),
    staleTime: 30000,
  });

  const { data: myVouchers, isLoading: loadingMine } = useQuery({
    queryKey: qk.myVouchers(),
    queryFn: () => voucherService.listMine(100),
    enabled: isAuthenticated,
  });

  const {
    data: allVouchers,
    isLoading: loadingVouchers,
    isError: vouchersError,
    refetch: refetchVouchers,
  } = useQuery({
    queryKey: [
      "all-available-vouchers",
      campaigns?.map((c) => c.campaignId).join(","),
    ],
    queryFn: async (): Promise<ExtendedVoucher[]> => {
      if (!campaigns) return [];

      const platformPromises = campaigns.map(async (camp) => {
        try {
          const vouchers = await campaignService.listVouchers(
            camp.campaignId,
            50,
          );
          return vouchers.map((v) => ({
            ...v,
            campaignName: camp.name,
            campaignType: camp.type,
            minOrderValue: camp.minOrderValue ?? 0,
          }));
        } catch (err) {
          logger.error(
            `Failed to load vouchers for campaign ${camp.campaignId}`,
            err,
          );
          return [];
        }
      });

      let shopVouchers: ExtendedVoucher[] = [];
      try {
        const merchants = await merchantService.list(0, 50);
        if (merchants && merchants.length > 0) {
          const merchantPromises = merchants.map(async (merchant) => {
            try {
              const vouchers = await shopVoucherService.listByMerchant(
                merchant.merchantId,
                50,
              );
              return vouchers.map((v) => ({
                ...v,
                merchantName: merchant.name,
                merchantLogo: merchant.logoUrl || undefined,
                campaignName: merchant.name,
                minOrderValue: 0,
              }));
            } catch (err) {
              logger.error(
                `Failed to load vouchers for merchant ${merchant.merchantId}`,
                err,
              );
              return [];
            }
          });
          const merchantVoucherLists = await Promise.all(merchantPromises);
          shopVouchers = merchantVoucherLists.flat();
        }
      } catch (err) {
        logger.error("Failed to load merchants list", err);
      }

      const platformVouchers = (await Promise.all(platformPromises)).flat();
      return [...platformVouchers, ...shopVouchers];
    },
    enabled: !!campaigns,
    staleTime: 30000,
  });

  const claimMutation = useMutation({
    mutationFn: (code: string) => voucherService.claim(code),
    onMutate: (code) => {
      setClaimingVoucherCode(code);
    },
    onSuccess: (claimedVoucher, code) => {
      qc.setQueriesData<ExtendedVoucher[]>(
        { queryKey: ["all-available-vouchers"] },
        (old) =>
          old?.map((voucher) =>
            voucher.voucherCode === code
              ? {
                  ...voucher,
                  usedCount: Math.min(
                    voucher.usedCount + 1,
                    voucher.usageLimit,
                  ),
                }
              : voucher,
          ),
      );
      qc.setQueryData<UserVoucher[]>(qk.myVouchers(), (old) => {
        if (!old) return [claimedVoucher];
        if (old.some((voucher) => voucher.voucherCode === code)) return old;
        return [...old, claimedVoucher];
      });
      toast.success(t("promotions.claimedSuccess"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
    onSettled: () => {
      setClaimingVoucherCode(null);
    },
  });

  const claimedCodes = new Set(myVouchers?.map((v) => v.voucherCode) ?? []);

  let displayedVouchers: ExtendedVoucher[] = [];
  if (activeTab === "ALL") {
    displayedVouchers = allVouchers ?? [];
  } else if (activeTab === "PLATFORM") {
    displayedVouchers = (allVouchers ?? []).filter(
      (v) => v.scope === "PLATFORM",
    );
  } else if (activeTab === "SHOP") {
    displayedVouchers = (allVouchers ?? []).filter((v) => v.scope === "SHOP");
  } else if (activeTab === "MINE") {
    const activeVouchersMap = new Map(
      (allVouchers ?? []).map((v) => [v.voucherCode, v]),
    );
    displayedVouchers = (myVouchers ?? []).map((mv) => {
      const activeInfo = activeVouchersMap.get(mv.voucherCode);
      if (activeInfo) {
        return activeInfo;
      }

      return {
        voucherCode: mv.voucherCode,
        campaignId: null,
        scope: "PLATFORM" as const,
        merchantId: null,
        discountAmount: mv.appliedAmount ?? 0,
        currency: mv.currency ?? "VND",
        usageLimit: 1,
        usedCount: mv.status === "APPLIED" ? 1 : 0,
        reservedCount: 0,
        validFrom: null,
        validUntil: mv.reservedExpiresAt || null,
        createdAt: mv.claimedAt,
        updatedAt: mv.updatedAt,
        campaignName:
          mv.status === "APPLIED"
            ? t("promotions.used")
            : t("promotions.saved"),
      };
    });
  }

  const allCount = allVouchers?.length ?? 0;
  const platformCount =
    allVouchers?.filter((v) => v.scope === "PLATFORM").length ?? 0;
  const shopCount = allVouchers?.filter((v) => v.scope === "SHOP").length ?? 0;
  const mineCount = myVouchers?.length ?? 0;

  const handleRetryAll = () => {
    refetchCampaigns();
    refetchVouchers();
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex border border-gray-400 p-1 mb-8 bg-white rounded-xl shadow-sm overflow-x-auto whitespace-nowrap">
          {[
            { id: "ALL", label: `${t("promotions.tabAll")} (${allCount})` },
            {
              id: "PLATFORM",
              label: `${t("promotions.platformLabel")} (${platformCount})`,
            },
            { id: "SHOP", label: `${t("promotions.tabShop")} (${shopCount})` },
            {
              id: "MINE",
              label: `${t("promotions.tabMine")} (${isAuthenticated ? mineCount : 0})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === "MINE" && !isAuthenticated) {
                  router.push("/auth/login?redirect=/promotions");
                  return;
                }
                setActiveTab(tab.id as typeof activeTab);
              }}
              className={`flex-1 py-3 px-4 text-center text-sm font-bold rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg--commerce text-white shadow-md scale-[1.02]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loadingCamp || loadingVouchers || (isAuthenticated && loadingMine) ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text--commerce" size={40} />
            <p className="text-gray-500 text-sm font-medium animate-pulse">
              {t("promotions.loadingVouchers")}
            </p>
          </div>
        ) : campaignsError || vouchersError ? (
          <EmptyState
            icon={Gift}
            title={t("promotions.loadFailed")}
            description={t("promotions.loadFailedDesc")}
            action={
              <Button
                variant="outline"
                onClick={handleRetryAll}
                className="border--commerce text--commerce hover:bg-orange-50"
              >
                {t("common.retry")}
              </Button>
            }
          />
        ) : displayedVouchers.length === 0 ? (
          <div className="py-12 bg-white rounded-2xl border border-gray-400 p-8 shadow-sm">
            {activeTab === "MINE" ? (
              <EmptyState
                icon={Ticket}
                title={t("promotions.emptyMyVouchers")}
                description={t("promotions.emptyMyVouchersDesc")}
                action={
                  <Button
                    onClick={() => setActiveTab("ALL")}
                    className="bg--commerce hover:bg--commerce-strong text-white font-bold"
                  >
                    {t("promotions.tabAll")}{" "}
                    <ArrowRight size={16} className="ml-1" />
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Ticket}
                title={t("promotions.noVouchers")}
                description={t("promotions.noCampaignsDesc")}
              />
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedVouchers.map((v) => {
              const isClaimed = claimedCodes.has(v.voucherCode);
              const isFreeship = v.voucherCode
                .toLowerCase()
                .includes("freeship");
              const isShop = v.scope === "SHOP";

              let leftBgColor = "bg--commerce";
              let leftTagText = t("promotions.platformLabel");
              if (isFreeship) {
                leftBgColor = "bg--shipping";
                leftTagText = t("promotions.freeshipLabel");
              } else if (isShop) {
                leftBgColor = "bg--shop";
                leftTagText = t("promotions.tabShop");
              }

              const expiryString = v.validUntil
                ? formatDate(v.validUntil, locale)
                : "N/A";

              const progressPercent =
                v.usageLimit > 0 ? (v.usedCount / v.usageLimit) * 100 : 0;
              const remainingClaims = Math.max(v.usageLimit - v.usedCount, 0);
              const isSoldOut = remainingClaims <= 0;
              const isClaiming = claimingVoucherCode === v.voucherCode;

              return (
                <div
                  key={v.voucherCode}
                  className="relative flex bg-white border border-gray-400 rounded-xl hover:shadow-lg transition-all group min-h-[128px]"
                >
                  <div className="absolute top-0 left-28 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-50 border border-gray-400 z-10" />
                  <div className="absolute bottom-0 left-28 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-gray-50 border border-gray-400 z-10" />

                  <div
                    className={`w-28 flex flex-col items-center justify-center text-white px-2 text-center select-none shrink-0 relative ${leftBgColor}`}
                  >
                    {isShop && v.merchantLogo ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/50 bg-white mb-1 shadow">
                        <AppImage
                          src={v.merchantLogo}
                          alt={v.merchantName || "Merchant Logo"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-1">
                        {isFreeship ? (
                          <Zap
                            size={20}
                            className="text-yellow-300 fill-yellow-300"
                          />
                        ) : (
                          <Ticket size={20} className="text-white" />
                        )}
                      </div>
                    )}
                    <span className="text-xs font-black tracking-wide uppercase truncate max-w-full drop-shadow">
                      {isShop ? v.merchantName || leftTagText : leftTagText}
                    </span>
                    <span className="text-[9px] opacity-80 font-mono mt-0.5">
                      {v.scope}
                    </span>
                  </div>

                  <div className="flex-1 flex items-center justify-between py-5 px-5 pl-6 border-l border-dashed border-gray-400 relative">
                    <div className="flex-1 pr-3">
                      <h3 className="text-base font-extrabold text-gray-900 leading-tight mb-2">
                        {t("promotions.discountAmount", {
                          amount: formatCurrency(v.discountAmount, v.currency),
                        })}
                      </h3>

                      <div className="mt-1.5 space-y-1 text-xs text-gray-500">
                        {v.minOrderValue && v.minOrderValue > 0 ? (
                          <p className="font-semibold text-gray-800">
                            {t("promotions.minOrder", {
                              min: formatCurrency(v.minOrderValue, v.currency),
                            })}
                          </p>
                        ) : null}
                        <p className="font-semibold text-gray-800">
                          {locale === "vi"
                            ? `${t("promotions.voucherCodeLabel")}: ${v.voucherCode}`
                            : `Code: ${v.voucherCode}`}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock size={11} />
                          <span>
                            {t("promotions.validUntil", { date: expiryString })}
                          </span>
                        </div>
                        {v.usageLimit > 0 && (
                          <div
                            className={`text-[11px] font-bold mt-1 ${
                              isFreeship
                                ? "text--shipping"
                                : isShop
                                  ? "text--shop"
                                  : "text--commerce"
                            }`}
                          >
                            {t("promotions.stockLeft", {
                              count: remainingClaims,
                            })}
                          </div>
                        )}
                      </div>

                      {v.usageLimit > 0 && (
                        <div className="mt-3.5">
                          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isFreeship
                                  ? "bg--shipping"
                                  : isShop
                                    ? "bg--shop"
                                    : "bg--commerce"
                              }`}
                              style={{
                                width: `${Math.min(progressPercent, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      {isSoldOut ? (
                        <button
                          disabled
                          className="bg-gray-100 border border-gray-300 text-gray-400 font-extrabold px-6 py-2.5 text-sm rounded-xl min-w-[100px] cursor-not-allowed"
                        >
                          {t("promotions.fullyClaimed")}
                        </button>
                      ) : isClaimed ? (
                        <button
                          onClick={() => router.push("/products")}
                          className="bg-white font-extrabold px-6 py-2.5 text-sm rounded-xl border-2 border--commerce text--commerce hover:bg--commerce hover:text-white shadow-sm transition-all duration-200 cursor-pointer min-w-[100px] flex items-center justify-center"
                        >
                          {t("promotions.useNow")}
                        </button>
                      ) : (
                        <button
                          disabled={isClaiming}
                          onClick={() => {
                            if (!isAuthenticated) {
                              router.push("/auth/login?redirect=/promotions");
                              return;
                            }
                            claimMutation.mutate(v.voucherCode);
                          }}
                          className="bg-white font-extrabold px-6 py-2.5 text-sm rounded-xl border-2 border--commerce text--commerce hover:bg--commerce hover:text-white shadow-sm transition-all duration-200 cursor-pointer min-w-[100px] flex items-center justify-center"
                        >
                          {isClaiming ? (
                            <Loader2
                              className="animate-spin text--commerce"
                              size={16}
                            />
                          ) : (
                            t("promotions.save")
                          )}
                        </button>
                      )}
                    </div>
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
