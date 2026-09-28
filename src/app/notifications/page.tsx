"use client";

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
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, EmptyState } from "@/shared/ui";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
import AuthGuard from "@/components/auth/AuthGuard";
import { notificationService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getErrorMessage } from "@/shared/lib/errors";
import type { NotificationItem } from "@/types";
import { useTranslation } from "@/hooks";
import { formatDate } from "@/shared/lib/utils";

const categoryIcons: Record<string, React.ReactNode> = {
  ORDER: <Package size={16} className="text-blue-500" />,
  PROMOTION: <Ticket size={16} className="text-orange-500" />,
  CHAT: <MessageCircle size={16} className="text-green-500" />,
  SECURITY: <Shield size={16} className="text-red-500" />,
  SYSTEM: <Bell size={16} className="text-gray-500" />,
};

function NotificationsInner() {
  const qc = useQueryClient();
  const { t, locale } = useTranslation();
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
  const unreadCount = list.filter((n) => !n.readAt).length;

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
              ? { ...n, readAt: new Date().toISOString() }
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
    const pending = list.filter((n) => !n.readAt);
    if (pending.length === 0) return;
    await Promise.all(
      pending.map((n) =>
        notificationService.markRead(n.notiId).catch(() => null),
      ),
    );
    qc.invalidateQueries({ queryKey: qk.notifications() });
    toast.success(
      t("notifications.markedReadToast").replace(
        "{count}",
        String(pending.length),
      ),
    );
  };

  return (
    <MemberPageLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("notifications.title")}
          </h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-2xs">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAll}
            className="rounded-xs text-xs font-normal border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            <Check size={14} className="mr-1.5" />
            {t("notifications.markAllRead")}
          </Button>
        )}
      </div>

      <div className="bg-white rounded-sm border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
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
                  className="rounded-xs"
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
                const read = !!notif.readAt;
                return (
                  <motion.div
                    key={notif.notiId}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => !read && markRead.mutate(notif.notiId)}
                    className={`p-4 sm:p-5 flex items-start gap-4 cursor-pointer transition-colors ${
                      read
                        ? "bg-white hover:bg-gray-50/70"
                        : "bg-blue-50/30 hover:bg-blue-50/60"
                    }`}
                  >
                    <div className="w-10 h-10 bg-gray-50 rounded-xs flex items-center justify-center shrink-0 border border-gray-100">
                      {categoryIcons[notif.category] ?? (
                        <Bell size={16} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={`text-sm ${
                            read
                              ? "text-gray-700 font-normal"
                              : "font-semibold text-gray-900"
                          }`}
                        >
                          {notif.subject ?? t("notifications.defaultSubject")}
                        </h3>
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatDate(notif.createdAt, locale)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {notif.content ?? ""}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMutation.mutate(notif.notiId);
                      }}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xs transition-colors shrink-0"
                      aria-label={t("notifications.deleteLabel")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
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
