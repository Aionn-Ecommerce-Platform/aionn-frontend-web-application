"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserX, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button, ConfirmDialog } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
import { useTranslation } from "@/hooks";
import { blockService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { qk } from "@/lib/query-keys";
import { formatDateTime } from "@/shared/lib/utils";

function ChatBlockedInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading: loading } = useQuery({
    queryKey: qk.chatBlocks,
    queryFn: () => blockService.list(),
  });
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => blockService.unblock(userId),
    onSuccess: async () => {
      toast.success(t("chatBlocked.unblockedToast"));
      await qc.invalidateQueries({ queryKey: qk.chatBlocks });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
    onSettled: () => setUnblocking(null),
  });

  const blockedUsers = data ?? [];

  return (
    <MemberPageLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t("chatBlocked.title")}
      </h1>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 flex justify-center">
          <Loader2 className="animate-spin text-blue-600" size={28} />
        </div>
      ) : blockedUsers.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {blockedUsers.map((block) => (
            <div
              key={block.blockId}
              className="p-6 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <UserX size={20} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {t("chat.blockedUserFallback")}
                  </p>
                  <p className="text-xs font-mono text-gray-500">
                    {block.blockedId}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("chatBlocked.blockedAt", {
                      date: formatDateTime(block.blockedAt, locale),
                    })}
                  </p>
                  {block.reason && (
                    <p className="text-xs text-gray-600 mt-1">
                      {t("chatBlocked.reason", { reason: block.reason })}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUnblocking(block.blockedId)}
              >
                <Trash2 size={14} className="mr-2" />
                {t("chatBlocked.unblock")}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <UserX className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t("chatBlocked.emptyTitle")}
          </h3>
          <p className="text-sm text-gray-500">
            {t("chatBlocked.emptyDescription")}
          </p>
        </div>
      )}

      <ConfirmDialog
        isOpen={unblocking !== null}
        onClose={() => setUnblocking(null)}
        onConfirm={() => unblocking && unblockMutation.mutate(unblocking)}
        title={t("chatBlocked.confirmTitle")}
        message={t("chatBlocked.confirmMessage")}
        confirmLabel={t("chatBlocked.unblock")}
        loading={unblockMutation.isPending}
      />
    </MemberPageLayout>
  );
}

export default function ChatBlockedPage() {
  return (
    <AuthGuard>
      <ChatBlockedInner />
    </AuthGuard>
  );
}
