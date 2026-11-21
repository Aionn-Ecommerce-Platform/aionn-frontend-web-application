"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  CheckCircle,
  ArrowRight,
  Sparkles,
  MessageSquare,
  BarChart3,
  Ticket,
  Info,
  Rocket,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { merchantService } from "@/lib/services";
import { getErrorMessage, getFieldErrors } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";

const BENEFITS = [
  {
    icon: Sparkles,
    title: "merchant.register.benefitAiTitle",
    description: "merchant.register.benefitAiDesc",
  },
  {
    icon: MessageSquare,
    title: "merchant.register.benefitChatTitle",
    description: "merchant.register.benefitChatDesc",
  },
  {
    icon: BarChart3,
    title: "merchant.register.benefitAnalyticsTitle",
    description: "merchant.register.benefitAnalyticsDesc",
  },
  {
    icon: Ticket,
    title: "merchant.register.benefitMarketingTitle",
    description: "merchant.register.benefitMarketingDesc",
  },
];

const STEPS = [
  {
    title: "merchant.register.step1Title",
    description: "merchant.register.step1Desc",
  },
  {
    title: "merchant.register.step2Title",
    description: "merchant.register.step2Desc",
  },
  {
    title: "merchant.register.step3Title",
    description: "merchant.register.step3Desc",
  },
];

function MerchantRegisterInner() {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFieldErrors({ name: t("merchant.register.shopNameRequired") });
      return;
    }
    setLoading(true);
    setFieldErrors({});
    try {
      await merchantService.register(name.trim());
      setSuccess(true);
      toast.success(t("common.success"));
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err, t("common.error")));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-50/60 px-4 py-12">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-400 p-8 sm:p-12 shadow-xs text-center">
          <div className="w-20 h-20 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-950 mb-3">
            {t("merchant.register.successTitle")}
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            {t("merchant.register.successDesc").replace("{name}", name)}
          </p>
          <Button
            size="lg"
            className="w-full bg-brand hover:bg-brand-strong text-white font-bold py-3.5 rounded-xl shadow-xs"
            onClick={() => router.push("/merchant/dashboard")}
          >
            {t("merchant.register.successButton")}
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50/60 min-h-screen py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-purple-800/60 bg-gradient-to-br from-purple-900 via-indigo-950 to-purple-950 p-6 sm:p-10 text-white shadow-xl shadow-purple-950/20">
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-purple-600/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 right-10 h-56 w-56 rounded-full bg-fuchsia-600/20 blur-3xl" />
          <Rocket className="pointer-events-none absolute -right-8 -top-8 h-56 w-56 text-white/5" />

          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-white/10 px-3 py-1 text-xs font-bold text-amber-300">
              <Store size={14} />
              {t("merchant.register.heroBadge")}
            </span>
            <h1 className="mt-5 text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              {t("merchant.register.title")}
            </h1>
            <p className="mt-4 text-sm sm:text-base text-purple-100/90 leading-relaxed">
              {t("merchant.register.subtitle")}
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-2xl font-black text-amber-300">
                  {t("merchant.register.statFee")}
                </p>
                <p className="mt-1 text-xs font-semibold text-purple-100/80">
                  {t("merchant.register.statFeeDesc")}
                </p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-2xl font-black text-amber-300">
                  {t("merchant.register.statCommission")}
                </p>
                <p className="mt-1 text-xs font-semibold text-purple-100/80">
                  {t("merchant.register.statCommissionDesc")}
                </p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-2xl font-black text-amber-300">
                  {t("merchant.register.statBuyers")}
                </p>
                <p className="mt-1 text-xs font-semibold text-purple-100/80">
                  {t("merchant.register.statBuyersDesc")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-gray-400 p-6 sm:p-8 shadow-xs">
              <div className="flex items-center gap-3 border-b border-gray-200 pb-5">
                <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <Store size={22} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-gray-950">
                    {t("merchant.register.submit")}
                  </h2>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <Input
                  id="shopName"
                  label={t("merchant.register.shopName")}
                  placeholder={t("merchant.register.shopNamePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={fieldErrors.name}
                  required
                  maxLength={100}
                  className="rounded-xl border-gray-400 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none transition-all py-3 font-medium"
                />

                <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-brand">
                    <Info size={18} />
                    <span>{t("merchant.register.noteTitle")}</span>
                  </div>
                  <ul className="mt-3 space-y-2.5 text-sm text-gray-600 leading-relaxed">
                    {[
                      "merchant.register.noteKyc",
                      "merchant.register.noteFee",
                      "merchant.register.notePayout",
                    ].map((key) => (
                      <li key={key} className="flex items-start gap-2">
                        <CheckCircle
                          size={16}
                          className="mt-0.5 shrink-0 text-brand"
                        />
                        <span>{t(key)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-brand hover:bg-brand-strong text-white font-bold py-3.5 rounded-xl shadow-xs transition-all"
                  size="lg"
                  loading={loading}
                >
                  {t("merchant.register.submit")}
                </Button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-400 p-6 shadow-xs">
              <h2 className="text-lg font-bold text-gray-950">
                {t("merchant.register.benefitTitle")}
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {BENEFITS.map((benefit) => {
                  const Icon = benefit.icon;
                  return (
                    <div
                      key={benefit.title}
                      className="rounded-xl border border-gray-400 bg-white p-4"
                    >
                      <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                        <Icon size={18} />
                      </div>
                      <h3 className="mt-3 text-sm font-bold text-gray-950">
                        {t(benefit.title)}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                        {t(benefit.description)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-400 p-6 shadow-xs">
              <h2 className="text-lg font-bold text-gray-950">
                {t("merchant.register.stepTitle")}
              </h2>
              <ol className="mt-5 space-y-4">
                {STEPS.map((step, index) => (
                  <li key={step.title} className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-950">
                        {t(step.title)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                        {t(step.description)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MerchantRegisterPage() {
  return (
    <AuthGuard>
      <MerchantRegisterInner />
    </AuthGuard>
  );
}
