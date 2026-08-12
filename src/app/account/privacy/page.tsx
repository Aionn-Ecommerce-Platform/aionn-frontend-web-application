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
    <div className="member-page bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <Sidebar />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              {t("privacy.title")}
            </h1>

            {loading ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 flex justify-center">
                <Loader2 className="animate-spin text-blue-600" size={28} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                      <FileText size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {t("privacy.termsTitle")}
                        </h3>
                        {termsConsent?.agreed ? (
                          <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
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
                      <p className="text-xs text-gray-500 mb-3">
                        {t("privacy.termsDescription")}
                      </p>
                      {termsConsent && (
                        <div className="text-xs text-gray-500 space-y-1">
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

                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                      <Shield size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {t("privacy.policyTitle")}
                        </h3>
                        {privacyConsent?.agreed ? (
                          <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
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
                      <p className="text-xs text-gray-500 mb-3">
                        {t("privacy.policyDescription")}
                      </p>
                      {privacyConsent && (
                        <div className="text-xs text-gray-500 space-y-1">
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

                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                      <Mail size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {t("privacy.marketingTitle")}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
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
                        <div className="text-xs text-gray-500 mt-3">
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

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">
                    {t("privacy.rightsTitle")}
                  </h3>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• {t("privacy.rightAccess")}</li>
                    <li>• {t("privacy.rightMarketing")}</li>
                    <li>• {t("privacy.rightCompliance")}</li>
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
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
