"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Loader2,
  Copy,
  Pause,
  Trash2,
  ScrollText,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, Modal } from "@/shared/ui";
import {
  agentIdentityService,
  type AgentIdentityResponse,
} from "@/lib/services/agent-identity.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
const statusConfig: Record<
  AgentIdentityResponse["status"],
  { labelKey: string; variant: "success" | "warning" | "danger" }
> = {
  ACTIVE: { labelKey: "statuses.agent.ACTIVE", variant: "success" },
  SUSPENDED: { labelKey: "statuses.agent.SUSPENDED", variant: "warning" },
  REVOKED: { labelKey: "statuses.agent.REVOKED", variant: "danger" },
};

const COMMON_PERMISSIONS = [
  "READ_PROFILE",
  "READ_ORDERS",
  "READ_CART",
  "WRITE_CART",
  "PLACE_ORDERS",
  "READ_PAYMENTS",
];

export function AgentRow({
  agent,
  onEditPermissions,
  onSuspend,
  onRevoke,
  onAudit,
  suspendPending,
}: {
  agent: AgentIdentityResponse;
  onEditPermissions: () => void;
  onSuspend: () => void;
  onRevoke: () => void;
  onAudit: () => void;
  suspendPending: boolean;
}) {
  const { t, locale } = useTranslation();
  const cfg = statusConfig[agent.status];
  const isLive = agent.status === "ACTIVE";

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {agent.name}
            </h3>
            <Badge variant={cfg.variant}>{t(cfg.labelKey)}</Badge>
          </div>
          <p className="text-xs text-gray-500 font-mono">{agent.agentId}</p>
          <p className="text-xs text-gray-400 mt-1">
            {t("agentIdentities.createdAt", {
              date: formatDateTime(agent.createdAt, locale),
            })}
            {agent.suspendedAt &&
              ` · ${t("agentIdentities.suspendedAt", { date: formatDateTime(agent.suspendedAt, locale) })}`}
          </p>
          {agent.permissions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {agent.permissions.map((p) => (
                <span
                  key={p}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-mono"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onAudit}>
            <ScrollText size={14} className="mr-1" />
            Audit
          </Button>
          {isLive && (
            <>
              <Button variant="outline" size="sm" onClick={onEditPermissions}>
                {t("agentIdentities.editPermissions")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSuspend}
                loading={suspendPending}
              >
                <Pause size={14} className="mr-1" />
                {t("agentIdentities.suspend")}
              </Button>
            </>
          )}
          {agent.status !== "REVOKED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRevoke}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 size={14} className="mr-1" />
              {t("agentIdentities.revoke")}
            </Button>
          )}
        </div>
      </div>
    </div>
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
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
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
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono bg-gray-50"
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
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
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
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:border-blue-500 focus:outline-none"
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
                  className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono"
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

export function AuditModal({
  agent,
  onClose,
}: {
  agent: AgentIdentityResponse;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["agent-audit", agent.agentId],
    queryFn: () => agentIdentityService.auditLogs(agent.agentId),
  });

  const logs = data ?? [];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Audit log — ${agent.name}`}
      size="md"
    >
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="animate-spin text-blue-600" size={24} />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          {t("agentIdentities.noActivity")}
        </p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.logId}
              className="bg-gray-50 rounded-lg px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-medium text-gray-900">
                  {log.action}
                </span>
                <span className="text-gray-400">
                  {formatDateTime(log.timestamp)}
                </span>
              </div>
              {log.details && <p className="text-gray-600">{log.details}</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
