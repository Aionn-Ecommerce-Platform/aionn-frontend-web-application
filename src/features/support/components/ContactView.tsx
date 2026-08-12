"use client";

import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  HeartHandshake,
  MessageCircle,
  HelpCircle,
  Truck,
  RefreshCw,
  CreditCard,
  User,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/shared/ui";
import { useTranslation } from "@/hooks";

export default function ContactPage() {
  const { t } = useTranslation();

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-8 sm:p-12 text-white shadow-xl mb-10 relative overflow-hidden">
          <div className="absolute right-0 top-0 transform translate-x-12 -translate-y-12 opacity-10 pointer-events-none">
            <HeartHandshake size={320} />
          </div>
          <div className="max-w-2xl relative z-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              {t("contact.title")}
            </h1>
            <p className="text-blue-100 text-base sm:text-lg">
              {t("contact.subtitle")}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-400 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    {t("contact.hotline")}
                  </h3>
                  <p className="text-2xl font-black text-gray-900 mt-1">
                    1900 6868
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t("contact.hotlineHours")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-400 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    {t("contact.email")}
                  </h3>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    support@aionn.vn
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t("contact.emailResponseTime")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-400 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    {t("contact.address")}
                  </h3>
                  <p className="text-sm font-semibold text-gray-800 mt-1 leading-relaxed">
                    {t("contact.addressValue")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-400 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    {t("contact.workingHours")}
                  </h3>
                  <div className="text-sm text-gray-700 font-semibold mt-1 space-y-1">
                    <p>{t("contact.weekdays")}</p>
                    <p>{t("contact.weekends")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6 flex gap-4 items-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                <ShieldCheck size={20} />
              </div>
              <p className="text-xs text-blue-800 font-medium leading-relaxed">
                {t("contact.privacyCommitment")}
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-400 p-8 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <MessageCircle size={26} />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900">
                      {t("contact.liveChatTitle")}
                    </h2>
                    <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                      {t("contact.agentsOnline")}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                {t("contact.liveChatDescription")}
              </p>

              <Link href="/chat">
                <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border-none flex items-center justify-center gap-2">
                  <MessageCircle size={18} />
                  {t("contact.chatNow")}
                </Button>
              </Link>
            </div>

            <div className="bg-white rounded-3xl border border-gray-400 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">
                    {t("contact.helpTitle")}
                  </h2>
                  <p className="text-xs text-gray-550">
                    {t("contact.helpDescription")}
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all group cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <Truck size={16} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 group-hover:text-blue-700">
                    {t("contact.shippingTitle")}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {t("contact.shippingDescription")}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-gray-200 hover:border-red-300 hover:bg-red-50/20 transition-all group cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-3">
                    <RefreshCw size={16} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 group-hover:text-red-700">
                    {t("contact.returnsTitle")}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {t("contact.returnsDescription")}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/20 transition-all group cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                    <CreditCard size={16} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 group-hover:text-purple-700">
                    {t("contact.paymentsTitle")}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {t("contact.paymentsDescription")}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50/20 transition-all group cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                    <User size={16} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 group-hover:text-amber-700">
                    {t("contact.securityTitle")}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {t("contact.securityDescription")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl border border-blue-150 p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-extrabold text-blue-900">
                  {t("contact.feedbackTitle")}
                </h3>
                <p className="text-xs text-blue-700 leading-relaxed">
                  {t("contact.feedbackDescription")}
                </p>
              </div>
              <Link href="/feedback" className="shrink-0">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl shadow-md flex items-center gap-2 border-none">
                  <span>{t("contact.feedbackAction")}</span>
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
