"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Client, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { tokenStore } from "@/shared/api";
import { logger } from "@/shared/lib/logger";
import { useAuthStore } from "@/stores/auth.store";

interface NotificationCreatedEvent {
  type: "NOTIFICATION_CREATED";
  notiId: string;
  createdAt: string;
}

function getWebSocketUrl(): string {
  if (typeof window === "undefined") return "";
  const origin =
    process.env.NEXT_PUBLIC_API_ORIGIN ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
    "http://localhost:8080";
  return `${origin}/ws/chat`;
}

export default function NotificationRealtimeBoundary() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);

  useEffect(() => {
    if (!isAuthenticated || isInitializing || typeof window === "undefined") {
      return;
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(getWebSocketUrl()),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      beforeConnect: () => {
        const token = tokenStore.getAccessToken();
        client.connectHeaders = token
          ? { Authorization: `Bearer ${token}` }
          : {};
      },
      onConnect: () => {
        // Reconcile events missed while offline before listening for new ones.
        void queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
        client.subscribe("/user/queue/notifications", (frame: IMessage) => {
          try {
            const event = JSON.parse(frame.body) as NotificationCreatedEvent;
            if (event.type !== "NOTIFICATION_CREATED" || !event.notiId) return;
            void queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
          } catch (error) {
            logger.error("Failed to parse notification realtime event", error);
          }
        });
      },
      onStompError: (frame) => {
        logger.error("Notification STOMP error", frame.headers["message"]);
      },
    });

    client.activate();
    return () => {
      void client.deactivate();
    };
  }, [isAuthenticated, isInitializing, queryClient]);

  return null;
}
