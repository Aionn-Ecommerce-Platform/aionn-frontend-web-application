"use client";

import { useState } from "react";
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
import { Button, EmptyState, Modal } from "@/shared/ui";
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
  const [isMarkingAll, setIsMarkingAll] = useState(false);
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

  const list = notifications ?? [];
  const isNotificationRead = (n: NotificationItem) => n.status === "READ" || !!n.readAt;
  const unreadCount = list.filter((n) => !isNotificationRead(n)).length;

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

  const handleMarkAll = async () => {
    if (isMarkingAll) return;
    const pending = list.filter((n) => !isNotificationRead(n));
    if (pending.length === 0) return;
    setIsMarkingAll(true);
    try {
      await Promise.all(
        pending.map((n) =>
          notificationService.markRead(n.notiId).catch(() => null),
        ),
      );
      await qc.invalidateQueries({ queryKey: qk.notifications() });
      toast.success(
        t("notifications.markedReadToast").replace(
          "{count}",
          String(pending.length),
        ),
        { id: "mark-all-read" },
      );
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <MemberPageLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("notifications.title")}
          </h1>
          {unreadCount > 0 && (
            <span className="bg-gray-950 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-xs">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={isMarkingAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 border-gray-900 bg-white text-gray-900 hover:bg-gray-950 hover:text-white disabled:opacity-50 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            {isMarkingAll ? (
              <Loader2 size={14} className="animate-spin stroke-[2.5]" />
            ) : (
              <Check size={14} className="stroke-[2.5]" />
            )}
            <span>{t("notifications.markAllRead")}</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
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
          <div className="divide-y divide-gray-100">
            <AnimatePresence initial={false}>
              {list.map((notif) => {
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
                    <div className="w-2.5 h-10 flex items-center justify-center shrink-0">
                      {!read && (
                        <span className="w-2 h-2 rounded-full bg-brand shadow-xs shrink-0" />
                      )}
                    </div>

                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        read
                          ? "bg-gray-100/60 border-gray-200/80 opacity-60"
                          : "bg-white border-gray-200 shadow-xs"
                      }`}
                    >
                      {categoryIcons[notif.category] ?? (
                        <Bell size={16} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={`text-sm ${
                            read
                              ? "text-gray-500 font-normal"
                              : "font-bold text-gray-950"
                          }`}
                        >
                          {notif.subject ?? t("notifications.defaultSubject")}
                        </h3>
                        <span
                          className={`text-xs shrink-0 ${
                            read ? "text-gray-400" : "text-gray-600 font-semibold"
                          }`}
                        >
                          {formatDate(notif.createdAt, locale)}
                        </span>
                      </div>
                      <p
                        className={`text-xs mt-1 line-clamp-2 leading-relaxed ${
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
                      className="p-1.5 text-gray-300 hover:text-red-500 bg-transparent transition-colors shrink-0 cursor-pointer"
                      aria-label={t("notifications.deleteLabel")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Apple-style Notification Detail Modal */}
      <Modal
        isOpen={!!selectedNotif}
        onClose={() => setSelectedNotif(null)}
        title={t("notifications.detailTitle")}
        size="md"
      >
        {selectedNotif && (() => {
          // Detect related target action
          const content = `${selectedNotif.subject ?? ""} ${selectedNotif.content ?? ""}`;
          const orderMatch = content.match(/ORD_[A-Za-z0-9]+/i);
          const orderId = orderMatch ? orderMatch[0] : null;

          let actionLabel: string | null = null;
          let actionUrl: string | null = null;

          if (orderId) {
            actionLabel = `${t("notifications.viewOrder")} (${orderId})`;
            actionUrl = `/orders/${orderId}`;
          } else if (selectedNotif.category === "CHAT" || /chat|message/i.test(content)) {
            actionLabel = t("notifications.openChat");
            actionUrl = "/chat";
          } else if (selectedNotif.category === "PROMOTION" || /voucher|promo|discount/i.test(content)) {
            actionLabel = t("notifications.viewVouchers");
            actionUrl = "/vouchers";
          } else if (selectedNotif.category === "SECURITY" || /security|auth|login/i.test(content)) {
            actionLabel = t("notifications.viewSecurity");
            actionUrl = "/account/security";
          }

          return (
            <div className="space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
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
