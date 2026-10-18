"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  FileText,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, Switch as Toggle } from "@/shared/ui";
import Sidebar from "@/components/layout/Sidebar";
import AuthGuard from "@/components/auth/AuthGuard";
import { qk } from "@/lib/query-keys";
import { consentService } from "@/lib/services";
import type { ConsentResponse } from "@/lib/services/consent.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";

function PrivacyInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading: loading } = useQuery({
    queryKey: qk.consents,
    queryFn: () => consentService.getMyConsents(),
  });
  const refetch = () => qc.invalidateQueries({ queryKey: qk.consents });
  const [updating, setUpdating] = useState(false);

  const consentsMap = new Map<string, ConsentResponse>();
  data?.forEach((c) => consentsMap.set(c.consentType, c));

  const termsConsent = consentsMap.get("TERMS_OF_SERVICE");
  const privacyConsent = consentsMap.get("PRIVACY_POLICY");
  const marketingConsent = consentsMap.get("MARKETING");

  async function handleToggleMarketing(agreed: boolean) {
    setUpdating(true);
    try {
      await consentService.updateMarketing(agreed);
      toast.success(
        t(agreed ? "privacy.marketingEnabled" : "privacy.marketingDisabled"),
      );
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="member-page bg-gray-50/60 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex gap-8">
          <Sidebar />
          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
                {t("privacy.title")}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {locale === "en"
                  ? "Manage legal agreements, consent preferences, and your personal data rights."
                  : "Quản lý thỏa thuận pháp lý, sự đồng ý dữ liệu và các quyền riêng tư cá nhân của bạn."}
              </p>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-16 flex justify-center">
                <Loader2 className="animate-spin text-brand" size={32} />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 sm:p-7">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-bold text-gray-950">
                          {t("privacy.termsTitle")}
                        </h3>
                        {termsConsent?.agreed ? (
                          <Badge className="bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            {t("privacy.agreed")}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
                            <XCircle size={12} />
                            {t("privacy.notAgreed")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-3">
                        {t("privacy.termsDescription")}
                      </p>
                      {termsConsent && (
                        <div className="text-xs text-gray-400 space-y-1">
                          {termsConsent.version && (
                            <p>
                              {t("privacy.version", {
                                version: termsConsent.version,
                              })}
                            </p>
                          )}
                          <p>
                            {t("privacy.agreedAt", {
                              date: formatDateTime(
                                termsConsent.agreedAt,
                                locale,
                              ),
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 sm:p-7">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                      <Shield size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-bold text-gray-950">
                          {t("privacy.policyTitle")}
                        </h3>
                        {privacyConsent?.agreed ? (
                          <Badge className="bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            {t("privacy.agreed")}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
                            <XCircle size={12} />
                            {t("privacy.notAgreed")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-3">
                        {t("privacy.policyDescription")}
                      </p>
                      {privacyConsent && (
                        <div className="text-xs text-gray-400 space-y-1">
                          {privacyConsent.version && (
                            <p>
                              {t("privacy.version", {
                                version: privacyConsent.version,
                              })}
                            </p>
                          )}
                          <p>
                            {t("privacy.agreedAt", {
                              date: formatDateTime(
                                privacyConsent.agreedAt,
                                locale,
                              ),
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 sm:p-7">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                      <Mail size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-base font-bold text-gray-950">
                            {t("privacy.marketingTitle")}
                          </h3>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {t("privacy.marketingDescription")}
                          </p>
                        </div>
                        <Toggle
                          checked={marketingConsent?.agreed ?? false}
                          onChange={handleToggleMarketing}
                          disabled={updating}
                        />
                      </div>
                      {marketingConsent && (
                        <div className="text-xs text-gray-400 mt-3">
                          <p>
                            {t("privacy.updatedAt", {
                              date: formatDateTime(
                                marketingConsent.agreedAt,
                                locale,
                              ),
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-brand/5 border border-brand/20 rounded-2xl p-6 sm:p-7">
                  <h3 className="text-base font-bold text-gray-950 mb-2">
                    {t("privacy.rightsTitle")}
                  </h3>
                  <ul className="text-sm text-gray-700 space-y-1.5 leading-relaxed">
                    <li>• {t("privacy.rightAccess")}</li>
                    <li>• {t("privacy.rightMarketing")}</li>
                    <li>• {t("privacy.rightCompliance")}</li>
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 rounded-xl border-gray-200 hover:border-brand hover:text-brand"
                    onClick={() => window.open("/privacy-policy", "_blank")}
                  >
                    {t("privacy.viewPolicy")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <AuthGuard>
      <PrivacyInner />
    </AuthGuard>
  );
}
