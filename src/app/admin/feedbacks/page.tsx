"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  MessageSquare,
  Send,
  Mail,
  Phone,
  User,
  Star,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Pagination } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminSearch,
  AdminSelect,
  AdminStats,
  AdminTable,
  AdminTabs,
  adminPrimaryClass,
  adminRow,
  adminTd,
  adminTh,
} from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import { adminFeedbackService } from "@/lib/services";
import type {
  FeedbackResponse,
  FeedbackStatus,
} from "@/lib/services/feedback.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { useDebounce, useTranslation } from "@/hooks";

const TABS: Array<{ key: "" | FeedbackStatus; labelKey: string }> = [
  { key: "", labelKey: "common.all" },
  { key: "OPEN", labelKey: "statuses.feedback.OPEN" },
  { key: "IN_REVIEW", labelKey: "statuses.feedback.IN_REVIEW" },
  { key: "RESOLVED", labelKey: "statuses.feedback.RESOLVED" },
  { key: "CLOSED", labelKey: "statuses.feedback.CLOSED" },
];

const STATUS_CFG: Record<
  FeedbackStatus,
  {
    labelKey: string;
    variant: "default" | "info" | "success" | "warning" | "danger";
  }
> = {
  OPEN: { labelKey: "statuses.feedback.OPEN", variant: "warning" },
  IN_REVIEW: { labelKey: "statuses.feedback.IN_REVIEW", variant: "info" },
  RESOLVED: { labelKey: "statuses.feedback.RESOLVED", variant: "success" },
  CLOSED: { labelKey: "statuses.feedback.CLOSED", variant: "default" },
};

const TONE = {
  default: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
} as const;

const NEXT_STATUS_OPTIONS: FeedbackStatus[] = [
  "OPEN",
  "IN_REVIEW",
  "RESOLVED",
  "CLOSED",
];

function AdminFeedbacksInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"" | FeedbackStatus>("OPEN");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(0);
  const size = 20;

  const [active, setActive] = useState<FeedbackResponse | null>(null);
  const [reply, setReply] = useState("");
  const [newStatus, setNewStatus] = useState<FeedbackStatus | "">("");

  const searchTerm = debouncedSearch.trim() || undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-feedbacks", tab, searchTerm, page],
    queryFn: () =>
      adminFeedbackService.list({
        status: (tab || undefined) as FeedbackStatus | undefined,
        search: searchTerm,
        page,
        size,
      }),
  });
  const items = data?.content ?? [];
  const totalPages = Math.max(1, data?.totalPages ?? 1);

  const { data: feedbackCounts } = useQuery({
    queryKey: ["admin-feedback-counts"],
    queryFn: async () => {
      const lists = await Promise.all(
        TABS.map((entry) =>
          adminFeedbackService.list({
            status: (entry.key || undefined) as FeedbackStatus | undefined,
            page: 0,
            size: 1,
          }),
        ),
      );
      return TABS.reduce<Record<string, number>>((acc, entry, index) => {
        acc[entry.key || "ALL"] = lists[index]?.totalElements ?? 0;
        return acc;
      }, {});
    },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-feedbacks"] });
    qc.invalidateQueries({ queryKey: ["admin-feedback-counts"] });
  }

  const replyMu = useMutation({
    mutationFn: (vars: {
      feedbackId: string;
      reply: string;
      newStatus?: FeedbackStatus;
    }) =>
      adminFeedbackService.reply(vars.feedbackId, {
        reply: vars.reply,
        newStatus: vars.newStatus,
      }),
    onSuccess: () => {
      toast.success(t("adminFeedbacks.replySuccess"));
      setActive(null);
      setReply("");
      setNewStatus("");
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const statusMu = useMutation({
    mutationFn: (vars: { feedbackId: string; status: FeedbackStatus }) =>
      adminFeedbackService.changeStatus(vars.feedbackId, vars.status),
    onSuccess: () => {
      toast.success(t("adminFeedbacks.statusSuccess"));
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function openReply(fb: FeedbackResponse) {
    setActive(fb);
    setReply(fb.adminReply ?? "");
    setNewStatus("");
  }

  function submitReply() {
    if (!active) return;
    if (!reply.trim()) {
      toast.error(t("adminFeedbacks.replyRequired"));
      return;
    }
    replyMu.mutate({
      feedbackId: active.feedbackId,
      reply: reply.trim(),
      newStatus: newStatus || undefined,
    });
  }

  return (
    <div className="min-h-screen">
      <AdminHeader
        icon={MessageSquare}
        title={t("adminFeedbacks.title")}
        description={t("adminFeedbacks.description")}
      />

      <AdminStats
        columns="lg:grid-cols-5"
        stats={TABS.map((entry) => ({
          label: t(entry.labelKey),
          value: feedbackCounts?.[entry.key || "ALL"] ?? 0,
          icon: MessageSquare,
          iconClass:
            entry.key === "OPEN"
              ? "text-amber-300"
              : entry.key === "IN_REVIEW"
                ? "text-sky-300"
                : entry.key === "RESOLVED"
                  ? "text-emerald-300"
                  : entry.key === "CLOSED"
                    ? "text-slate-400"
                    : "text-purple-300",
        }))}
      />

      <AdminTabs
        value={tab}
        onChange={(value) => {
          setTab(value);
          setPage(0);
        }}
        tabs={TABS.map((tabOption) => ({
          value: tabOption.key,
          label: t(tabOption.labelKey),
        }))}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(0);
          }}
          placeholder={t("adminConsole.searchPlaceholder")}
        />
        <p className="text-xs text-slate-400 sm:ml-auto">
          {t("adminConsole.totalCount", { count: data?.totalElements ?? 0 })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : items.length === 0 ? (
        <AdminEmpty
          icon={MessageSquare}
          title={t("adminFeedbacks.emptyTitle")}
          description={t("adminFeedbacks.emptyDescription")}
        />
      ) : (
        <AdminTable>
          <thead>
            <tr className="border-b border-slate-600/60 bg-white/[0.03]">
              <th className={adminTh}>{t("common.status")}</th>
              <th className={adminTh}>{t("common.details")}</th>
              <th className={`${adminTh} text-right`}>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((fb) => {
              const cfg = STATUS_CFG[fb.status];
              return (
                <tr key={fb.feedbackId} className={adminRow}>
                  <td className={adminTd}>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <AdminPill tone={TONE[cfg.variant]}>
                        {t(cfg.labelKey)}
                      </AdminPill>
                      <AdminPill tone="neutral">{fb.category}</AdminPill>
                      {fb.rating != null && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-300">
                          <Star size={12} fill="currentColor" /> {fb.rating}/5
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatDateTime(fb.createdAt, locale)}
                    </span>
                  </td>
                  <td className={adminTd}>
                    {fb.subject && (
                      <p className="mb-1 font-semibold text-white">
                        {fb.subject}
                      </p>
                    )}
                    <p className="whitespace-pre-line text-sm text-slate-300">
                      {fb.content}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      {fb.userId && (
                        <span className="inline-flex items-center gap-1">
                          <User size={12} /> {fb.userId}
                        </span>
                      )}
                      {fb.contactEmail && (
                        <span className="inline-flex items-center gap-1">
                          <Mail size={12} /> {fb.contactEmail}
                        </span>
                      )}
                      {fb.contactPhone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={12} /> {fb.contactPhone}
                        </span>
                      )}
                    </div>

                    {fb.adminReply && (
                      <div className="mt-3 rounded-lg border border-purple-400/25 bg-purple-500/10 p-3">
                        <p className="mb-1 text-xs font-medium text-purple-200">
                          {t("adminFeedbacks.adminReply")}
                          {fb.handledBy && (
                            <span className="font-normal text-purple-300">
                              {" · "}
                              {fb.handledBy}
                              {fb.handledAt &&
                                ` · ${formatDateTime(fb.handledAt, locale)}`}
                            </span>
                          )}
                        </p>
                        <p className="whitespace-pre-line text-sm text-slate-200">
                          {fb.adminReply}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className={`${adminTd} text-right`}>
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        size="sm"
                        className={adminPrimaryClass}
                        onClick={() => openReply(fb)}
                      >
                        <Send size={14} />
                        {fb.adminReply
                          ? t("adminFeedbacks.editReply")
                          : t("adminFeedbacks.reply")}
                      </Button>
                      <div
                        className={
                          statusMu.isPending
                            ? "pointer-events-none opacity-60"
                            : undefined
                        }
                      >
                        <AdminSelect
                          value={fb.status}
                          onChange={(value) =>
                            statusMu.mutate({
                              feedbackId: fb.feedbackId,
                              status: value as FeedbackStatus,
                            })
                          }
                          className="py-1.5 text-xs"
                        >
                          {NEXT_STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {t(STATUS_CFG[s].labelKey)}
                            </option>
                          ))}
                        </AdminSelect>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </AdminTable>
      )}

      {totalPages > 1 && (
        <>
          <p className="mt-4 text-xs text-slate-400">
            {t("adminFeedbacks.pagination", {
              count: data?.totalElements ?? 0,
              page: page + 1,
              total: totalPages,
            })}
          </p>
          <Pagination
            currentPage={page + 1}
            totalPages={totalPages}
            onPageChange={(nextPage) => setPage(nextPage - 1)}
          />
        </>
      )}

      <Modal
        isOpen={active !== null}
        onClose={() => setActive(null)}
        title={t("adminFeedbacks.replyTitle")}
        size="lg"
      >
        {active && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <p className="mb-1 text-xs text-gray-500">
                {active.subject || active.category}
              </p>
              <p className="line-clamp-3 whitespace-pre-line text-gray-700">
                {active.content}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("adminFeedbacks.replyContent")}
              </label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                placeholder={t("adminFeedbacks.replyPlaceholder")}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("adminFeedbacks.statusAfterReply")}
              </label>
              <select
                value={newStatus}
                onChange={(e) =>
                  setNewStatus(e.target.value as FeedbackStatus | "")
                }
                className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              >
                <option value="">
                  {t("adminFeedbacks.defaultTransition")}
                </option>
                {NEXT_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {t(STATUS_CFG[s].labelKey)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setActive(null)}
                disabled={replyMu.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                className={adminPrimaryClass}
                onClick={submitReply}
                loading={replyMu.isPending}
              >
                {t("adminFeedbacks.sendReply")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function AdminFeedbacksPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminFeedbacksInner />
    </AuthGuard>
  );
}
