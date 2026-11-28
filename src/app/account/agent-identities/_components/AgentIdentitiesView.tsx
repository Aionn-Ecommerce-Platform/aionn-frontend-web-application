"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Plus, Loader2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { Button, EmptyState, Modal } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
import {
  agentIdentityService,
  type AgentIdentityResponse,
} from "@/lib/services/agent-identity.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";

function AgentIdentitiesInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [createdAgent, setCreatedAgent] =
    useState<AgentIdentityResponse | null>(null);
  const [editing, setEditing] = useState<AgentIdentityResponse | null>(null);
  const [detailFor, setDetailFor] = useState<AgentIdentityResponse | null>(null);
  const [revoking, setRevoking] = useState<AgentIdentityResponse | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["agent-identities"],
    queryFn: () => agentIdentityService.list(),
  });

  const agents = data ?? [];

  const suspendMutation = useMutation({
    mutationFn: (agentId: string) => agentIdentityService.suspend(agentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-identities"] });
      toast.success(t("agentIdentities.suspendSuccess"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const revokeMutation = useMutation({
    mutationFn: (agentId: string) => agentIdentityService.revoke(agentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-identities"] });
      toast.success(t("agentIdentities.revokeSuccess"));
      setRevoking(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <MemberPageLayout contentClassName="flex-1 min-w-0 max-w-4xl">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              {t("agentIdentities.title")}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {t("agentIdentities.description")}
            </p>
          </div>
          <Button
            onClick={() => setCreating(true)}
            className="bg-brand hover:bg-brand-strong text-white font-semibold rounded-xl shadow-xs shrink-0"
          >
            <Plus size={16} className="mr-1.5" />
            {t("agentIdentities.create")}
          </Button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-6 flex items-start gap-3.5 shadow-2xs">
          <AlertTriangle
            className="text-amber-600 flex-shrink-0 mt-0.5"
            size={20}
          />
          <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
            {t("agentIdentities.keyWarning")}
          </p>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-brand" size={32} />
          </div>
        ) : agents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title={t("agentIdentities.emptyTitle")}
            description={t("agentIdentities.emptyDescription")}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-400 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50">
                    <th className="whitespace-nowrap px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      {t("agentIdentities.tableAgent")}
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      {t("agentIdentities.tableStatus")}
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      {t("agentIdentities.tableCreated")}
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      {t("agentIdentities.tableActions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => (
                    <AgentRow
                      key={a.agentId}
                      agent={a}
                      onEditPermissions={() => setEditing(a)}
                      onSuspend={() => suspendMutation.mutate(a.agentId)}
                      onRevoke={() => setRevoking(a)}
                      onDetail={() => setDetailFor(a)}
                      suspendPending={
                        suspendMutation.isPending &&
                        suspendMutation.variables === a.agentId
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {creating && (
        <CreateModal
          onClose={() => setCreating(false)}
          onCreated={(agent) => {
            qc.invalidateQueries({ queryKey: ["agent-identities"] });
            setCreating(false);
            setCreatedAgent(agent);
          }}
        />
      )}

      {createdAgent && (
        <ApiKeyModal
          agent={createdAgent}
          onClose={() => setCreatedAgent(null)}
        />
      )}

      {editing && (
        <PermissionsModal
          agent={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["agent-identities"] });
            setEditing(null);
          }}
        />
      )}

      {detailFor && (
        <AgentDetailModal
          agent={detailFor}
          onClose={() => setDetailFor(null)}
        />
      )}

      <Modal
        isOpen={revoking !== null}
        onClose={() => setRevoking(null)}
        title={t("agentIdentities.revokeTitle")}
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 flex items-start gap-2">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <p>{t("agentIdentities.revokeWarning")}</p>
          </div>
          {revoking && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs">
              <p className="font-medium">{revoking.name}</p>
              <p className="text-gray-500 font-mono mt-0.5">
                {revoking.agentId}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setRevoking(null)}
              disabled={revokeMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() =>
                revoking && revokeMutation.mutate(revoking.agentId)
              }
              loading={revokeMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("agentIdentities.revokeForever")}
            </Button>
          </div>
        </div>
      </Modal>
    </MemberPageLayout>
  );
}
import {
  AgentRow,
  AgentDetailModal,
  CreateModal,
  ApiKeyModal,
  PermissionsModal,
} from "./AgentIdentityParts";

export default function AccountAgentIdentitiesPage() {
  return (
    <AuthGuard>
      <AgentIdentitiesInner />
    </AuthGuard>
  );
}
