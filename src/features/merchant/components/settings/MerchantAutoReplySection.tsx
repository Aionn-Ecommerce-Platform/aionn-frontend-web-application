"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, ChevronDown, Clock, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { FormField as Field } from "@/shared/ui";
import { merchantService } from "@/lib/services";
import { autoReplyService } from "@/lib/services/chat.service";
import { getErrorMessage } from "@/shared/lib/errors";
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

export default function MerchantAutoReplySection() {
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

  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [awayMessage, setAwayMessage] = useState("");
  const [workingHourStart, setWorkingHourStart] = useState("");
  const [workingHourEnd, setWorkingHourEnd] = useState("");
  const [workingDays, setWorkingDays] = useState<string[]>([]);

  useEffect(() => {
    if (window.location.hash === "#auto-reply") {
      queueMicrotask(() => setOpen(true));
    }
  }, []);

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

  const toggleMutation = useMutation({
    mutationFn: (next: boolean) =>
      autoReplyService.update(merchantId!, {
        enabled: next,
        greeting: greeting.trim() || undefined,
        awayMessage: awayMessage.trim() || undefined,
        workingHourStart: workingHourStart || undefined,
        workingHourEnd: workingHourEnd || undefined,
        workingDays: workingDays.length > 0 ? workingDays : undefined,
      }),
    onMutate: (next) => setEnabled(next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-auto-reply", merchantId] });
      toast.success(t("merchant.autoReply.toast.saved"));
    },
    onError: (err, next) => {
      setEnabled(!next);
      toast.error(getErrorMessage(err));
    },
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

  if (!merchantId) return null;

  return (
    <section id="auto-reply" className="mt-8 scroll-mt-24">
      <div className="overflow-hidden rounded-2xl border border-gray-600 bg-white/[0.04]">
        <div className="flex items-center gap-3 px-6 py-5">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
          >
            <ChevronDown
              size={18}
              className={`shrink-0 text-gray-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
            <Bot size={20} className="shrink-0 text-purple-300" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-white">
                {t("merchant.autoReply.title")}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {t("merchant.autoReply.subtitle")}
              </p>
            </div>
          </button>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              aria-label={t("merchant.autoReply.toggle.title")}
              checked={enabled}
              disabled={!cfg || toggleMutation.isPending}
              onChange={(event) => toggleMutation.mutate(event.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-white/15 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:content-[''] after:transition-transform peer-checked:bg-brand peer-checked:after:translate-x-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-50" />
          </label>
        </div>

        {open &&
          (isLoading ? (
            <div className="flex justify-center border-t border-gray-600 py-16">
              <Loader2 className="animate-spin text-purple-400" size={28} />
            </div>
          ) : (
            <div className="space-y-6 border-t border-gray-600 px-6 py-6">
              <Field
                label={t("merchant.autoReply.greeting.label")}
                hint={t("merchant.autoReply.greeting.hint")}
              >
                <textarea
                  value={greeting}
                  onChange={(event) => setGreeting(event.target.value)}
                  rows={3}
                  maxLength={500}
                  disabled={!enabled}
                  placeholder={t("merchant.autoReply.greeting.placeholder")}
                  className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-white/[0.02] disabled:text-slate-500"
                />
              </Field>

              <Field
                label={t("merchant.autoReply.away.label")}
                hint={t("merchant.autoReply.away.hint")}
              >
                <textarea
                  value={awayMessage}
                  onChange={(event) => setAwayMessage(event.target.value)}
                  rows={3}
                  maxLength={500}
                  disabled={!enabled}
                  placeholder={t("merchant.autoReply.away.placeholder")}
                  className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-white/[0.02] disabled:text-slate-500"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label={t("merchant.autoReply.hourStart")}>
                  <div className="relative">
                    <Clock
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                      size={16}
                    />
                    <input
                      type="time"
                      value={workingHourStart}
                      onChange={(event) =>
                        setWorkingHourStart(event.target.value)
                      }
                      disabled={!enabled}
                      className="w-full rounded-lg border border-white/15 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-white/[0.02] disabled:text-slate-500"
                    />
                  </div>
                </Field>
                <Field label={t("merchant.autoReply.hourEnd")}>
                  <div className="relative">
                    <Clock
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                      size={16}
                    />
                    <input
                      type="time"
                      value={workingHourEnd}
                      onChange={(event) =>
                        setWorkingHourEnd(event.target.value)
                      }
                      disabled={!enabled}
                      className="w-full rounded-lg border border-white/15 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-white/[0.02] disabled:text-slate-500"
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
                              ? prev.filter((item) => item !== key)
                              : [...prev, key],
                          )
                        }
                        className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          active
                            ? "border-brand/40 bg-brand/15 text-purple-200"
                            : "border-white/15 bg-white/[0.04] text-slate-400 hover:border-white/30"
                        }`}
                      >
                        {dayShortLabels[key]}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {t("merchant.autoReply.workingDays.hint")}
                </p>
              </Field>

              <div className="flex items-center justify-end border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={!dirty || saveMutation.isPending}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-900/40 transition-all hover:from-purple-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saveMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {t("merchant.autoReply.save")}
                </button>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
