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
  DollarSign,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { merchantService } from "@/lib/services";
import { getErrorMessage, getFieldErrors } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";

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
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-lg bg-white rounded-3xl border border-gray-400 p-8 sm:p-12 shadow-md">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
            {t("merchant.register.successTitle")}
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            {t("merchant.register.successDesc").replace("{name}", name)}
          </p>
          <Button
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-md shadow-md"
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
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 rounded-3xl p-8 sm:p-12 text-white shadow-xl mb-12 relative overflow-hidden">
          <div className="absolute right-0 top-0 transform translate-x-16 -translate-y-16 opacity-10 pointer-events-none">
            <Rocket size={360} />
          </div>
          <div className="max-w-3xl relative z-10">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
              {t("merchant.register.title")}
            </h1>
            <p className="text-blue-100 text-base sm:text-lg mb-8 leading-relaxed">
              {t("merchant.register.subtitle")}
            </p>

            <div className="grid grid-cols-3 gap-4 sm:gap-6 pt-6 border-t border-white/20">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-yellow-300 font-bold mb-1">
                  <DollarSign size={18} />
                  <span className="text-lg sm:text-2xl font-black">
                    {t("merchant.register.statFee")}
                  </span>
                </div>
                <p className="text-xs text-blue-200 font-semibold">
                  {t("merchant.register.statFeeDesc")}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-yellow-300 font-bold mb-1">
                  <DollarSign size={18} />
                  <span className="text-lg sm:text-2xl font-black">
                    {t("merchant.register.statCommission")}
                  </span>
                </div>
                <p className="text-xs text-blue-200 font-semibold">
                  {t("merchant.register.statCommissionDesc")}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-yellow-300 font-bold mb-1">
                  <Users size={18} />
                  <span className="text-lg sm:text-2xl font-black">
                    {t("merchant.register.statBuyers")}
                  </span>
                </div>
                <p className="text-xs text-blue-200 font-semibold">
                  {t("merchant.register.statBuyersDesc")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 flex">
            <div className="bg-white rounded-3xl border border-gray-400 p-8 sm:p-10 shadow-sm w-full">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Store size={24} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  {t("merchant.register.submit")}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-7">
                <Input
                  id="shopName"
                  label={t("merchant.register.shopName")}
                  placeholder={t("merchant.register.shopNamePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={fieldErrors.name}
                  required
                  maxLength={100}
                  className="rounded-md border-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all py-3 font-medium text-base"
                />

                <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-6 space-y-4">
                  <div className="flex items-center gap-2 text-blue-800 font-bold text-base">
                    <Info size={18} />
                    <span>{t("merchant.register.noteTitle")}</span>
                  </div>
                  <ul className="space-y-3 text-sm text-blue-700 leading-relaxed list-none pl-0">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">-</span>
                      <span>{t("merchant.register.noteKyc")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">-</span>
                      <span>{t("merchant.register.noteFee")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">-</span>
                      <span>{t("merchant.register.notePayout")}</span>
                    </li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-md shadow-md hover:shadow-lg transition-all duration-200 border-none text-base"
                  size="lg"
                  loading={loading}
                >
                  {t("merchant.register.submit")}
                </Button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <h2 className="text-2xl font-black text-gray-900 pl-1">
              {t("merchant.register.benefitTitle")}
            </h2>

            <div className="grid flex-1 grid-cols-1 gap-3 pt-4">
              <div className="bg-white rounded-2xl border border-gray-400 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-9 h-9 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3">
                  <Sparkles size={18} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">
                  {t("merchant.register.benefitAiTitle")}
                </h3>
                <p className="text-xs text-gray-500 leading-normal">
                  {t("merchant.register.benefitAiDesc")}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-400 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-9 h-9 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                  <MessageSquare size={18} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">
                  {t("merchant.register.benefitChatTitle")}
                </h3>
                <p className="text-xs text-gray-500 leading-normal">
                  {t("merchant.register.benefitChatDesc")}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-400 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-9 h-9 rounded-md bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-3">
                  <BarChart3 size={18} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">
                  {t("merchant.register.benefitAnalyticsTitle")}
                </h3>
                <p className="text-xs text-gray-500 leading-normal">
                  {t("merchant.register.benefitAnalyticsDesc")}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-400 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-9 h-9 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
                  <Ticket size={18} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">
                  {t("merchant.register.benefitMarketingTitle")}
                </h3>
                <p className="text-xs text-gray-500 leading-normal">
                  {t("merchant.register.benefitMarketingDesc")}
                </p>
              </div>
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
