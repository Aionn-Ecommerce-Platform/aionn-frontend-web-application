"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Plus, Edit2, Loader2, Power, PowerOff } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, EmptyState, Modal } from "@/shared/ui";
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
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {t("adminProviders.title")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("adminProviders.description")}
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} className="mr-1.5" />
            {t("adminProviders.add")}
          </Button>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : providers.length === 0 ? (
          <EmptyState
            icon={Send}
            title={t("adminProviders.emptyTitle")}
            description={t("adminProviders.emptyDescription")}
          />
        ) : (
          <div className="bg-white rounded-md border border-gray-400 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-400 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Channel / Type
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("adminProviders.rateLimit")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("common.status")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("common.updatedAt")}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr
                      key={p.providerId}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {p.channel}
                        </p>
                        <p className="text-xs text-gray-500">
                          {p.providerType}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {p.rateLimitPerMinute}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={p.active ? "success" : "default"}>
                          {p.active ? t("common.active") : t("common.disabled")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(p.updatedAt, locale)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleActive(p)}
                            loading={
                              updateMutation.isPending &&
                              updateMutation.variables?.providerId ===
                                p.providerId
                            }
                          >
                            {p.active ? (
                              <PowerOff size={14} />
                            ) : (
                              <Power size={14} />
                            )}
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
              </table>
            </div>
          </div>
        )}
      </div>

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
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:border-blue-500 focus:outline-none"
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
                  className="w-4 h-4 rounded border-gray-300"
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
