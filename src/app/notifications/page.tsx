"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Package,
  Ticket,
  MessageCircle,
  Shield,
  Check,
  Trash2,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, EmptyState, Modal, Pagination } from "@/shared/ui";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
import AuthGuard from "@/components/auth/AuthGuard";
import { notificationService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getErrorMessage } from "@/shared/lib/errors";
import type { NotificationItem } from "@/types";
import { useTranslation } from "@/hooks";
import { formatDate, formatDateTime } from "@/shared/lib/utils";

const categoryIcons: Record<string, React.ReactNode> = {
  ORDER: <Package size={16} className="text-blue-500" />,
  PROMOTION: <Ticket size={16} className="text-orange-500" />,
  CHAT: <MessageCircle size={16} className="text-green-500" />,
  SECURITY: <Shield size={16} className="text-red-500" />,
  SYSTEM: <Bell size={16} className="text-gray-500" />,
};

function NotificationsInner() {
  const router = useRouter();
  const qc = useQueryClient();
  const { t, locale } = useTranslation();
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const {
    data: notifications,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: qk.notifications(),
    queryFn: () => notificationService.listMine(50),
  });

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const list = useMemo(() => notifications ?? [], [notifications]);
  const isNotificationRead = (n: NotificationItem) => n.status === "READ" || !!n.readAt;
  const unreadCount = list.filter((n) => !isNotificationRead(n)).length;

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedList = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [list, safeCurrentPage]);

  const pageIds = useMemo(
    () => paginatedList.map((item) => item.notiId),
    [paginatedList],
  );
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const toggleSelect = (notiId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(notiId)) next.delete(notiId);
      else next.add(notiId);
      return next;
    });
  };

  const toggleSelectPage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const markRead = useMutation({
    mutationFn: (notiId: string) => notificationService.markRead(notiId),
    onMutate: async (notiId) => {
      await qc.cancelQueries({ queryKey: qk.notifications() });
      const prev = qc.getQueryData<NotificationItem[]>(qk.notifications());
      if (prev) {
        qc.setQueryData(
          qk.notifications(),
          prev.map((n) =>
            n.notiId === notiId
              ? { ...n, status: "READ", readAt: n.readAt ?? new Date().toISOString() }
              : n,
          ),
        );
      }
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.notifications(), ctx.prev);
      toast.error(getErrorMessage(err));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (notiId: string) => notificationService.delete(notiId),
    onMutate: async (notiId) => {
      await qc.cancelQueries({ queryKey: qk.notifications() });
      const prev = qc.getQueryData<NotificationItem[]>(qk.notifications());
      if (prev) {
        qc.setQueryData(
          qk.notifications(),
          prev.filter((n) => n.notiId !== notiId),
        );
      }
      return { prev };
    },
    onSuccess: () => toast.success(t("notifications.deletedToast")),
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.notifications(), ctx.prev);
      toast.error(getErrorMessage(err));
    },
  });

  const handleMarkSelectedRead = async () => {
    if (bulkBusy || selectedIds.size === 0) return;
    const ids = [...selectedIds];
    setBulkBusy(true);
    try {
      await Promise.all(
        ids.map((id) => notificationService.markRead(id).catch(() => null)),
      );
      await qc.invalidateQueries({ queryKey: qk.notifications() });
      setSelectedIds(new Set());
      toast.success(
        t("notifications.selectedMarkedReadToast").replace(
          "{count}",
          String(ids.length),
        ),
      );
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (bulkBusy || selectedIds.size === 0) return;
    const ids = [...selectedIds];
    setBulkBusy(true);
    try {
      await Promise.all(
        ids.map((id) => notificationService.delete(id).catch(() => null)),
      );
      await qc.invalidateQueries({ queryKey: qk.notifications() });
      setSelectedIds(new Set());
      toast.success(
        t("notifications.selectedDeletedToast").replace(
          "{count}",
          String(ids.length),
        ),
      );
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <MemberPageLayout>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
          {t("notifications.title")}
        </h1>
        {unreadCount > 0 && (
          <span className="bg-gray-950 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-xs">
            {unreadCount}
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-400 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-brand" size={32} />
          </div>
        ) : isError ? (
          <div className="p-6">
            <EmptyState
              icon={AlertCircle}
              title={t("notifications.loadError")}
              description={getErrorMessage(error)}
              action={
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => void refetch()}
                >
                  {t("common.tryAgain")}
                </Button>
              }
            />
          </div>
        ) : list.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Bell}
              title={t("notifications.noNotifications")}
              description={t("notifications.noNotificationsDesc")}
            />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5">
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={toggleSelectPage}
                aria-label={t("notifications.selectAll")}
                className="h-4 w-4 rounded border-gray-400 accent-gray-950 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-600">
                {selectedIds.size > 0
                  ? t("notifications.selectedCount").replace(
                      "{count}",
                      String(selectedIds.size),
                    )
                  : t("notifications.selectAll")}
              </span>
              {selectedIds.size > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleMarkSelectedRead}
                    disabled={bulkBusy}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-950 bg-gray-950 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
                  >
                    <Check size={13} />
                    {t("notifications.markSelectedRead")}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={bulkBusy}
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    {t("notifications.deleteSelected")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs font-semibold text-gray-500 underline underline-offset-2 hover:text-gray-900"
                  >
                    {t("notifications.clearSelection")}
                  </button>
                </>
              )}
            </div>
            <div className="divide-y divide-gray-100">
            <AnimatePresence initial={false}>
              {paginatedList.map((notif) => {
                const read = isNotificationRead(notif);
                return (
                  <motion.div
                    key={notif.notiId}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => {
                      if (!read) markRead.mutate(notif.notiId);
                      setSelectedNotif(notif);
                    }}
                    className={`p-4 sm:p-5 flex items-start gap-4 cursor-pointer transition-colors ${
                      read
                        ? "bg-white hover:bg-gray-50/70"
                        : "bg-gray-50/80 hover:bg-gray-100/80"
                    }`}
                  >
                    {/* Unread indicator dot slot with balanced width so content stays aligned */}
                    <div className="shrink-0 pt-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(notif.notiId)}
                        onChange={() => toggleSelect(notif.notiId)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={notif.subject ?? t("notifications.defaultSubject")}
                        className="h-4 w-4 rounded border-gray-400 accent-gray-950 cursor-pointer"
                      />
                    </div>
                    <div className="w-2.5 h-10 flex items-center justify-center shrink-0">
                      {!read && (
                        <span className="w-2 h-2 rounded-full bg-brand shadow-xs shrink-0" />
                      )}
                    </div>

                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        read
                          ? "bg-gray-100/60 border-gray-400 opacity-60"
                          : "bg-white border-gray-400 shadow-xs"
                      }`}
                    >
                      {categoryIcons[notif.category] ?? (
                        <Bell size={16} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={`text-base ${
                            read
                              ? "text-gray-500 font-normal"
                              : "font-bold text-gray-950"
                          }`}
                        >
                          {notif.subject ?? t("notifications.defaultSubject")}
                        </h3>
                        <span
                          className={`text-sm shrink-0 ${
                            read ? "text-gray-400" : "text-gray-600 font-semibold"
                          }`}
                        >
                          {formatDate(notif.createdAt, locale)}
                        </span>
                      </div>
                      <p
                        className={`text-sm mt-1 line-clamp-2 leading-relaxed ${
                          read ? "text-gray-400" : "text-gray-700 font-medium"
                        }`}
                      >
                        {(notif.content ?? "").replace(/\\n/g, " ")}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMutation.mutate(notif.notiId);
                      }}
                      className="p-1.5 text-red-500 hover:text-red-600 bg-transparent transition-colors shrink-0 cursor-pointer"
                      aria-label={t("notifications.deleteLabel")}
                    >
                      <Trash2 size={20} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            </div>
          </>
        )}
      </div>

      <Pagination
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={(page) => {
          setCurrentPage(page);
          setSelectedIds(new Set());
        }}
      />

      {/* Apple-style Notification Detail Modal */}
      <Modal
        isOpen={!!selectedNotif}
        onClose={() => setSelectedNotif(null)}
        title={t("notifications.detailTitle")}
        size="md"
      >
        {selectedNotif && (() => {
          const content = `${selectedNotif.subject ?? ""} ${selectedNotif.content ?? ""}`;
          const orderMatch = /ORD_[a-z0-9]+/i.exec(content);
          const orderId = orderMatch ? orderMatch[0] : null;

          let actionLabel: string | null = null;
          let actionUrl: string | null = null;

          if (orderId) {
            actionLabel = `${t("notifications.viewOrder")} (${orderId})`;
            actionUrl = `/orders/${orderId}`;
          } else if (selectedNotif.category === "SECURITY") {
            actionLabel = t("notifications.viewSecurity");
            actionUrl = "/account/security";
          } else if (selectedNotif.category === "PROMOTION") {
            actionLabel = t("notifications.viewVouchers");
            actionUrl = "/vouchers";
          } else if (selectedNotif.category === "CHAT") {
            actionLabel = t("notifications.openChat");
            actionUrl = "/chat";
          } else if (/security|auth|login/i.test(content)) {
            actionLabel = t("notifications.viewSecurity");
            actionUrl = "/account/security";
          } else if (/voucher|promo|discount/i.test(content)) {
            actionLabel = t("notifications.viewVouchers");
            actionUrl = "/vouchers";
          } else if (/chat|message/i.test(content)) {
            actionLabel = t("notifications.openChat");
            actionUrl = "/chat";
          }

          return (
            <div className="space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-400 flex items-center justify-center shrink-0">
                  {categoryIcons[selectedNotif.category] ?? (
                    <Bell size={20} className="text-gray-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-gray-950 leading-snug">
                    {selectedNotif.subject ?? t("notifications.defaultSubject")}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDateTime(selectedNotif.createdAt, locale)}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">
                {(selectedNotif.content ?? "").replace(/\\n/g, "\n")}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="px-4 py-2 rounded-full border-2 border-gray-900 bg-white text-gray-800 hover:bg-gray-100 text-xs font-bold transition-all cursor-pointer"
                >
                  {t("common.close")}
                </button>

                {actionUrl && actionLabel && (
                  <button
                    onClick={() => {
                      const url = actionUrl!;
                      setSelectedNotif(null);
                      router.push(url);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-gray-950 bg-gray-950 text-white hover:bg-black text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <span>{actionLabel}</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </MemberPageLayout>
  );
}

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsInner />
    </AuthGuard>
  );
}
