"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Loader2,
  Copy,
  Pause,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal } from "@/shared/ui";
import {
  agentIdentityService,
  type AgentIdentityResponse,
} from "@/lib/services/agent-identity.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
const statusConfig: Record<
  AgentIdentityResponse["status"],
  { labelKey: string; badgeClass: string }
> = {
  ACTIVE: {
    labelKey: "statuses.agent.ACTIVE",
    badgeClass: "border-emerald-300 bg-emerald-50 text-emerald-700",
  },
  SUSPENDED: {
    labelKey: "statuses.agent.SUSPENDED",
    badgeClass: "border-amber-300 bg-amber-50 text-amber-700",
  },
  REVOKED: {
    labelKey: "statuses.agent.REVOKED",
    badgeClass: "border-rose-300 bg-rose-50 text-rose-700",
  },
};

const COMMON_PERMISSIONS = [
  "READ_PROFILE",
  "READ_ORDERS",
  "READ_CART",
  "WRITE_CART",
  "PLACE_ORDERS",
  "READ_PAYMENTS",
];

const AGENT_AUDIT_LABELS: Record<string, string> = {
  AGENT_SUSPENDED: "agentIdentities.auditEvents.suspended",
};

export function AgentRow({
  agent,
  onEditPermissions,
  onSuspend,
  onRevoke,
  onDetail,
  suspendPending,
}: {
  agent: AgentIdentityResponse;
  onEditPermissions: () => void;
  onSuspend: () => void;
  onRevoke: () => void;
  onDetail: () => void;
  suspendPending: boolean;
}) {
  const { t, locale } = useTranslation();
  const cfg = statusConfig[agent.status];
  const isLive = agent.status === "ACTIVE";

  return (
    <tr className="border-b border-gray-200 transition-colors last:border-0 hover:bg-gray-50/70">
      <td className="px-5 py-4 text-center">
        <p className="text-sm font-bold text-gray-950">{agent.name}</p>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-center">
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${cfg.badgeClass}`}
        >
          {t(cfg.labelKey)}
        </span>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-center">
        <p className="text-sm text-gray-600">
          {formatDateTime(agent.createdAt, locale)}
        </p>
        {agent.suspendedAt && (
          <p className="mt-0.5 text-xs text-gray-400">
            {t("agentIdentities.suspendedAt", {
              date: formatDateTime(agent.suspendedAt, locale),
            })}
          </p>
        )}
      </td>
      <td className="whitespace-nowrap px-5 py-4">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={onDetail}
            title={t("agentIdentities.viewDetail")}
            aria-label={t("agentIdentities.viewDetail")}
            className="rounded-lg p-2 text-sky-600 transition-colors cursor-pointer hover:text-sky-700"
          >
            <Eye size={16} />
          </button>
          {isLive && (
            <>
              <button
                type="button"
                onClick={onEditPermissions}
                title={t("agentIdentities.editPermissions")}
                aria-label={t("agentIdentities.editPermissions")}
                className="rounded-lg p-2 text-brand transition-colors cursor-pointer hover:text-brand-strong"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={onSuspend}
                disabled={suspendPending}
                title={t("agentIdentities.suspend")}
                aria-label={t("agentIdentities.suspend")}
                className="rounded-lg p-2 text-amber-600 transition-colors cursor-pointer hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {suspendPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Pause size={16} />
                )}
              </button>
            </>
          )}
          {agent.status !== "REVOKED" && (
            <button
              type="button"
              onClick={onRevoke}
              title={t("agentIdentities.revoke")}
              aria-label={t("agentIdentities.revoke")}
              className="rounded-lg p-2 text-red-600 transition-colors cursor-pointer hover:text-red-700"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function AgentDetailModal({
  agent,
  onClose,
}: {
  agent: AgentIdentityResponse;
  onClose: () => void;
}) {
  const { t, locale } = useTranslation();
  const cfg = statusConfig[agent.status];
  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ["agent-audit", agent.agentId],
    queryFn: () => agentIdentityService.auditLogs(agent.agentId),
  });
  const logs = auditLogs ?? [];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("agentIdentities.detailTitle", { name: agent.name })}
      size="md"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${cfg.badgeClass}`}
          >
            {t(cfg.labelKey)}
          </span>
          <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-500">
            {agent.agentId}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-gray-500">
              {t("agentIdentities.tableCreated")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {formatDateTime(agent.createdAt, locale)}
            </p>
          </div>
          {agent.suspendedAt && (
            <div>
              <p className="text-xs font-medium text-gray-500">
                {t("agentIdentities.suspend")}
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {formatDateTime(agent.suspendedAt, locale)}
              </p>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500">
            {t("agentIdentities.tablePermissions")}
          </p>
          {agent.permissions.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {agent.permissions.map((p) => (
                <span
                  key={p}
                  className="rounded-md border border-gray-300 bg-gray-50 px-2 py-0.5 font-mono text-[11px] font-medium text-gray-700"
                >
                  {p}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-400">
              {t("agentIdentities.noPermissions")}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500">
            {t("agentIdentities.audit")}
          </p>
          {auditLoading ? (
            <div className="flex justify-center py-3">
              <Loader2 size={18} className="animate-spin text-brand" />
            </div>
          ) : logs.length === 0 ? (
            <p className="mt-1 text-sm text-gray-400">
              {t("agentIdentities.noActivity")}
            </p>
          ) : (
            <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
              {logs.map((log) => {
                const labelKey = AGENT_AUDIT_LABELS[log.action];
                return (
                  <div
                    key={log.logId}
                    className="rounded-lg bg-gray-50 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-gray-900">
                        {labelKey ? t(labelKey) : log.action}
                      </span>
                      <span className="shrink-0 text-gray-400">
                        {formatDateTime(log.timestamp, locale)}
                      </span>
                    </div>
                    {!labelKey && log.details && (
                      <p className="mt-1 text-gray-500">{log.details}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (agent: AgentIdentityResponse) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const mutation = useMutation({
    mutationFn: () => agentIdentityService.create({ name: name.trim() }),
    onSuccess: (agent) => {
      toast.success(t("agentIdentities.createSuccess"));
      onCreated(agent);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal isOpen onClose={onClose} title={t("agentIdentities.createTitle")}>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="agent-name"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            {t("agentIdentities.name")}
          </label>
          <input
            id="agent-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("agentIdentities.namePlaceholder")}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            {t("agentIdentities.nameHelp")}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!name.trim()}
          >
            {t("common.create")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ApiKeyModal({
  agent,
  onClose,
}: {
  agent: AgentIdentityResponse;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  function copyKey() {
    navigator.clipboard.writeText(agent.apiKey).then(() => {
      setCopied(true);
      toast.success(t("agentIdentities.copySuccess"));
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Modal isOpen onClose={onClose} title={t("agentIdentities.apiKeyTitle")}>
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <p>{t("agentIdentities.apiKeyWarning")}</p>
        </div>
        <div>
          <label
            htmlFor="agent-api-key"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            API Key
          </label>
          <div className="flex gap-2">
            <input
              id="agent-api-key"
              type="text"
              readOnly
              value={agent.apiKey}
              className="flex-1 px-3 py-2 border border-gray-400 rounded-lg text-xs font-mono bg-gray-50"
            />
            <Button onClick={copyKey} variant="outline">
              {copied ? (
                <CheckCircle2 size={14} className="text-green-600" />
              ) : (
                <Copy size={14} />
              )}
            </Button>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>{t("agentIdentities.savedClose")}</Button>
        </div>
      </div>
    </Modal>
  );
}

export function PermissionsModal({
  agent,
  onClose,
  onSuccess,
}: {
  agent: AgentIdentityResponse;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [permissions, setPermissions] = useState<string[]>(agent.permissions);
  const [customInput, setCustomInput] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      agentIdentityService.updatePermissions(agent.agentId, { permissions }),
    onSuccess: () => {
      toast.success(t("agentIdentities.permissionsSuccess"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function toggle(p: string) {
    setPermissions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function addCustom() {
    const p = customInput.trim();
    if (!p) return;
    if (!permissions.includes(p)) {
      setPermissions((prev) => [...prev, p]);
    }
    setCustomInput("");
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("agentIdentities.permissionsTitle", { name: agent.name })}
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          {t("agentIdentities.permissionsHelp")}
        </p>

        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">
            {t("agentIdentities.commonPermissions")}
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMON_PERMISSIONS.map((p) => {
              const active = permissions.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => toggle(p)}
                  className={`px-3 py-1.5 rounded-md border text-xs font-mono transition-colors ${
                    active
                      ? "bg-brand/5 border-brand/20 text-brand-strong"
                      : "bg-white border-gray-400 text-gray-500 hover:border-gray-400"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-700 mb-1">
            {t("agentIdentities.addCustomPermission")}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              placeholder="MY_CUSTOM_SCOPE"
              className="flex-1 px-3 py-2 border border-gray-400 rounded-lg text-xs font-mono focus:border-brand focus:outline-none"
            />
            <Button variant="outline" size="sm" onClick={addCustom}>
              {t("common.add")}
            </Button>
          </div>
        </div>

        {permissions.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-2">
              {t("agentIdentities.appliedCount", { count: permissions.length })}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {permissions.map((p) => (
                <span
                  key={p}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-brand/5 text-brand-strong font-mono"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
          >
            {t("common.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
