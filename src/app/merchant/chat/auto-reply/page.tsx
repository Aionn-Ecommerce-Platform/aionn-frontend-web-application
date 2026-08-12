"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Save, Loader2, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { Button, FormField as Field } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { merchantService } from "@/lib/services";
import { autoReplyService } from "@/lib/services/chat.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";

const DAY_KEYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

function MerchantAutoReplyInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const dayShortLabels: Record<(typeof DAY_KEYS)[number], string> = {
    MONDAY: t("merchant.autoReply.days.monday"),
    TUESDAY: t("merchant.autoReply.days.tuesday"),
    WEDNESDAY: t("merchant.autoReply.days.wednesday"),
    THURSDAY: t("merchant.autoReply.days.thursday"),
    FRIDAY: t("merchant.autoReply.days.friday"),
    SATURDAY: t("merchant.autoReply.days.saturday"),
    SUNDAY: t("merchant.autoReply.days.sunday"),
  };

  const { data: merchant } = useQuery({
    queryKey: ["merchant", "me"],
    queryFn: () => merchantService.getMine(),
  });

  const merchantId = merchant?.merchantId;

  const { data: cfg, isLoading } = useQuery({
    queryKey: ["chat-auto-reply", merchantId],
    queryFn: () => autoReplyService.get(merchantId!),
    enabled: !!merchantId,
  });

  const [enabled, setEnabled] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [awayMessage, setAwayMessage] = useState("");
  const [workingHourStart, setWorkingHourStart] = useState("");
  const [workingHourEnd, setWorkingHourEnd] = useState("");
  const [workingDays, setWorkingDays] = useState<string[]>([]);

  useEffect(() => {
    if (!cfg) return;
    queueMicrotask(() => {
      setEnabled(cfg.enabled);
      setGreeting(cfg.greeting ?? "");
      setAwayMessage(cfg.awayMessage ?? "");
      setWorkingHourStart(cfg.workingHourStart ?? "");
      setWorkingHourEnd(cfg.workingHourEnd ?? "");
      setWorkingDays(cfg.workingDays ?? []);
    });
  }, [cfg]);

  const saveMutation = useMutation({
    mutationFn: () =>
      autoReplyService.update(merchantId!, {
        enabled,
        greeting: greeting.trim() || undefined,
        awayMessage: awayMessage.trim() || undefined,
        workingHourStart: workingHourStart || undefined,
        workingHourEnd: workingHourEnd || undefined,
        workingDays: workingDays.length > 0 ? workingDays : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-auto-reply", merchantId] });
      toast.success(t("merchant.autoReply.toast.saved"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const dirty = useMemo(() => {
    if (!cfg) return false;
    return (
      enabled !== cfg.enabled ||
      greeting !== (cfg.greeting ?? "") ||
      awayMessage !== (cfg.awayMessage ?? "") ||
      workingHourStart !== (cfg.workingHourStart ?? "") ||
      workingHourEnd !== (cfg.workingHourEnd ?? "") ||
      JSON.stringify([...workingDays].sort()) !==
        JSON.stringify([...(cfg.workingDays ?? [])].sort())
    );
  }, [
    cfg,
    enabled,
    greeting,
    awayMessage,
    workingHourStart,
    workingHourEnd,
    workingDays,
  ]);

  if (!merchantId) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={28} />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {t("merchant.autoReply.title")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("merchant.autoReply.subtitle")}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : (
          <div className="max-w-3xl bg-white rounded-md border border-gray-400 p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-400">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Bot className="text-blue-600" size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-gray-900">
                    {t("merchant.autoReply.toggle.title")}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t("merchant.autoReply.toggle.description")}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  aria-label={t("merchant.autoReply.toggle.title")}
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-checked:bg-blue-600 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5"></div>
              </label>
            </div>

            <Field
              label={t("merchant.autoReply.greeting.label")}
              hint={t("merchant.autoReply.greeting.hint")}
            >
              <textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                rows={3}
                maxLength={500}
                disabled={!enabled}
                placeholder={t("merchant.autoReply.greeting.placeholder")}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
              />
            </Field>

            <Field
              label={t("merchant.autoReply.away.label")}
              hint={t("merchant.autoReply.away.hint")}
            >
              <textarea
                value={awayMessage}
                onChange={(e) => setAwayMessage(e.target.value)}
                rows={3}
                maxLength={500}
                disabled={!enabled}
                placeholder={t("merchant.autoReply.away.placeholder")}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label={t("merchant.autoReply.hourStart")}>
                <div className="relative">
                  <Clock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={16}
                  />
                  <input
                    type="time"
                    value={workingHourStart}
                    onChange={(e) => setWorkingHourStart(e.target.value)}
                    disabled={!enabled}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
                  />
                </div>
              </Field>
              <Field label={t("merchant.autoReply.hourEnd")}>
                <div className="relative">
                  <Clock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={16}
                  />
                  <input
                    type="time"
                    value={workingHourEnd}
                    onChange={(e) => setWorkingHourEnd(e.target.value)}
                    disabled={!enabled}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
                  />
                </div>
              </Field>
            </div>

            <Field label={t("merchant.autoReply.workingDays.label")}>
              <div className="flex flex-wrap gap-2">
                {DAY_KEYS.map((key) => {
                  const active = workingDays.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!enabled}
                      onClick={() =>
                        setWorkingDays((prev) =>
                          prev.includes(key)
                            ? prev.filter((x) => x !== key)
                            : [...prev, key],
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        active
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {dayShortLabels[key]}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {t("merchant.autoReply.workingDays.hint")}
              </p>
            </Field>

            <div className="pt-4 border-t border-gray-400 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {cfg
                  ? t("merchant.autoReply.lastUpdated", {
                      time: formatDateTime(cfg.updatedAt),
                    })
                  : t("merchant.autoReply.noConfig")}
              </p>
              <Button
                onClick={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
                disabled={!dirty}
              >
                <Save size={14} className="mr-1.5" />
                {t("merchant.autoReply.save")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MerchantAutoReplyPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantAutoReplyInner />
    </AuthGuard>
  );
}
