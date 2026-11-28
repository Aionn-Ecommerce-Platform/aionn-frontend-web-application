"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  Headphones,
  Inbox,
  Loader2,
  MessageCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input, Pagination } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminSearch,
  AdminTable,
  adminRow,
  adminTd,
  adminTh,
} from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import { conversationService } from "@/lib/services";
import { AIONN_SUPPORT_PEER_ID } from "@/lib/services/chat.service";
import { useDebounce, useTranslation } from "@/hooks";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";

function AdminChatInner() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [conversationId, setConversationId] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const size = 20;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-chat-conversations", { search: debouncedSearch, page }],
    queryFn: () =>
      conversationService.adminList({
        search: debouncedSearch,
        page: page - 1,
        size,
      }),
    // Support conversations are a shared queue: every CS admin should see new
    // arrivals without manually refreshing.
    refetchInterval: 15_000,
  });

  const conversations = useMemo(() => data?.data ?? [], [data]);
  const totalElements = data?.paging?.totalElements ?? conversations.length;
  const totalPages = Math.max(1, data?.paging?.totalPages ?? 1);

  async function join(targetId: string) {
    const id = targetId.trim();
    if (!id) {
      toast.error(t("adminChat.idRequired"));
      return;
    }
    setJoiningId(id);
    try {
      await conversationService.requestSupport(id);
      toast.success(t("adminChat.joinedToast"));
      router.push(`/chat?conversationId=${encodeURIComponent(id)}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="min-h-screen">
      <AdminHeader
        icon={Headphones}
        title={t("adminChat.title")}
        description={t("adminChat.description")}
        actions={
          <Button variant="outline" onClick={() => router.push("/chat")}>
            {t("adminChat.openChat")}
          </Button>
        }
      />

      <div className="mb-5 rounded-2xl border border-slate-600/60 bg-white/[0.04] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Input
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
            placeholder="CONV_..."
            aria-label={t("adminChat.join")}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") void join(conversationId);
            }}
          />
          <Button
            onClick={() => void join(conversationId)}
            loading={joiningId === conversationId.trim() && !!joiningId}
            disabled={!conversationId.trim()}
          >
            <Headphones size={14} className="mr-1" />
            {t("adminChat.join")}
          </Button>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-600/60 bg-white/[0.04] p-3 text-xs text-slate-300">
          <AlertTriangle
            size={14}
            className="mt-0.5 flex-shrink-0 text-purple-300"
          />
          <p>{t("adminChat.idHelp")}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={t("adminChat.searchPlaceholder")}
        />
        <p className="text-xs text-slate-400 sm:ml-auto">
          {t("adminConsole.totalCount", { count: totalElements })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : isError ? (
        <AdminEmpty
          icon={AlertCircle}
          title={t("adminChat.loadError")}
          description={getErrorMessage(error)}
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              {t("common.tryAgain")}
            </Button>
          }
        />
      ) : conversations.length === 0 ? (
        <AdminEmpty
          icon={Inbox}
          title={t("adminChat.emptyTitle")}
          description={t("adminChat.emptyDescription")}
        />
      ) : (
        <>
          <AdminTable>
            <thead>
              <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                <th className={adminTh}>{t("adminChat.conversation")}</th>
                <th className={adminTh}>{t("adminChat.buyer")}</th>
                <th className={adminTh}>{t("adminChat.store")}</th>
                <th className={adminTh}>{t("adminChat.lastMessage")}</th>
                <th className={adminTh}>{t("adminChat.lastActivity")}</th>
                <th className={adminTh}>{t("common.status")}</th>
                <th className={`${adminTh} text-right`}>
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((conversation) => {
                const lastActivity =
                  conversation.lastMessageAt ??
                  conversation.updatedAt ??
                  conversation.createdAt;
                const isSupport =
                  conversation.merchantId === AIONN_SUPPORT_PEER_ID;
                return (
                  <tr key={conversation.conversationId} className={adminRow}>
                    <td className={adminTd}>
                      <p className="flex items-center gap-2 font-mono text-xs font-semibold text-white">
                        <MessageCircle
                          size={14}
                          className="shrink-0 text-purple-300"
                        />
                        <span className="truncate">
                          {conversation.conversationId}
                        </span>
                      </p>
                    </td>
                    <td className={adminTd}>
                      <span className="font-mono text-xs">
                        {conversation.buyerId || "—"}
                      </span>
                    </td>
                    <td className={adminTd}>
                      {isSupport ? (
                        <AdminPill tone="purple">
                          {t("adminChat.supportChannel")}
                        </AdminPill>
                      ) : (
                        <span className="font-mono text-xs">
                          {conversation.merchantId || "—"}
                        </span>
                      )}
                    </td>
                    <td className={adminTd}>
                      <p className="max-w-xs truncate text-slate-300">
                        {conversation.lastMessagePreview || "—"}
                      </p>
                    </td>
                    <td className={adminTd}>
                      <span className="whitespace-nowrap text-xs text-slate-400">
                        {lastActivity
                          ? formatDateTime(lastActivity, locale)
                          : "—"}
                      </span>
                    </td>
                    <td className={adminTd}>
                      {conversation.archived ? (
                        <AdminPill tone="neutral">
                          {t("chat.archived")}
                        </AdminPill>
                      ) : conversation.unreadCount > 0 ? (
                        <AdminPill tone="warning">
                          {conversation.unreadCount}
                        </AdminPill>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className={`${adminTd} text-right`}>
                      <Button
                        variant="outline"
                        size="sm"
                        loading={joiningId === conversation.conversationId}
                        onClick={() => void join(conversation.conversationId)}
                      >
                        {t("adminChat.join")}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

export default function AdminChatPage() {
  return (
    <AuthGuard requiredRoles={["CS_ADMIN", "SYSTEM_ADMIN"]}>
      <AdminChatInner />
    </AuthGuard>
  );
}
