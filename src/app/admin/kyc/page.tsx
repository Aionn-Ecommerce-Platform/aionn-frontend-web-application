"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, EmptyState, Modal } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { useTranslation } from "@/hooks";
import { adminKycService } from "@/lib/services";
import { getKycStatus } from "@/lib/domain/status/kyc";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import type { KycProfile, KycStatus } from "@/types";

const TABS: KycStatus[] = ["SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED"];

type DialogState =
  | { kind: "idle" }
  | { kind: "approve"; kyc: KycProfile }
  | { kind: "reject"; kyc: KycProfile }
  | { kind: "in-review"; kyc: KycProfile };

function AdminKycInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<KycStatus>("SUBMITTED");
  const [dialog, setDialog] = useState<DialogState>({ kind: "idle" });
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-kyc", tab],
    queryFn: () => adminKycService.listByStatus(tab, 100),
  });
  const items = data?.data ?? [];

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-kyc"] });
  }

  const approveMu = useMutation({
    mutationFn: (vars: { kycId: string; note?: string }) =>
      adminKycService.approve(vars.kycId, vars.note),
    onSuccess: () => {
      toast.success(t("adminKyc.approvedToast"));
      setDialog({ kind: "idle" });
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const rejectMu = useMutation({
    mutationFn: (vars: { kycId: string; reason: string }) =>
      adminKycService.reject(vars.kycId, vars.reason),
    onSuccess: () => {
      toast.success(t("adminKyc.rejectedToast"));
      setDialog({ kind: "idle" });
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const inReviewMu = useMutation({
    mutationFn: (vars: { kycId: string; note?: string }) =>
      adminKycService.markInReview(vars.kycId, vars.note),
    onSuccess: () => {
      toast.success(t("adminKyc.inReviewToast"));
      setDialog({ kind: "idle" });
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function openDialog(s: DialogState) {
    setDialog(s);
    setNote("");
  }

  function submitDialog() {
    if (dialog.kind === "approve") {
      approveMu.mutate({ kycId: dialog.kyc.kycId, note: note || undefined });
    } else if (dialog.kind === "reject") {
      if (!note.trim()) {
        toast.error(t("adminKyc.rejectReasonRequired"));
        return;
      }
      rejectMu.mutate({ kycId: dialog.kyc.kycId, reason: note.trim() });
    } else if (dialog.kind === "in-review") {
      inReviewMu.mutate({ kycId: dialog.kyc.kycId, note: note || undefined });
    }
  }

  const isMutating =
    approveMu.isPending || rejectMu.isPending || inReviewMu.isPending;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t("adminKyc.title")}
        </h1>
        <p className="text-gray-500 mb-6 text-sm">
          {t("adminKyc.description")}
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          {TABS.map((status) => (
            <Button
              key={status}
              variant={tab === status ? "primary" : "outline"}
              size="sm"
              onClick={() => setTab(status)}
            >
              {t(getKycStatus(status).labelKey)}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={t("adminKyc.emptyTitle")}
            description={t("adminKyc.emptyDescription")}
          />
        ) : (
          <div className="space-y-3">
            {items.map((kyc) => {
              const config = getKycStatus(kyc.status);
              const canAct =
                kyc.status === "SUBMITTED" || kyc.status === "IN_REVIEW";
              return (
                <div
                  key={kyc.kycId}
                  className="bg-white rounded-md border border-gray-400 p-5"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-900 text-sm">
                          {kyc.kycId}
                        </span>
                        <Badge variant={config.variant}>
                          {t(config.labelKey)}
                        </Badge>
                        <span className="text-xs text-gray-400 font-mono">
                          {kyc.docType}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        User <span className="font-mono">{kyc.userId}</span>
                        {kyc.submittedAt && (
                          <>
                            {" · "}
                            {t("adminKyc.submittedAt", {
                              date: formatDateTime(kyc.submittedAt, locale),
                            })}
                          </>
                        )}
                      </p>
                      {kyc.provider && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Provider:{" "}
                          <span className="font-medium">{kyc.provider}</span>
                          {kyc.providerReviewStatus && (
                            <> · {kyc.providerReviewStatus}</>
                          )}
                        </p>
                      )}
                      {kyc.blobUrl && (
                        <a
                          href={kyc.blobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
                        >
                          <ExternalLink size={12} />
                          {t("adminKyc.viewDocument")}
                        </a>
                      )}
                      {kyc.reviewNote && (
                        <p className="text-xs text-gray-600 mt-2 italic">
                          {t("adminKyc.note", { note: kyc.reviewNote })}
                        </p>
                      )}
                      {kyc.rejectReason && (
                        <p className="text-xs text-red-600 mt-2">
                          {t("adminKyc.rejectReason", {
                            reason: kyc.rejectReason,
                          })}
                        </p>
                      )}
                    </div>

                    {canAct && (
                      <div className="flex flex-wrap items-center gap-2">
                        {kyc.status === "SUBMITTED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openDialog({ kind: "in-review", kyc })
                            }
                          >
                            <Clock size={14} className="mr-1" />
                            {t("adminKyc.review")}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => openDialog({ kind: "approve", kyc })}
                        >
                          <CheckCircle2 size={14} className="mr-1" />
                          {t("adminKyc.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => openDialog({ kind: "reject", kyc })}
                        >
                          <XCircle size={14} className="mr-1" />
                          {t("adminKyc.reject")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={dialog.kind !== "idle"}
        onClose={() => setDialog({ kind: "idle" })}
        title={
          dialog.kind === "approve"
            ? t("adminKyc.approveTitle")
            : dialog.kind === "reject"
              ? t("adminKyc.rejectTitle")
              : dialog.kind === "in-review"
                ? t("adminKyc.inReviewTitle")
                : ""
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {dialog.kind === "reject"
              ? t("adminKyc.rejectDescription")
              : t("adminKyc.noteDescription")}
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder={
              dialog.kind === "reject"
                ? t("adminKyc.rejectPlaceholder")
                : t("adminKyc.notePlaceholder")
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDialog({ kind: "idle" })}
              disabled={isMutating}
            >
              {t("adminKyc.cancel")}
            </Button>
            <Button
              variant={dialog.kind === "reject" ? "danger" : "primary"}
              onClick={submitDialog}
              loading={isMutating}
            >
              {t("adminKyc.confirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminKycPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminKycInner />
    </AuthGuard>
  );
}
