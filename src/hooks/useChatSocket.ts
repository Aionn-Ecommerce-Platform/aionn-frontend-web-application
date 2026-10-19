"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { tokenStore } from "@/shared/api";
import { qk } from "@/lib/query-keys";
import { conversationService } from "@/lib/services/chat.service";
import { logger } from "@/shared/lib/logger";
import type { ChatConversation, ChatMessage } from "@/types";

interface UseChatSocketOptions {
  activeConversationId: string | null;
  currentUserId: string | undefined;
  enabled?: boolean;
}

interface ConversationEvent {
  type: "TYPING" | "CONVERSATION_READ" | "MESSAGE_RECALLED";
  conversationId: string;
  userId?: string;
  typing?: boolean;
  messageId?: string;
  readAt?: string;
}

function getWebSocketUrl(): string {
  if (typeof window === "undefined") return "";
  const origin =
    process.env.NEXT_PUBLIC_API_ORIGIN ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
    "http://localhost:8080";
  return `${origin}/ws/chat`;
}

export function useChatSocket({
  activeConversationId,
  currentUserId,
  enabled = true,
}: UseChatSocketOptions) {
  const qc = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const clientRef = useRef<Client | null>(null);
  const userSubRef = useRef<StompSubscription | null>(null);
  const convSubRef = useRef<StompSubscription | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeConversationIdRef = useRef(activeConversationId);
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const handleIncomingMessage = useCallback(
    (msg: ChatMessage) => {
      // 1. Append or update message in query cache
      qc.setQueryData<ChatMessage[]>(
        qk.messages(msg.conversationId),
        (prev) => {
          if (!prev) return [msg];
          if (prev.some((m) => m.messageId === msg.messageId)) {
            return prev.map((m) => (m.messageId === msg.messageId ? msg : m));
          }
          return [...prev, msg];
        },
      );

      // 2. Update conversation preview and unread count in conversations query cache
      qc.setQueriesData<ChatConversation[]>(
        { queryKey: ["chat", "conversations"] },
        (prev) => {
          if (!prev) return prev;
          return prev.map((c) => {
            if (c.conversationId === msg.conversationId) {
              const isActive =
                activeConversationIdRef.current === msg.conversationId;
              const isMe = msg.senderId === currentUserIdRef.current;
              return {
                ...c,
                lastMessageId: msg.messageId,
                lastMessagePreview: msg.body,
                lastMessageType: msg.type,
                lastMessageSenderId: msg.senderId,
                lastMessageAt: msg.sentAt,
                unreadCount: isActive || isMe ? 0 : (c.unreadCount ?? 0) + 1,
              };
            }
            return c;
          });
        },
      );

      // 3. Invalidate or refresh
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });

      // 4. If current conversation is active and msg is from someone else, mark as read
      if (
        activeConversationIdRef.current === msg.conversationId &&
        msg.senderId !== currentUserIdRef.current
      ) {
        void conversationService.markRead(msg.conversationId).then(() => {
          qc.invalidateQueries({ queryKey: qk.unreadCounts });
        });
      } else {
        qc.invalidateQueries({ queryKey: qk.unreadCounts });
      }
    },
    [qc],
  );

  const handleConversationEvent = useCallback(
    (event: ConversationEvent) => {
      if (event.type === "TYPING") {
        if (event.userId && event.userId !== currentUserIdRef.current) {
          setIsPartnerTyping(Boolean(event.typing));
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          if (event.typing) {
            typingTimeoutRef.current = setTimeout(() => {
              setIsPartnerTyping(false);
            }, 5000);
          }
        }
      } else if (event.type === "MESSAGE_RECALLED" && event.messageId) {
        qc.setQueryData<ChatMessage[]>(
          qk.messages(event.conversationId),
          (prev) => {
            if (!prev) return prev;
            return prev.map((m) =>
              m.messageId === event.messageId ? { ...m, recalled: true } : m,
            );
          },
        );
      } else if (event.type === "CONVERSATION_READ") {
        qc.setQueryData<ChatMessage[]>(
          qk.messages(event.conversationId),
          (prev) => {
            if (!prev) return prev;
            return prev.map((m) =>
              m.senderId === currentUserIdRef.current
                ? { ...m, status: "READ" }
                : m,
            );
          },
        );
      }
    },
    [qc],
  );

  const subscribeToActiveConversation = useCallback(
    (client: Client, convId: string | null) => {
      if (convSubRef.current) {
        convSubRef.current.unsubscribe();
        convSubRef.current = null;
      }
      setIsPartnerTyping(false);
      if (!convId || !client.connected) return;

      convSubRef.current = client.subscribe(
        `/topic/conversations/${convId}`,
        (frame: IMessage) => {
          try {
            const event = JSON.parse(frame.body) as ConversationEvent;
            handleConversationEvent(event);
          } catch (err) {
            logger.error("Failed to parse conversation event", err);
          }
        },
      );
    },
    [handleConversationEvent],
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      if (clientRef.current?.active) {
        clientRef.current.deactivate();
      }
      return;
    }

    const wsUrl = getWebSocketUrl();
    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      beforeConnect: () => {
        const token = tokenStore.getAccessToken();
        if (token) {
          client.connectHeaders = {
            Authorization: `Bearer ${token}`,
          };
        }
      },
      onConnect: () => {
        setIsConnected(true);
        // Subscribe to user queue messages
        userSubRef.current = client.subscribe(
          "/user/queue/messages",
          (frame: IMessage) => {
            try {
              const msg = JSON.parse(frame.body) as ChatMessage;
              handleIncomingMessage(msg);
            } catch (err) {
              logger.error("Failed to parse chat message", err);
            }
          },
        );

        // Subscribe to active conversation topic
        subscribeToActiveConversation(client, activeConversationIdRef.current);
      },
      onDisconnect: () => {
        setIsConnected(false);
        setIsPartnerTyping(false);
      },
      onStompError: (frame) => {
        logger.error("STOMP error", frame.headers["message"]);
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (convSubRef.current) {
        convSubRef.current.unsubscribe();
        convSubRef.current = null;
      }
      if (userSubRef.current) {
        userSubRef.current.unsubscribe();
        userSubRef.current = null;
      }
      client.deactivate();
      clientRef.current = null;
      setIsConnected(false);
      setIsPartnerTyping(false);
    };
  }, [enabled, handleIncomingMessage, subscribeToActiveConversation]);

  // Handle active conversation changes while already connected
  useEffect(() => {
    const client = clientRef.current;
    if (client && client.connected) {
      subscribeToActiveConversation(client, activeConversationId);
    }
  }, [activeConversationId, subscribeToActiveConversation]);

  const sendTyping = useCallback((typing: boolean) => {
    const convId = activeConversationIdRef.current;
    if (!convId) return;

    const client = clientRef.current;
    if (client && client.connected) {
      client.publish({
        destination: `/app/chat/conversations/${convId}/typing`,
        body: JSON.stringify({ typing }),
      });
    }
  }, []);

  return {
    isConnected,
    isPartnerTyping,
    sendTyping,
  };
}
