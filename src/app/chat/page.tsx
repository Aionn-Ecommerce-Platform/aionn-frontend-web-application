"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
  Store,
  Flag,
} from "lucide-react";
import toast from "react-hot-toast";
import { AppImage, Avatar, EmptyState, Modal } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import Sidebar from "@/components/layout/Sidebar";
import {
  conversationService,
  messageService,
  feedbackService,
} from "@/lib/services";
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

  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    return [...messages].sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
    );
  }, [messages]);

  useEffect(() => {
    const count = sortedMessages.length;
    const conversationChanged =
      lastConversationIdRef.current !== effectiveSelectedId;
    const newMessageAppended =
      !conversationChanged && count > lastMessageCountRef.current;

    const container = messagesContainerRef.current;
    if (container) {
      if (conversationChanged) {
        // Immediate scroll of the messages container without scrolling the whole page/window
        container.scrollTop = container.scrollHeight;
        // Run on next animation frame in case DOM elements (like images/motion) adjust height
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop =
              messagesContainerRef.current.scrollHeight;
          }
        });
      } else if (newMessageAppended) {
        const lastMsg = sortedMessages[count - 1];
        const sentByMe = lastMsg?.senderId === userId;
        const nearBottom =
          container.scrollHeight -
            container.scrollTop -
            container.clientHeight <
          120;
        if (sentByMe || nearBottom) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        }
      }
    }

    lastConversationIdRef.current = effectiveSelectedId;
    lastMessageCountRef.current = count;
  }, [sortedMessages, effectiveSelectedId, userId]);

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
        metadata: { imageUrl: url },
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

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreMenuOpen]);

  const archiveMutation = useMutation({
    mutationFn: (id: string) => conversationService.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
      toast.success(t("chat.archiveSuccess"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id: string) => conversationService.unarchive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
      toast.success(t("chat.unarchiveSuccess"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReasonKey, setReportReasonKey] = useState("reportReasonSpam");
  const [reportDetails, setReportDetails] = useState("");

  const reportMutation = useMutation({
    mutationFn: (data: {
      targetName: string;
      reason: string;
      details: string;
    }) =>
      feedbackService.submit({
        category: "COMPLAINT",
        subject: t("chat.reportSubject", {
          name: data.targetName,
          reason: data.reason,
        }),
        content: t("chat.reportContent", {
          name: data.targetName,
          reason: data.reason,
          details: data.details || t("chat.reportNoDetails"),
        }),
      }),
    onSuccess: () => {
      setReportModalOpen(false);
      setReportDetails("");
      toast.success(t("chat.reportSuccess"), { id: "report-store" });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !effectiveSelectedId || sendMutation.isPending) return;
    sendMutation.mutate(text);
    setDraft("");
  };

  const renderMessageBody = (msg: (typeof sortedMessages)[number]) => {
    if (msg.recalled) {
      return (
        <p className="italic opacity-70">
          {t("chat.messageRecalled")}
        </p>
      );
    }
    const imageUrl = (msg.metadata?.imageUrl as string) || msg.body;
    if (msg.type === "IMAGE" && imageUrl) {
      return (
        <AppImage
          src={imageUrl}
          alt={t("chat.imageAlt")}
          className="max-w-full max-h-64 rounded-xl cursor-pointer"
          onClick={() => {
            window.open(imageUrl, "_blank");
          }}
        />
      );
    }
    return <p className="whitespace-pre-wrap">{msg.body}</p>;
  };

  const renderMessages = () => {
    if (loadingMsgs) {
      return (
        <div className="py-12 flex justify-center">
          <Loader2 className="animate-spin text-brand" size={24} />
        </div>
      );
    }
    if (!sortedMessages || sortedMessages.length === 0) {
      return (
        <p className="text-xs sm:text-sm text-center text-gray-400 py-12 font-medium">
          {t("chat.firstMessage")}
        </p>
      );
    }
    return (
      <AnimatePresence initial={false}>
        {sortedMessages.map((msg) => {
          const isMe = msg.senderId === userId;
          return (
            <motion.div
              key={msg.messageId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[72%] px-4 py-2.5 text-xs sm:text-sm break-words shadow-2xs leading-relaxed ${
                  isMe
                    ? "bg-gray-950 text-white rounded-2xl rounded-br-xs font-medium"
                    : "bg-white text-gray-900 border border-gray-200/90 rounded-2xl rounded-bl-xs font-medium"
                }`}
              >
                {renderMessageBody(msg)}
                <p
                  className={`text-[10px] mt-1 text-right font-medium ${
                    isMe ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {formatMessageTime(msg.sentAt, locale)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    );
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
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden min-h-[600px] h-[calc(100vh-12rem)] flex">
              <div className="w-80 border-r border-gray-100 flex flex-col flex-shrink-0 bg-gray-50/40">
                <div className="p-4 border-b border-gray-100 bg-white">
                  <h2 className="text-base font-bold text-gray-950 mb-3">
                    {t("chat.title")}
                  </h2>
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={15}
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("chat.searchPlaceholder")}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50/60 text-xs sm:text-sm focus:border-gray-900 focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {loadingConvs ? (
                    <div className="p-8 flex justify-center">
                      <Loader2
                        className="animate-spin text-brand"
                        size={22}
                      />
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-xs sm:text-sm text-gray-400 font-medium">
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
                      const isSelected = effectiveSelectedId === conv.conversationId;
                      const senderPrefix = conv.lastMessageSenderId === userId ? `${t("chat.you")}: ` : "";
                      const previewText = conv.lastMessagePreview
                        ? `${senderPrefix}${conv.lastMessagePreview}`
                        : t("chat.startConversation");
                      return (
                        <button
                          key={conv.conversationId}
                          onClick={() => {
                            setSelectedId(conv.conversationId);
                            setMoreMenuOpen(false);
                          }}
                          className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all text-left cursor-pointer ${
                            isSelected
                              ? "bg-brand/10"
                              : "hover:bg-gray-100/70"
                          }`}
                        >
                          <Avatar
                            src={other?.avatarUrl ?? undefined}
                            alt={name}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-sm truncate ${
                                  isSelected
                                    ? "font-bold text-brand"
                                    : "font-semibold text-gray-800"
                                }`}
                              >
                                {name}
                              </span>
                              {conv.lastMessageAt && (
                                <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2 font-medium">
                                  {formatTime(conv.lastMessageAt, locale)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <p className="text-xs text-gray-500 truncate">
                                {previewText}
                              </p>
                              {conv.unreadCount > 0 && (
                                <span className="ml-2 min-w-5 h-5 px-1 bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 shadow-xs">
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
                                <h3 className="text-sm font-bold text-gray-950 truncate">
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
                      <div className="flex items-center gap-1.5 relative" ref={moreMenuRef}>
                        <button
                          onClick={() =>
                            activeConv.archived
                              ? unarchiveMutation.mutate(activeConv.conversationId)
                              : archiveMutation.mutate(activeConv.conversationId)
                          }
                          className="p-2 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                          aria-label={activeConv.archived ? t("chat.unarchive") : t("chat.archive")}
                          title={activeConv.archived ? t("chat.unarchive") : t("chat.archive")}
                          disabled={archiveMutation.isPending || unarchiveMutation.isPending}
                        >
                          <Archive size={17} />
                        </button>
                        <button
                          onClick={() => setMoreMenuOpen((prev) => !prev)}
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            moreMenuOpen
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                          }`}
                          aria-label={t("chat.more")}
                          title={t("chat.more")}
                        >
                          <MoreVertical size={17} />
                        </button>

                        <AnimatePresence>
                          {moreMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              transition={{ duration: 0.12 }}
                              className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-100 p-1.5 z-30"
                            >
                              {activeConv.merchantId && (
                                <Link
                                  href={`/shops/${activeConv.merchantId}`}
                                  onClick={() => setMoreMenuOpen(false)}
                                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-gray-700 hover:text-gray-950 hover:bg-gray-50 rounded-xl transition-colors"
                                >
                                  <Store size={15} className="text-gray-400" />
                                  <span>{t("chat.visitStore")}</span>
                                </Link>
                              )}

                              <button
                                onClick={() => {
                                  setMoreMenuOpen(false);
                                  if (activeConv.archived) {
                                    unarchiveMutation.mutate(activeConv.conversationId);
                                  } else {
                                    archiveMutation.mutate(activeConv.conversationId);
                                  }
                                }}
                                disabled={archiveMutation.isPending || unarchiveMutation.isPending}
                                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-gray-700 hover:text-gray-950 hover:bg-gray-50 rounded-xl transition-colors text-left cursor-pointer"
                              >
                                <Archive size={15} className="text-gray-400" />
                                <span>
                                  {activeConv.archived
                                    ? t("chat.unarchive")
                                    : t("chat.archive")}
                                </span>
                              </button>

                              {(() => {
                                const hasOther = activeConv.participants.some(
                                  (p) => p.userId !== userId,
                                );
                                if (!hasOther) return null;
                                return (
                                  <button
                                    onClick={() => {
                                      setMoreMenuOpen(false);
                                      setReportModalOpen(true);
                                    }}
                                    className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                                  >
                                    <Flag size={15} className="text-rose-500" />
                                    <span>{t("chat.reportStore")}</span>
                                  </button>
                                );
                              })()}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div
                      ref={messagesContainerRef}
                      className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-gray-50/20"
                    >
                      {renderMessages()}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3.5 sm:p-4 border-t border-gray-100 bg-white">
                      <div className="flex items-center gap-2.5">
                        <label
                          className={`w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-900 hover:bg-gray-50 transition-all cursor-pointer shrink-0 ${
                            sendImageMutation.isPending ? "opacity-50" : ""
                          }`}
                          aria-label="Upload image"
                          title={t("chat.uploadImage")}
                        >
                          {sendImageMutation.isPending ? (
                            <Loader2 size={16} className="animate-spin text-brand" />
                          ) : (
                            <ImagePlus size={16} />
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
                          className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-xs sm:text-sm focus:border-gray-900 focus:outline-none transition-all placeholder:text-gray-400 bg-gray-50/50 focus:bg-white"
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
                          className="w-10 h-10 bg-gray-950 text-white rounded-full flex items-center justify-center hover:bg-black transition-all disabled:opacity-30 shadow-xs cursor-pointer disabled:cursor-not-allowed shrink-0"
                          aria-label={t("chat.sendMessage")}
                        >
                          {sendMutation.isPending ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Send size={15} className="ml-0.5" />
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

      <Modal
        isOpen={reportModalOpen}
        onClose={() => {
          if (!reportMutation.isPending) setReportModalOpen(false);
        }}
        title={t("chat.reportStoreTitle")}
        size="md"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-gray-500 leading-relaxed">
            {t("chat.reportStoreDesc")}
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              {t("chat.reportReason")}
            </label>
            <div className="space-y-2">
              {[
                { key: "reportReasonSpam", label: t("chat.reportReasonSpam") },
                {
                  key: "reportReasonOffPlatform",
                  label: t("chat.reportReasonOffPlatform"),
                },
                { key: "reportReasonFake", label: t("chat.reportReasonFake") },
                {
                  key: "reportReasonAttitude",
                  label: t("chat.reportReasonAttitude"),
                },
                {
                  key: "reportReasonOther",
                  label: t("chat.reportReasonOther"),
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all ${
                    reportReasonKey === item.key
                      ? "border-gray-950 bg-gray-50/80 font-medium text-gray-950"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={item.key}
                    checked={reportReasonKey === item.key}
                    onChange={(e) => setReportReasonKey(e.target.value)}
                    className="mt-0.5 text-gray-950 focus:ring-gray-950"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              {t("chat.reportDetails")}
            </label>
            <textarea
              rows={3}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder={t("chat.reportDetailsPlaceholder")}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:border-gray-950 focus:outline-none transition-colors placeholder:text-gray-400 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setReportModalOpen(false)}
              disabled={reportMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={reportMutation.isPending}
              onClick={() => {
                const other = activeConv?.participants.find(
                  (p) => p.userId !== userId,
                );
                const targetId = other?.userId || activeConv?.conversationId;
                const baseName = other?.displayName?.trim() || t("chat.merchantFallback");
                const targetName = targetId ? `${baseName} [ID: ${targetId}]` : baseName;
                const reasonLabel =
                  t(`chat.${reportReasonKey}`) || reportReasonKey;
                reportMutation.mutate({
                  targetName,
                  reason: reasonLabel,
                  details: reportDetails.trim(),
                });
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {reportMutation.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              <span>{t("chat.reportSubmit")}</span>
            </button>
          </div>
        </div>
      </Modal>
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
