"use client";

import { useState } from "react";
import { Send, BarChart3, Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input } from "@/shared/ui";
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
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("adminNotificationDispatch.title")}
        </h1>

        <div className="bg-white rounded-md border border-gray-200 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
            <Send size={18} className="text-blue-600" />
            {t("adminNotificationDispatch.dispatchTitle")}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {t("adminNotificationDispatch.dispatchDescription")}
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Event Type *"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="ORDER_PLACED, USER_REGISTERED..."
              />
              <Input
                label="User ID *"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="USR_..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("adminNotificationDispatch.variables")}
              </label>
              <div className="space-y-2">
                {vars.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={v.key}
                      onChange={(e) => updateVar(idx, "key", e.target.value)}
                      placeholder={t(
                        "adminNotificationDispatch.keyPlaceholder",
                      )}
                      className="flex-1"
                    />
                    <Input
                      value={v.value}
                      onChange={(e) => updateVar(idx, "value", e.target.value)}
                      placeholder={t(
                        "adminNotificationDispatch.valuePlaceholder",
                      )}
                      className="flex-[2]"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVar(idx)}
                      disabled={vars.length === 1}
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addVar}>
                  <Plus size={14} className="mr-1" />
                  {t("adminNotificationDispatch.addVariable")}
                </Button>
              </div>
            </div>

            <Button
              onClick={handleSend}
              loading={sending}
              disabled={!eventType.trim() || !userId.trim()}
            >
              <Send size={14} className="mr-1" />
              {t("adminNotificationDispatch.send")}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-md border border-gray-200 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
            <BarChart3 size={18} className="text-purple-600" />
            Campaign Analytics
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {t("adminNotificationDispatch.analyticsDescription")}
          </p>

          <div className="flex items-end gap-3 mb-4">
            <Input
              label="Campaign ID"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              placeholder="CAMP_..."
              className="flex-1"
            />
            <Button onClick={handleLoadAnalytics} loading={loadingAnalytics}>
              {t("adminNotificationDispatch.loadAnalytics")}
            </Button>
          </div>

          {loadingAnalytics ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="animate-spin text-purple-600" size={28} />
            </div>
          ) : analytics ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                {JSON.stringify(analytics, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">
              {t("adminNotificationDispatch.noAnalytics")}
            </p>
          )}
        </div>
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
