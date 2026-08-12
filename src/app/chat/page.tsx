"use client";

import { AppImage } from "@/shared/ui";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Search,
  MoreVertical,
  Archive,
  Loader2,
  MessageCircle,
  ImagePlus,
} from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, EmptyState } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import Sidebar from "@/components/layout/Sidebar";
import { conversationService, messageService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth.store";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";
import { formatTime } from "@/shared/lib/utils";
import type { ChatMessage } from "@/types";

export function ChatInner({
  variant = "member",
}: { variant?: "member" | "console" } = {}) {
  const { t, locale } = useTranslation();
  const searchParams = useSearchParams();
  const presetConversationId = searchParams.get("conversationId");
  const { isAuthenticated, isInitializing, user } = useAuthStore();
  const userId = user?.userId;
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(
    presetConversationId,
  );
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMessageCountRef = useRef(0);
  const lastConversationIdRef = useRef<string | null>(null);

  const { data: conversations, isLoading: loadingConvs } = useQuery({
    queryKey: qk.conversations({ includeArchived: false, limit: 50 }),
    queryFn: () =>
      conversationService.listMine({ includeArchived: false, limit: 50 }),
    enabled: !isInitializing && isAuthenticated,
    refetchInterval: 30_000,
  });

  const filtered = useMemo(() => {
    const list = conversations ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      c.participants.some((p) =>
        (p.displayName ?? "").toLowerCase().includes(q),
      ),
    );
  }, [conversations, search]);

  const effectiveSelectedId = useMemo(() => {
    if (selectedId) return selectedId;
    if (presetConversationId) return presetConversationId;
    return filtered[0]?.conversationId ?? null;
  }, [selectedId, presetConversationId, filtered]);

  const activeConv = filtered.find(
    (c) => c.conversationId === effectiveSelectedId,
  );

  const { data: messages, isLoading: loadingMsgs } = useQuery({
    queryKey: effectiveSelectedId
      ? qk.messages(effectiveSelectedId)
      : ["chat", "messages", "none"],
    queryFn: () =>
      effectiveSelectedId
        ? messageService.list(effectiveSelectedId, { limit: 50 })
        : Promise.resolve([] as ChatMessage[]),
    enabled: !isInitializing && isAuthenticated && !!effectiveSelectedId,
    refetchInterval: 5_000,
  });

  useEffect(() => {
    const count = messages?.length ?? 0;
    const conversationChanged =
      lastConversationIdRef.current !== effectiveSelectedId;
    const newMessageAppended =
      !conversationChanged && count > lastMessageCountRef.current;

    if (conversationChanged) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    } else if (newMessageAppended) {
      const container = messagesContainerRef.current;
      const lastMsg = messages?.[count - 1];
      const sentByMe = lastMsg?.senderId === userId;
      const nearBottom = container
        ? container.scrollHeight -
            container.scrollTop -
            container.clientHeight <
          120
        : true;
      if (sentByMe || nearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }

    lastConversationIdRef.current = effectiveSelectedId;
    lastMessageCountRef.current = count;
  }, [messages, effectiveSelectedId, userId]);

  useEffect(() => {
    if (isInitializing || !isAuthenticated || !effectiveSelectedId) return;
    void conversationService.markRead(effectiveSelectedId).then(() => {
      qc.invalidateQueries({ queryKey: qk.unreadCounts });
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
    });
  }, [effectiveSelectedId, isAuthenticated, isInitializing, qc]);

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      messageService.send(effectiveSelectedId!, { type: "TEXT", body }),
    onSuccess: (msg) => {
      qc.setQueryData<ChatMessage[]>(
        qk.messages(effectiveSelectedId!),
        (prev) => (prev ? [...prev, msg] : [msg]),
      );
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const sendImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const { mediaService, uploadToCloudinary } = await import(
        "@/lib/services/media.service"
      );
      const sig = await mediaService.generateChatImageSignature();
      const url = await uploadToCloudinary(file, sig);
      return messageService.send(effectiveSelectedId!, {
        type: "IMAGE",
        body: url,
      });
    },
    onSuccess: (msg) => {
      qc.setQueryData<ChatMessage[]>(
        qk.messages(effectiveSelectedId!),
        (prev) => (prev ? [...prev, msg] : [msg]),
      );
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => conversationService.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
      toast.success(t("chat.archiveSuccess"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !effectiveSelectedId || sendMutation.isPending) return;
    sendMutation.mutate(text);
    setDraft("");
  };

  return (
    <div
      className={
        variant === "console" ? "" : "member-page bg-gray-50 min-h-screen"
      }
    >
      <div
        className={
          variant === "console"
            ? ""
            : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-12"
        }
      >
        <div className={variant === "console" ? "" : "flex gap-8"}>
          {variant === "member" && <Sidebar />}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden min-h-[560px] h-[calc(100vh-13rem)] flex">
              <div className="w-80 border-r border-gray-100 flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    {t("chat.title")}
                  </h2>
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("chat.searchPlaceholder")}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loadingConvs ? (
                    <div className="p-8 flex justify-center">
                      <Loader2
                        className="animate-spin text-blue-600"
                        size={20}
                      />
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-400">
                      {t("chat.noConversations")}
                    </div>
                  ) : (
                    filtered.map((conv) => {
                      const other = conv.participants.find(
                        (p) => p.userId !== userId,
                      );
                      const name =
                        other?.displayName?.trim() ||
                        (other?.role === "MERCHANT"
                          ? t("chat.merchantFallback")
                          : t("chat.userFallback"));
                      return (
                        <button
                          key={conv.conversationId}
                          onClick={() => setSelectedId(conv.conversationId)}
                          className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${
                            effectiveSelectedId === conv.conversationId
                              ? "bg-blue-50/70"
                              : ""
                          }`}
                        >
                          <Avatar
                            src={other?.avatarUrl ?? undefined}
                            alt={name}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {name}
                              </span>
                              {conv.lastMessageAt && (
                                <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                                  {formatTime(conv.lastMessageAt, locale)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <p className="text-xs text-gray-500 truncate">
                                {conv.lastMessagePreview ??
                                  t("chat.startConversation")}
                              </p>
                              {conv.unreadCount > 0 && (
                                <span className="ml-2 min-w-5 h-5 px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col min-w-0">
                {!activeConv ? (
                  <EmptyState
                    icon={MessageCircle}
                    title={t("chat.selectConversation")}
                    description={t("chat.selectConversationDesc")}
                    className="flex-1"
                  />
                ) : (
                  <>
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {(() => {
                          const other = activeConv.participants.find(
                            (p) => p.userId !== userId,
                          );
                          const name =
                            other?.displayName?.trim() ||
                            (other?.role === "MERCHANT"
                              ? t("chat.merchantFallback")
                              : t("chat.userFallback"));
                          return (
                            <>
                              <Avatar
                                src={other?.avatarUrl ?? undefined}
                                alt={name}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <h3 className="text-sm font-medium text-gray-900 truncate">
                                  {name}
                                </h3>
                                {activeConv.archived && (
                                  <p className="text-xs text-gray-400">
                                    {t("chat.archived")}
                                  </p>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            archiveMutation.mutate(activeConv.conversationId)
                          }
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
                          aria-label={t("chat.archive")}
                          disabled={archiveMutation.isPending}
                        >
                          <Archive size={18} />
                        </button>
                        <button
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
                          aria-label={t("chat.more")}
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </div>

                    <div
                      ref={messagesContainerRef}
                      className="flex-1 overflow-y-auto p-4 space-y-3"
                    >
                      {loadingMsgs ? (
                        <div className="py-12 flex justify-center">
                          <Loader2
                            className="animate-spin text-blue-600"
                            size={24}
                          />
                        </div>
                      ) : !messages || messages.length === 0 ? (
                        <p className="text-sm text-center text-gray-400 py-12">
                          {t("chat.firstMessage")}
                        </p>
                      ) : (
                        <AnimatePresence initial={false}>
                          {messages.map((msg) => {
                            const isMe = msg.senderId === userId;
                            return (
                              <motion.div
                                key={msg.messageId}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm break-words ${
                                    isMe
                                      ? "bg-blue-600 text-white rounded-br-md"
                                      : "bg-gray-100 text-gray-900 rounded-bl-md"
                                  }`}
                                >
                                  {msg.recalled ? (
                                    <p className="italic opacity-70">
                                      {t("chat.messageRecalled")}
                                    </p>
                                  ) : msg.type === "IMAGE" && msg.body ? (
                                    <AppImage
                                      src={msg.body}
                                      alt={t("chat.imageAlt")}
                                      className="max-w-full max-h-64 rounded-lg cursor-pointer"
                                      onClick={() => {
                                        const url = msg.body;
                                        if (url) window.open(url, "_blank");
                                      }}
                                    />
                                  ) : (
                                    <p className="whitespace-pre-wrap">
                                      {msg.body}
                                    </p>
                                  )}
                                  <p
                                    className={`text-[10px] mt-1 ${
                                      isMe ? "text-blue-200" : "text-gray-400"
                                    }`}
                                  >
                                    {formatMessageTime(msg.sentAt, locale)}
                                  </p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <label
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer ${
                            sendImageMutation.isPending ? "opacity-50" : ""
                          }`}
                          aria-label="Upload image"
                          title={t("chat.uploadImage")}
                        >
                          {sendImageMutation.isPending ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <ImagePlus size={18} />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={sendImageMutation.isPending}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) sendImageMutation.mutate(file);
                            }}
                          />
                        </label>
                        <input
                          type="text"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder={t("chat.messagePlaceholder")}
                          className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                        />
                        <button
                          onClick={handleSend}
                          disabled={!draft.trim() || sendMutation.isPending}
                          className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50"
                          aria-label={t("chat.sendMessage")}
                        >
                          {sendMutation.isPending ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Send size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatMessageTime(
  value: string | null | undefined,
  locale = "vi",
): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return formatTime(d, locale);
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <ChatInner />
      </Suspense>
    </AuthGuard>
  );
}
