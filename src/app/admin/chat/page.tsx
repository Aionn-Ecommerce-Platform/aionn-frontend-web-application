"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Headphones, AlertTriangle, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { conversationService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";

function AdminChatInner() {
  const { t } = useTranslation();
  const router = useRouter();
  const [conversationId, setConversationId] = useState("");
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    const id = conversationId.trim();
    if (!id) {
      toast.error(t("adminChat.idRequired"));
      return;
    }
    setJoining(true);
    try {
      await conversationService.requestSupport(id);
      toast.success(t("adminChat.joinedToast"));
      router.push(`/chat?conversationId=${encodeURIComponent(id)}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Headphones size={22} className="text-blue-600" />
            {t("adminChat.title")}
          </h1>
          <p className="text-sm text-gray-500">{t("adminChat.description")}</p>
        </div>

        <div className="bg-white rounded-md border border-gray-200 p-6">
          <div className="flex items-end gap-3 mb-4">
            <Input
              label="Conversation ID"
              value={conversationId}
              onChange={(e) => setConversationId(e.target.value)}
              placeholder="CONV_..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin();
              }}
            />
            <Button
              onClick={handleJoin}
              loading={joining}
              disabled={!conversationId.trim()}
            >
              <Headphones size={14} className="mr-1" />
              {t("adminChat.join")}
            </Button>
          </div>

          <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 p-3 rounded-lg">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <p>{t("adminChat.idHelp")}</p>
          </div>
        </div>

        <div className="bg-white rounded-md border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MessageCircle size={16} className="text-blue-600" />
            {t("adminChat.myConversations")}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {t("adminChat.myConversationsDescription")}
          </p>
          <Button variant="outline" onClick={() => router.push("/chat")}>
            {t("adminChat.openChat")}
          </Button>
        </div>
      </div>
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
