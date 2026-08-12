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
import { Button, Badge, EmptyState, Modal } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { adminFeedbackService } from "@/lib/services";
import type {
  FeedbackResponse,
  FeedbackStatus,
} from "@/lib/services/feedback.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";

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
  const [page, setPage] = useState(0);
  const size = 20;

  const [active, setActive] = useState<FeedbackResponse | null>(null);
  const [reply, setReply] = useState("");
  const [newStatus, setNewStatus] = useState<FeedbackStatus | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-feedbacks", tab, page],
    queryFn: () =>
      adminFeedbackService.list({
        status: (tab || undefined) as FeedbackStatus | undefined,
        page,
        size,
      }),
  });
  const items = data?.content ?? [];
  const totalPages = Math.max(1, data?.totalPages ?? 1);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-feedbacks"] });
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
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t("adminFeedbacks.title")}
        </h1>
        <p className="text-gray-500 mb-6 text-sm">
          {t("adminFeedbacks.description")}
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          {TABS.map((tabOption) => (
            <Button
              key={tabOption.key || "all"}
              variant={tab === tabOption.key ? "primary" : "outline"}
              size="sm"
              onClick={() => {
                setTab(tabOption.key);
                setPage(0);
              }}
            >
              {t(tabOption.labelKey)}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={t("adminFeedbacks.emptyTitle")}
            description={t("adminFeedbacks.emptyDescription")}
          />
        ) : (
          <div className="space-y-3">
            {items.map((fb) => {
              const cfg = STATUS_CFG[fb.status];
              return (
                <div
                  key={fb.feedbackId}
                  className="bg-white rounded-md border border-gray-400 p-5"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={cfg.variant}>{t(cfg.labelKey)}</Badge>
                        <Badge variant="default">{fb.category}</Badge>
                        {fb.rating != null && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <Star size={12} fill="currentColor" /> {fb.rating}/5
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatDateTime(fb.createdAt, locale)}
                        </span>
                      </div>
                      {fb.subject && (
                        <p className="font-semibold text-gray-900 mb-1">
                          {fb.subject}
                        </p>
                      )}
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        {fb.content}
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-3">
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
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="text-xs text-blue-700 font-medium mb-1">
                            {t("adminFeedbacks.adminReply")}
                            {fb.handledBy && (
                              <span className="text-blue-500 font-normal">
                                {" · "}
                                {fb.handledBy}
                                {fb.handledAt &&
                                  ` · ${formatDateTime(fb.handledAt, locale)}`}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-blue-900 whitespace-pre-line">
                            {fb.adminReply}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Button size="sm" onClick={() => openReply(fb)}>
                        <Send size={14} className="mr-1" />
                        {fb.adminReply
                          ? t("adminFeedbacks.editReply")
                          : t("adminFeedbacks.reply")}
                      </Button>
                      <select
                        value={fb.status}
                        onChange={(e) =>
                          statusMu.mutate({
                            feedbackId: fb.feedbackId,
                            status: e.target.value as FeedbackStatus,
                          })
                        }
                        disabled={statusMu.isPending}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                      >
                        {NEXT_STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {t(STATUS_CFG[s].labelKey)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-xs text-gray-500">
              {t("adminFeedbacks.pagination", {
                count: data?.totalElements ?? 0,
                page: page + 1,
                total: totalPages,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                {t("common.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("common.next")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={active !== null}
        onClose={() => setActive(null)}
        title={t("adminFeedbacks.replyTitle")}
        size="lg"
      >
        {active && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="text-gray-500 text-xs mb-1">
                {active.subject || active.category}
              </p>
              <p className="text-gray-700 line-clamp-3 whitespace-pre-line">
                {active.content}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("adminFeedbacks.replyContent")}
              </label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder={t("adminFeedbacks.replyPlaceholder")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("adminFeedbacks.statusAfterReply")}
              </label>
              <select
                value={newStatus}
                onChange={(e) =>
                  setNewStatus(e.target.value as FeedbackStatus | "")
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
              <Button onClick={submitReply} loading={replyMu.isPending}>
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
