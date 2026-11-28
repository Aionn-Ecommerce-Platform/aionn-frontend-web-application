"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Plus, Edit2, Loader2, Power, PowerOff } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminTable,
  adminPrimaryClass,
  adminRow,
  adminTd,
  adminTh,
} from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import {
  notificationProviderService,
  type ProviderResult,
} from "@/lib/services/notification.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";

const channels = ["EMAIL", "SMS", "PUSH", "IN_APP"];

function AdminProvidersInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProviderResult | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-notif-providers"],
    queryFn: () => notificationProviderService.list(),
  });

  const providers = data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({
      providerId,
      body,
    }: {
      providerId: string;
      body: { config: string; rateLimitPerMinute?: number; active: boolean };
    }) => notificationProviderService.update(providerId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notif-providers"] });
      toast.success(t("adminProviders.updateSuccess"));
      setEditing(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const toggleActive = (p: ProviderResult) => {
    updateMutation.mutate({
      providerId: p.providerId,
      body: {
        config: p.config,
        rateLimitPerMinute: p.rateLimitPerMinute,
        active: !p.active,
      },
    });
  };

  return (
    <div className="min-h-screen">
      <AdminHeader
        icon={Send}
        title={t("adminProviders.title")}
        description={t("adminProviders.description")}
        actions={
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={adminPrimaryClass}
          >
            <Plus size={16} />
            {t("adminProviders.add")}
          </button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : providers.length === 0 ? (
        <AdminEmpty
          icon={Send}
          title={t("adminProviders.emptyTitle")}
          description={t("adminProviders.emptyDescription")}
        />
      ) : (
        <AdminTable>
          <thead>
            <tr className="border-b border-slate-600/60 bg-white/[0.03]">
              <th className={adminTh}>{t("common.name")}</th>
              <th className={`${adminTh} text-right`}>
                {t("adminProviders.rateLimit")}
              </th>
              <th className={adminTh}>{t("common.status")}</th>
              <th className={adminTh}>{t("common.date")}</th>
              <th className={`${adminTh} text-right`}>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.providerId} className={adminRow}>
                <td className={adminTd}>
                  <p className="font-semibold text-white">{p.channel}</p>
                  <p className="text-xs text-slate-400">{p.providerType}</p>
                </td>
                <td className={`${adminTd} text-right`}>
                  {p.rateLimitPerMinute}
                </td>
                <td className={adminTd}>
                  <AdminPill tone={p.active ? "success" : "neutral"}>
                    {p.active ? t("common.active") : t("common.inactive")}
                  </AdminPill>
                </td>
                <td className={`${adminTd} text-xs text-slate-400`}>
                  {formatDateTime(p.updatedAt, locale)}
                </td>
                <td className={`${adminTd} text-right`}>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(p)}
                      loading={
                        updateMutation.isPending &&
                        updateMutation.variables?.providerId === p.providerId
                      }
                    >
                      {p.active ? <PowerOff size={14} /> : <Power size={14} />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(p)}
                    >
                      <Edit2 size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}

      {creating && (
        <ProviderFormModal
          mode="create"
          onClose={() => setCreating(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["admin-notif-providers"] });
            setCreating(false);
          }}
        />
      )}

      {editing && (
        <ProviderFormModal
          mode="edit"
          provider={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["admin-notif-providers"] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ProviderFormModal({
  mode,
  provider,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  provider?: ProviderResult;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [channel, setChannel] = useState(provider?.channel ?? "EMAIL");
  const [providerType, setProviderType] = useState(
    provider?.providerType ?? "",
  );
  const [config, setConfig] = useState(provider?.config ?? "{}");
  const [rateLimit, setRateLimit] = useState(
    String(provider?.rateLimitPerMinute ?? 60),
  );
  const [active, setActive] = useState(provider?.active ?? true);

  const createMutation = useMutation({
    mutationFn: () =>
      notificationProviderService.configure({
        channel,
        providerType,
        config,
        rateLimitPerMinute: Number(rateLimit) || 60,
      }),
    onSuccess: () => {
      toast.success(t("adminProviders.createSuccess"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      notificationProviderService.update(provider!.providerId, {
        config,
        rateLimitPerMinute: Number(rateLimit) || 60,
        active,
      }),
    onSuccess: () => {
      toast.success(t("adminProviders.updateSuccess"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const submit = () => {
    try {
      JSON.parse(config);
    } catch {
      toast.error(t("adminProviders.invalidConfig"));
      return;
    }
    if (mode === "create") {
      if (!providerType.trim()) {
        toast.error(t("adminProviders.providerTypeRequired"));
        return;
      }
      createMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={
        mode === "create"
          ? t("adminProviders.createTitle")
          : t("adminProviders.editTitle")
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="provider-channel"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Channel
            </label>
            <select
              id="provider-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              disabled={mode === "edit"}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
            >
              {channels.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="provider-type"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Provider type
            </label>
            <input
              id="provider-type"
              type="text"
              placeholder="SENDGRID, TWILIO, FCM..."
              value={providerType}
              onChange={(e) => setProviderType(e.target.value)}
              disabled={mode === "edit"}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="provider-config"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Config (JSON)
          </label>
          <textarea
            id="provider-config"
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:border-brand focus:outline-none"
            placeholder='{"apiKey": "...", "from": "..."}'
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="provider-rate-limit"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              {t("adminProviders.rateLimit")}
            </label>
            <input
              id="provider-rate-limit"
              type="number"
              value={rateLimit}
              onChange={(e) => setRateLimit(e.target.value)}
              min="1"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          {mode === "edit" && (
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-400"
                />
                {t("common.active")}
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} loading={isPending}>
            {mode === "create" ? t("common.create") : t("common.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminProvidersPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN"]}>
      <AdminProvidersInner />
    </AuthGuard>
  );
}
