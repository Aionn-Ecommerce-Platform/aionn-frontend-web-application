"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, Plus, Ticket } from "lucide-react";
import toast from "react-hot-toast";
import { Button, EmptyState } from "@/shared/ui";
import type { IssueVoucherInput } from "@/lib/services";
import type { Voucher } from "@/types";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";

type Props = {
  title: string;
  description: string;
  queryKey: readonly unknown[];
  load: () => Promise<Voucher[]>;
  issue: (input: IssueVoucherInput) => Promise<Voucher>;
};

const initialForm = {
  voucherCode: "",
  discountAmount: "",
  usageLimit: "",
  validFrom: "",
  validUntil: "",
};

export default function VoucherManagement({
  title,
  description,
  queryKey,
  load,
  issue,
}: Props) {
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const { data: vouchers, isLoading } = useQuery({ queryKey, queryFn: load });

  const mutation = useMutation({
    mutationFn: issue,
    onSuccess: () => {
      toast.success(t("promotions.mgmtCreateSuccess"));
      setForm(initialForm);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      voucherCode: form.voucherCode.trim().toUpperCase(),
      discountAmount: Number(form.discountAmount),
      currency: "VND",
      usageLimit: Number(form.usageLimit),
      validFrom: new Date(form.validFrom).toISOString(),
      validUntil: new Date(form.validUntil).toISOString(),
    });
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
          <Button onClick={() => setShowForm((value) => !value)}>
            <Plus size={16} className="mr-1" /> {t("promotions.mgmtCreateBtn")}
          </Button>
        </div>

        {showForm ? (
          <form
            onSubmit={submit}
            className="max-w-3xl bg-white border border-gray-400 rounded-xl p-5 mb-6 grid md:grid-cols-2 gap-4 shadow-sm"
          >
            <Field label={t("promotions.mgmtFieldCode")}>
              <input
                required
                maxLength={50}
                value={form.voucherCode}
                onChange={(e) =>
                  setForm({ ...form, voucherCode: e.target.value })
                }
                className="field uppercase"
                placeholder="SHOP50K"
              />
            </Field>
            <Field label={t("promotions.mgmtFieldDiscount")}>
              <input
                required
                type="number"
                min="1"
                value={form.discountAmount}
                onChange={(e) =>
                  setForm({ ...form, discountAmount: e.target.value })
                }
                className="field"
              />
            </Field>
            <Field label={t("promotions.mgmtFieldUsageLimit")}>
              <input
                required
                type="number"
                min="1"
                value={form.usageLimit}
                onChange={(e) =>
                  setForm({ ...form, usageLimit: e.target.value })
                }
                className="field"
              />
            </Field>
            <div />
            <Field label={t("promotions.mgmtFieldStart")}>
              <input
                required
                type="datetime-local"
                value={form.validFrom}
                onChange={(e) =>
                  setForm({ ...form, validFrom: e.target.value })
                }
                className="field"
              />
            </Field>
            <Field label={t("promotions.mgmtFieldEnd")}>
              <input
                required
                type="datetime-local"
                value={form.validUntil}
                onChange={(e) =>
                  setForm({ ...form, validUntil: e.target.value })
                }
                className="field"
              />
            </Field>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                {t("promotions.mgmtCancelBtn")}
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                {t("promotions.mgmtIssueBtn")}
              </Button>
            </div>
          </form>
        ) : null}

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" />
          </div>
        ) : !vouchers?.length ? (
          <EmptyState
            icon={Ticket}
            title={t("promotions.mgmtEmptyTitle")}
            description={t("promotions.mgmtEmptyDesc")}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vouchers.map((v) => {
              const isShop = v.scope === "SHOP";
              const isFreeship = v.voucherCode
                .toLowerCase()
                .includes("freeship");
              let leftBgColor = "bg--commerce";
              let leftTagText = t("promotions.platformLabel");
              if (isFreeship) {
                leftBgColor = "bg--shipping";
                leftTagText = t("promotions.freeshipLabel");
              } else if (isShop) {
                leftBgColor = "bg--shop";
                leftTagText = t("promotions.tabShop");
              }
              const expiryString = v.validUntil
                ? formatDate(v.validUntil, locale)
                : "N/A";
              const progressPercent =
                v.usageLimit > 0 ? (v.usedCount / v.usageLimit) * 100 : 0;
              const remainingClaims = Math.max(v.usageLimit - v.usedCount, 0);

              return (
                <div
                  key={v.voucherCode}
                  className="relative flex bg-white border border-gray-400 rounded-xl hover:shadow-lg transition-all min-h-[128px]"
                >
                  <div className="absolute top-0 left-28 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-50 border border-gray-400 z-10" />
                  <div className="absolute bottom-0 left-28 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-gray-50 border border-gray-400 z-10" />

                  <div
                    className={`w-28 flex flex-col items-center justify-center text-white px-2 text-center select-none shrink-0 relative ${leftBgColor}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-1">
                      <Ticket size={20} className="text-white" />
                    </div>
                    <span className="text-xs font-black tracking-wide uppercase truncate max-w-full drop-shadow">
                      {leftTagText}
                    </span>
                    <span className="text-[9px] opacity-80 font-mono mt-0.5">
                      {v.scope}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-between py-5 px-5 pl-6 border-l border-dashed border-gray-400 relative">
                    <div>
                      <h3 className="text-base font-extrabold text-gray-900 leading-tight mb-2">
                        {t("promotions.discountAmount", {
                          amount: formatCurrency(v.discountAmount, v.currency),
                        })}
                      </h3>
                      <div className="mt-1.5 space-y-1 text-xs text-gray-500">
                        <p className="font-semibold text-gray-800 font-mono">
                          {v.voucherCode}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock size={11} />
                          <span>
                            {t("promotions.validUntil", {
                              date: expiryString,
                            })}
                          </span>
                        </div>
                        {v.usageLimit > 0 && (
                          <div
                            className={`text-[11px] font-bold mt-1 ${
                              isFreeship
                                ? "text--shipping"
                                : isShop
                                  ? "text--shop"
                                  : "text--commerce"
                            }`}
                          >
                            {t("promotions.stockLeft", {
                              count: remainingClaims,
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {v.usageLimit > 0 && (
                      <div className="mt-3.5">
                        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isFreeship
                                ? "bg--shipping"
                                : isShop
                                  ? "bg--shop"
                                  : "bg--commerce"
                            }`}
                            style={{
                              width: `${Math.min(progressPercent, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <style jsx>{`
          .field {
            width: 100%;
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            padding: 0.625rem 0.75rem;
            font-size: 0.875rem;
            outline: none;
          }
          .field:focus {
            border-color: #3b82f6;
          }
        `}</style>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      <span className="block mb-1">{label}</span>
      {children}
    </label>
  );
}
