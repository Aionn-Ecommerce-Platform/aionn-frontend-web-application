import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useChatSocket } from "./useChatSocket";
import { qk } from "@/lib/query-keys";
import type { ChatMessage } from "@/types";

let mockPublish: ReturnType<typeof vi.fn>;
let mockSubscribe: ReturnType<typeof vi.fn>;
let mockActivate: ReturnType<typeof vi.fn>;
let mockDeactivate: ReturnType<typeof vi.fn>;
let capturedClientConfig: Record<string, unknown>;
let clientInstance: {
  connected: boolean;
  active: boolean;
  connectHeaders: Record<string, string>;
  beforeConnect?: () => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

vi.mock("sockjs-client", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/services/chat.service", () => ({
  conversationService: {
    markRead: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@stomp/stompjs", () => {
  class MockClient {
    connected = false;
    active = false;
    connectHeaders: Record<string, string> = {};
    beforeConnect?: () => void;
    onConnect?: () => void;
    onDisconnect?: () => void;

    constructor(config: Record<string, unknown>) {
      capturedClientConfig = config;
      this.beforeConnect = config.beforeConnect as (() => void) | undefined;
      this.onConnect = config.onConnect as (() => void) | undefined;
      this.onDisconnect = config.onDisconnect as (() => void) | undefined;
      clientInstance = this;
    }

    activate() {
      this.active = true;
      mockActivate();
    }

    deactivate() {
      this.active = false;
      this.connected = false;
      mockDeactivate();
    }

    publish(params: unknown) {
      mockPublish(params);
    }

    subscribe(dest: string, callback: (frame: { body: string }) => void) {
      return mockSubscribe(dest, callback);
    }
  }

  return {
    Client: MockClient,
  };
});

describe("useChatSocket", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockPublish = vi.fn();
    mockSubscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
    mockActivate = vi.fn();
    mockDeactivate = vi.fn();
    capturedClientConfig = {};
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it("does not activate STOMP client when enabled is false", () => {
    const { result } = renderHook(
      () =>
        useChatSocket({
          activeConversationId: "conv-1",
          currentUserId: "user-1",
          enabled: false,
        }),
      { wrapper },
    );

    expect(result.current.isConnected).toBe(false);
    expect(mockActivate).not.toHaveBeenCalled();
  });

  it("activates STOMP client and subscribes on connect", () => {
    const { result } = renderHook(
      () =>
        useChatSocket({
          activeConversationId: "conv-1",
          currentUserId: "user-1",
          enabled: true,
        }),
      { wrapper },
    );

    expect(mockActivate).toHaveBeenCalled();

    // Trigger onConnect callback
    act(() => {
      clientInstance.connected = true;
      const onConnect = capturedClientConfig.onConnect as () => void;
      onConnect();
    });

    expect(result.current.isConnected).toBe(true);
    // Subscribes to user queue and conversation topic
    expect(mockSubscribe).toHaveBeenCalledWith(
      "/user/queue/messages",
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalledWith(
      "/topic/conversations/conv-1",
      expect.any(Function),
    );
  });

  it("handles incoming messages and updates query cache", () => {
    renderHook(
      () =>
        useChatSocket({
          activeConversationId: "conv-1",
          currentUserId: "user-1",
          enabled: true,
        }),
      { wrapper },
    );

    let messageCallback: ((frame: { body: string }) => void) | undefined;
    mockSubscribe.mockImplementation((dest, cb) => {
      if (dest === "/user/queue/messages") {
        messageCallback = cb;
      }
      return { unsubscribe: vi.fn() };
    });

    act(() => {
      clientInstance.connected = true;
      const onConnect = capturedClientConfig.onConnect as () => void;
      onConnect();
    });

    expect(messageCallback).toBeDefined();

    const incoming: ChatMessage = {
      messageId: "msg-123",
      conversationId: "conv-1",
      senderId: "merchant-1",
      senderRole: "MERCHANT",
      type: "TEXT",
      body: "Hello buyer",
      metadata: null,
      status: "SENT",
      deliveredTo: [],
      readBy: [],
      recalled: false,
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    act(() => {
      messageCallback?.({ body: JSON.stringify(incoming) });
    });

    const cachedMessages = queryClient.getQueryData<ChatMessage[]>(
      qk.messages("conv-1"),
    );
    expect(cachedMessages).toEqual([incoming]);
  });

  it("handles TYPING events from partner", () => {
    let topicCallback: ((frame: { body: string }) => void) | undefined;
    mockSubscribe.mockImplementation((dest, cb) => {
      if (dest === "/topic/conversations/conv-1") {
        topicCallback = cb;
      }
      return { unsubscribe: vi.fn() };
    });

    const { result } = renderHook(
      () =>
        useChatSocket({
          activeConversationId: "conv-1",
          currentUserId: "user-1",
          enabled: true,
        }),
      { wrapper },
    );

    act(() => {
      clientInstance.connected = true;
      const onConnect = capturedClientConfig.onConnect as () => void;
      onConnect();
    });

    expect(result.current.isPartnerTyping).toBe(false);

    // Partner started typing
    act(() => {
      topicCallback?.({
        body: JSON.stringify({
          type: "TYPING",
          conversationId: "conv-1",
          userId: "partner-user",
          typing: true,
        }),
      });
    });

    expect(result.current.isPartnerTyping).toBe(true);

    // Partner stopped typing
    act(() => {
      topicCallback?.({
        body: JSON.stringify({
          type: "TYPING",
          conversationId: "conv-1",
          userId: "partner-user",
          typing: false,
        }),
      });
    });

    expect(result.current.isPartnerTyping).toBe(false);
  });

  it("sends typing indicator via publish", () => {
    const { result } = renderHook(
      () =>
        useChatSocket({
          activeConversationId: "conv-1",
          currentUserId: "user-1",
          enabled: true,
        }),
      { wrapper },
    );

    act(() => {
      clientInstance.connected = true;
      const onConnect = capturedClientConfig.onConnect as () => void;
      onConnect();
    });

    act(() => {
      result.current.sendTyping(true);
    });

    expect(mockPublish).toHaveBeenCalledWith({
      destination: "/app/chat/conversations/conv-1/typing",
      body: JSON.stringify({ typing: true }),
    });
  });
});
