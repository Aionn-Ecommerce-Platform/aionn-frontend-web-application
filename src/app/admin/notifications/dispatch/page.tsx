"use client";

import { useState } from "react";
import { Send, BarChart3, Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/shared/ui";
import { AdminHeader, adminPrimaryClass } from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import {
  notificationService,
  notificationProviderService,
} from "@/lib/services/notification.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";

interface VarRow {
  key: string;
  value: string;
}

function AdminNotificationDispatchInner() {
  const { t } = useTranslation();
  const [eventType, setEventType] = useState("");
  const [userId, setUserId] = useState("");
  const [vars, setVars] = useState<VarRow[]>([{ key: "", value: "" }]);
  const [sending, setSending] = useState(false);

  const [campaignId, setCampaignId] = useState("");
  const [analytics, setAnalytics] = useState<unknown>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  function addVar() {
    setVars([...vars, { key: "", value: "" }]);
  }
  function removeVar(idx: number) {
    setVars(vars.filter((_, i) => i !== idx));
  }
  function updateVar(idx: number, field: keyof VarRow, value: string) {
    setVars(vars.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  }

  async function handleSend() {
    if (!eventType.trim() || !userId.trim()) {
      toast.error(t("adminNotificationDispatch.required"));
      return;
    }
    const variables = vars
      .filter((v) => v.key.trim())
      .reduce<Record<string, string>>((acc, v) => {
        acc[v.key.trim()] = v.value;
        return acc;
      }, {});

    setSending(true);
    try {
      await notificationService.dispatch({
        eventType: eventType.trim(),
        userId: userId.trim(),
        variables,
      });
      toast.success(t("adminNotificationDispatch.sentToast"));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function handleLoadAnalytics() {
    if (!campaignId.trim()) {
      toast.error(t("adminNotificationDispatch.campaignRequired"));
      return;
    }
    setLoadingAnalytics(true);
    try {
      const data = await notificationProviderService.analytics(
        campaignId.trim(),
      );
      setAnalytics(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setAnalytics(null);
    } finally {
      setLoadingAnalytics(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AdminHeader icon={Send} title={t("adminNotificationDispatch.title")} />

      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-600/60 bg-white/[0.04] p-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
            <Send size={18} className="text-purple-300" />
            {t("adminNotificationDispatch.dispatchTitle")}
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            {t("adminNotificationDispatch.dispatchDescription")}
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="dispatch-event-type"
                  className="mb-1 block text-sm font-medium text-slate-300"
                >
                  Event Type *
                </label>
                <input
                  id="dispatch-event-type"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  placeholder="ORDER_PLACED, USER_REGISTERED..."
                  className="w-full rounded-xl border border-gray-500 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label
                  htmlFor="dispatch-user-id"
                  className="mb-1 block text-sm font-medium text-slate-300"
                >
                  User ID *
                </label>
                <input
                  id="dispatch-user-id"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="USR_..."
                  className="w-full rounded-xl border border-gray-500 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                {t("adminNotificationDispatch.variables")}
              </label>
              <div className="space-y-2">
                {vars.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={v.key}
                      onChange={(e) => updateVar(idx, "key", e.target.value)}
                      placeholder={t(
                        "adminNotificationDispatch.keyPlaceholder",
                      )}
                      className="w-full flex-1 rounded-xl border border-gray-500 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                    <input
                      value={v.value}
                      onChange={(e) => updateVar(idx, "value", e.target.value)}
                      placeholder={t(
                        "adminNotificationDispatch.valuePlaceholder",
                      )}
                      className="w-full flex-[2] rounded-xl border border-gray-500 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVar(idx)}
                      disabled={vars.length === 1}
                    >
                      <Trash2 size={14} className="text-rose-400" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addVar}>
                  <Plus size={14} className="mr-1" />
                  {t("adminNotificationDispatch.addVariable")}
                </Button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !eventType.trim() || !userId.trim()}
              className={adminPrimaryClass}
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {t("adminNotificationDispatch.send")}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-600/60 bg-white/[0.04] p-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
            <BarChart3 size={18} className="text-purple-300" />
            Campaign Analytics
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            {t("adminNotificationDispatch.analyticsDescription")}
          </p>

          <div className="mb-4 flex items-end gap-3">
            <div className="flex-1">
              <label
                htmlFor="dispatch-campaign-id"
                className="mb-1 block text-sm font-medium text-slate-300"
              >
                Campaign ID
              </label>
              <input
                id="dispatch-campaign-id"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                placeholder="CAMP_..."
                className="w-full rounded-xl border border-gray-500 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <button
              type="button"
              onClick={handleLoadAnalytics}
              disabled={loadingAnalytics}
              className={adminPrimaryClass}
            >
              {loadingAnalytics ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <BarChart3 size={14} />
              )}
              {t("adminNotificationDispatch.loadAnalytics")}
            </button>
          </div>

          {loadingAnalytics ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-purple-300" size={28} />
            </div>
          ) : analytics ? (
            <div className="overflow-x-auto rounded-xl border border-slate-600/60 bg-white/[0.04] p-4">
              <pre className="whitespace-pre-wrap font-mono text-xs text-slate-300">
                {JSON.stringify(analytics, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">
              {t("adminNotificationDispatch.noAnalytics")}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminNotificationDispatchPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminNotificationDispatchInner />
    </AuthGuard>
  );
}
