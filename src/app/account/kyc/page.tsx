"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, Modal, Select } from "@/shared/ui";
import Sidebar from "@/components/layout/Sidebar";
import AuthGuard from "@/components/auth/AuthGuard";
import { useTranslation } from "@/hooks";
import { kycService } from "@/lib/services";
import { getKycStatus } from "@/lib/domain/status/kyc";
import { qk } from "@/lib/query-keys";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import type { KycStatus } from "@/types";

const DOC_TYPES = [
  { value: "ID_CARD", labelKey: "myKyc.documentTypes.ID_CARD" },
  { value: "PASSPORT", labelKey: "myKyc.documentTypes.PASSPORT" },
  {
    value: "DRIVER_LICENSE",
    labelKey: "myKyc.documentTypes.DRIVER_LICENSE",
  },
];

const KYC_STATUS_ICON: Record<KycStatus, typeof Clock> = {
  DRAFT: FileText,
  SUBMITTED: Clock,
  IN_REVIEW: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

function KycInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading: loading } = useQuery({
    queryKey: qk.myKyc,
    queryFn: () => kycService.list(),
  });
  const refetch = () => qc.invalidateQueries({ queryKey: qk.myKyc });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("ID_CARD");
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    try {
      await kycService.create(selectedDocType);
      toast.success(t("myKyc.createdToast"));
      setCreateModalOpen(false);
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleStartVerification(kycId: string) {
    setVerifying(kycId);
    try {
      const session = await kycService.generateSession(kycId);

      window.open(
        `https://cockpit.sumsub.com/checkus/#/verify/${session.providerApplicantId}?accessToken=${session.sdkAccessToken}`,
        "_blank",
      );
      toast.success(t("myKyc.sessionCreatedToast"));
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setVerifying(null);
    }
  }

  const approvedProfile = data?.find((p) => p.status === "APPROVED");

  return (
    <div className="member-page bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <Sidebar />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {t("myKyc.title")}
              </h1>
              {!approvedProfile && (
                <Button
                  size="sm"
                  onClick={() => setCreateModalOpen(true)}
                  disabled={loading}
                >
                  {t("myKyc.createProfile")}
                </Button>
              )}
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 flex justify-center">
                <Loader2 className="animate-spin text-blue-600" size={28} />
              </div>
            ) : data && data.length > 0 ? (
              <div className="space-y-4">
                {approvedProfile && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        {t("myKyc.verifiedTitle")}
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        {t("myKyc.verifiedDescription")}
                      </p>
                    </div>
                  </div>
                )}

                {data.map((profile) => {
                  const config = getKycStatus(profile.status);
                  const Icon = KYC_STATUS_ICON[profile.status];
                  const documentType = DOC_TYPES.find(
                    (item) => item.value === profile.docType,
                  );
                  const canVerify =
                    profile.status === "DRAFT" && profile.providerApplicantId;
                  const isVerifying = verifying === profile.kycId;

                  return (
                    <div
                      key={profile.kycId}
                      className="bg-white rounded-xl border border-gray-100 p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <Icon size={20} className="text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {documentType
                                ? t(documentType.labelKey)
                                : profile.docType}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {profile.kycId.slice(0, 16)}...
                            </p>
                          </div>
                        </div>
                        <Badge variant={config.variant}>
                          {t(config.labelKey)}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        {profile.provider && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              {t("myKyc.provider")}
                            </span>
                            <span className="text-gray-900">
                              {profile.provider}
                            </span>
                          </div>
                        )}
                        {profile.providerLevelName && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              {t("myKyc.level")}
                            </span>
                            <span className="text-gray-900">
                              {profile.providerLevelName}
                            </span>
                          </div>
                        )}
                        {profile.submittedAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              {t("myKyc.submittedAt")}
                            </span>
                            <span className="text-gray-900">
                              {formatDateTime(profile.submittedAt, locale)}
                            </span>
                          </div>
                        )}
                        {profile.approvedAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              {t("myKyc.approvedAt")}
                            </span>
                            <span className="text-gray-900">
                              {formatDateTime(profile.approvedAt, locale)}
                            </span>
                          </div>
                        )}
                        {profile.rejectReason && (
                          <div className="mt-3 p-3 bg-red-50 rounded-lg">
                            <p className="text-xs font-medium text-red-900">
                              {t("myKyc.rejectReason")}
                            </p>
                            <p className="text-xs text-red-700 mt-1">
                              {profile.rejectReason}
                            </p>
                          </div>
                        )}
                        {profile.reviewNote && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-900">
                              {t("myKyc.reviewNote")}
                            </p>
                            <p className="text-xs text-gray-700 mt-1">
                              {profile.reviewNote}
                            </p>
                          </div>
                        )}
                      </div>

                      {canVerify && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleStartVerification(profile.kycId)
                            }
                            loading={isVerifying}
                          >
                            {t("myKyc.startVerification")}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
                  <ShieldCheck className="text-blue-600" size={28} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("myKyc.emptyTitle")}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {t("myKyc.emptyDescription")}
                </p>
                <Button onClick={() => setCreateModalOpen(true)}>
                  {t("myKyc.createNow")}
                </Button>
              </div>
            )}

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium">{t("myKyc.noticeTitle")}</p>
                <ul className="mt-2 space-y-1 text-xs text-blue-800">
                  <li>• {t("myKyc.noticeDocument")}</li>
                  <li>• {t("myKyc.noticeSelfie")}</li>
                  <li>• {t("myKyc.noticeDuration")}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={t("myKyc.createTitle")}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("myKyc.createDescription")}
          </p>
          <Select
            label={t("myKyc.documentType")}
            value={selectedDocType}
            onChange={(val) => setSelectedDocType(val)}
            options={DOC_TYPES.map((option) => ({
              value: option.value,
              label: t(option.labelKey),
            }))}
          />
          <Button onClick={handleCreate} className="w-full" loading={creating}>
            {t("myKyc.createProfile")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function KycPage() {
  return (
    <AuthGuard>
      <KycInner />
    </AuthGuard>
  );
}
