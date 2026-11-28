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
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, FilterDropdown, Modal } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminSearch,
  AdminStats,
  AdminTable,
  adminRow,
  adminTd,
} from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import { useDebounce, useTranslation } from "@/hooks";
import { adminKycService, adminUserService } from "@/lib/services";
import { getKycStatus } from "@/lib/domain/status/kyc";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import type { KycProfile, KycStatus } from "@/types";

const TABS: KycStatus[] = ["SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED"];

const DOC_TYPES = ["", "CCCD", "PASSPORT"] as const;

const TONE = {
  default: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
} as const;

const DOC_TONE: Record<string, "purple" | "info" | "neutral"> = {
  CCCD: "purple",
  PASSPORT: "info",
};

type DialogState =
  | { kind: "idle" }
  | { kind: "approve"; kyc: KycProfile }
  | { kind: "reject"; kyc: KycProfile }
  | { kind: "in-review"; kyc: KycProfile };

const centerTh =
  "whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400";

function AdminKycInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<KycStatus>("SUBMITTED");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [docTypeFilter, setDocTypeFilter] = useState<"" | "CCCD" | "PASSPORT">(
    "",
  );
  const [dialog, setDialog] = useState<DialogState>({ kind: "idle" });
  const [selected, setSelected] = useState<KycProfile | null>(null);
  const [note, setNote] = useState("");

  const searchTerm = debouncedSearch.trim() || undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-kyc", tab, searchTerm],
    queryFn: () => adminKycService.listByStatus(tab, searchTerm, 100),
  });
  const items = data?.data ?? [];
  const visibleItems = docTypeFilter
    ? items.filter((item) => item.docType === docTypeFilter)
    : items;

  const userIds = [...new Set(items.map((item) => item.userId))];
  const { data: userProfiles } = useQuery({
    queryKey: ["admin-kyc-users", userIds.join(",")],
    queryFn: async () => {
      const rows = await Promise.all(
        userIds.map((id) => adminUserService.get(id).catch(() => null)),
      );
      return new Map(
        rows
          .filter((row): row is NonNullable<typeof row> => row !== null)
          .map((row) => [row.userId, row]),
      );
    },
    enabled: userIds.length > 0,
  });

  const { data: counts } = useQuery({
    queryKey: ["admin-kyc-counts"],
    queryFn: async () => {
      const lists = await Promise.all(
        TABS.map((status) =>
          adminKycService.listByStatus(status, undefined, 100),
        ),
      );
      return TABS.reduce<Record<string, number>>((acc, status, index) => {
        acc[status] = lists[index]?.data?.length ?? 0;
        return acc;
      }, {});
    },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-kyc"] });
    qc.invalidateQueries({ queryKey: ["admin-kyc-counts"] });
  }

  const approveMu = useMutation({
    mutationFn: (vars: { kycId: string; note?: string }) =>
      adminKycService.approve(vars.kycId, vars.note),
    onSuccess: () => {
      toast.success(t("adminKyc.approvedToast"));
      setDialog({ kind: "idle" });
      setSelected(null);
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
      setSelected(null);
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
      setSelected(null);
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
    <div className="min-h-screen">
      <AdminHeader icon={ShieldCheck} title={t("adminKyc.title")} />

      <AdminStats
        stats={[
          {
            label: t("adminConsole.stats.total"),
            value: TABS.reduce(
              (sum, status) => sum + (counts?.[status] ?? 0),
              0,
            ),
            icon: ShieldCheck,
          },
          {
            label: t("adminConsole.stats.pending"),
            value: (counts?.SUBMITTED ?? 0) + (counts?.IN_REVIEW ?? 0),
            icon: Clock,
            iconClass: "text-amber-300",
          },
          {
            label: t("adminConsole.stats.approved"),
            value: counts?.APPROVED ?? 0,
            icon: CheckCircle2,
            iconClass: "text-emerald-300",
          },
          {
            label: t("adminConsole.stats.rejected"),
            value: counts?.REJECTED ?? 0,
            icon: XCircle,
            iconClass: "text-rose-300",
          },
        ]}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <AdminSearch
            value={search}
            onChange={setSearch}
            placeholder={t("adminKyc.searchPlaceholder")}
            fullWidth
          />
        </div>
        <FilterDropdown
          label={t("common.status")}
          value={tab}
          onChange={(value) => setTab(value as KycStatus)}
          options={TABS.map((status) => ({
            value: status,
            label: t(getKycStatus(status).labelKey),
          }))}
        />
        <FilterDropdown
          label={t("adminKyc.docType")}
          value={docTypeFilter}
          onChange={(value) =>
            setDocTypeFilter(value as "" | "CCCD" | "PASSPORT")
          }
          options={DOC_TYPES.map((type) => ({
            value: type,
            label: type || t("adminKyc.allDocTypes"),
          }))}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : visibleItems.length === 0 ? (
        <AdminEmpty
          icon={ShieldCheck}
          title={t("adminKyc.emptyTitle")}
          description={t("adminKyc.emptyDescription")}
        />
      ) : (
        <AdminTable>
          <thead>
            <tr className="border-b border-slate-600/60 bg-white/[0.03]">
              <th className={centerTh}>{t("adminUsers.user")}</th>
              <th className={centerTh}>{t("adminKyc.docType")}</th>
              <th className={centerTh}>{t("common.status")}</th>
              <th className={centerTh}>{t("adminKyc.submittedLabel")}</th>
              <th className={centerTh}>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((kyc) => {
              const config = getKycStatus(kyc.status);
              const profile = userProfiles?.get(kyc.userId);
              return (
                <tr key={kyc.kycId} className={adminRow}>
                  <td className={`${adminTd} text-center`}>
                    <p className="text-sm font-semibold text-white">
                      {profile?.displayName ?? profile?.username ?? kyc.userId}
                    </p>
                    {profile?.email && (
                      <p className="text-xs text-slate-400">{profile.email}</p>
                    )}
                  </td>
                  <td className={`${adminTd} text-center`}>
                    <AdminPill tone={DOC_TONE[kyc.docType ?? ""] ?? "neutral"}>
                      {kyc.docType ?? "-"}
                    </AdminPill>
                  </td>
                  <td className={`${adminTd} text-center`}>
                    <AdminPill tone={TONE[config.variant]}>
                      {t(config.labelKey)}
                    </AdminPill>
                  </td>
                  <td className={`${adminTd} whitespace-nowrap text-center`}>
                    {kyc.submittedAt
                      ? formatDateTime(kyc.submittedAt, locale)
                      : "—"}
                  </td>
                  <td className={`${adminTd} text-center`}>
                    <button
                      type="button"
                      onClick={() => setSelected(kyc)}
                      aria-label={t("common.view")}
                      className="inline-flex cursor-pointer items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </AdminTable>
      )}

      <Modal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title={t("adminKyc.title")}
        size="full"
      >
        {selected && (
          <div className="max-h-[80vh] space-y-6 overflow-y-auto pr-2">
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-gray-500">KYC ID</p>
                <p className="break-all font-mono font-medium text-gray-900">
                  {selected.kycId}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("adminUsers.user")}</p>
                <p className="font-medium text-gray-900">
                  {userProfiles?.get(selected.userId)?.displayName ??
                    userProfiles?.get(selected.userId)?.username ??
                    selected.userId}
                </p>
                {userProfiles?.get(selected.userId)?.email && (
                  <p className="text-xs text-gray-500">
                    {userProfiles.get(selected.userId)?.email}
                  </p>
                )}
                {userProfiles?.get(selected.userId)?.phone && (
                  <p className="text-xs text-gray-500">
                    {userProfiles.get(selected.userId)?.phone}
                  </p>
                )}
              </div>
              <div>
                <p className="text-gray-500">User ID</p>
                <p className="break-all font-mono font-medium text-gray-900">
                  {selected.userId}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("adminKyc.docType")}</p>
                <p className="font-medium text-gray-900">
                  {selected.docType ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("adminKyc.submittedLabel")}</p>
                <p className="font-medium text-gray-900">
                  {selected.submittedAt
                    ? formatDateTime(selected.submittedAt, locale)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Provider</p>
                <p className="font-medium text-gray-900">
                  {selected.provider ?? "—"}
                  {selected.providerReviewStatus
                    ? ` · ${selected.providerReviewStatus}`
                    : ""}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("common.status")}</p>
                <Badge
                  variant={getKycStatus(selected.status).variant}
                  className="!mt-1 !rounded-full !px-3 !py-1 !text-xs"
                >
                  {t(getKycStatus(selected.status).labelKey)}
                </Badge>
              </div>
            </div>

            {(selected.reviewNote || selected.rejectReason) && (
              <div className="border-t border-gray-300 pt-4">
                <h3 className="mb-2 font-semibold text-gray-900">
                  {t("common.info")}
                </h3>
                <div className="space-y-2 rounded-md bg-gray-200 p-4 text-sm">
                  {selected.reviewNote && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">
                        {t("adminKyc.noteDescription")}
                      </span>
                      <span className="text-right text-gray-900">
                        {selected.reviewNote}
                      </span>
                    </div>
                  )}
                  {selected.rejectReason && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">
                        {t("adminKyc.rejectTitle")}
                      </span>
                      <span className="text-right text-rose-600">
                        {selected.rejectReason}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selected.blobUrl && (
              <a
                href={selected.blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                <ExternalLink size={15} />
                {t("adminKyc.viewDocument")}
              </a>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-300 pt-4">
              {(selected.status === "SUBMITTED" ||
                selected.status === "IN_REVIEW") && (
                <>
                  {selected.status === "SUBMITTED" && (
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-amber-900/30 transition-colors hover:bg-amber-600"
                      onClick={() =>
                        openDialog({ kind: "in-review", kyc: selected })
                      }
                    >
                      <Clock size={14} />
                      {t("adminKyc.review")}
                    </button>
                  )}
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-900/30 transition-colors hover:bg-emerald-500"
                    onClick={() =>
                      openDialog({ kind: "approve", kyc: selected })
                    }
                  >
                    <CheckCircle2 size={14} />
                    {t("adminKyc.approve")}
                  </button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      openDialog({ kind: "reject", kyc: selected })
                    }
                  >
                    <XCircle size={14} className="mr-1" />
                    {t("adminKyc.reject")}
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setSelected(null)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDialog({ kind: "idle" })}
              disabled={isMutating}
            >
              {t("adminKyc.cancel")}
            </Button>
            {dialog.kind === "reject" ? (
              <Button
                variant="danger"
                onClick={submitDialog}
                loading={isMutating}
              >
                {t("adminKyc.confirm")}
              </Button>
            ) : (
              <button
                type="button"
                onClick={submitDialog}
                disabled={isMutating}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  dialog.kind === "approve"
                    ? "bg-emerald-600 shadow-emerald-900/30 hover:bg-emerald-500"
                    : "bg-amber-500 shadow-amber-900/30 hover:bg-amber-600"
                }`}
              >
                {isMutating && <Loader2 size={14} className="animate-spin" />}
                {t("adminKyc.confirm")}
              </button>
            )}
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
