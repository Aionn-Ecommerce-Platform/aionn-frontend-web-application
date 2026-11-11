"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Truck,
  Eye,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MessageCircle,
  Phone,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import { Button } from "@/shared/ui";
import { useTranslation } from "@/hooks";

export default function ReturnsPolicyPage() {
  const { t } = useTranslation();

  const eligible = [
    t("returnPolicyPage.eligible1"),
    t("returnPolicyPage.eligible2"),
    t("returnPolicyPage.eligible3"),
    t("returnPolicyPage.eligible4"),
  ];
  const ineligible = [
    t("returnPolicyPage.ineligible1"),
    t("returnPolicyPage.ineligible2"),
    t("returnPolicyPage.ineligible3"),
    t("returnPolicyPage.ineligible4"),
  ];
  const refundMethods = [
    {
      title: t("returnPolicyPage.refundWalletTitle"),
      time: t("returnPolicyPage.refundWalletTime"),
      note: t("returnPolicyPage.refundWalletNote"),
      accent: "text-emerald-600",
    },
    {
      title: t("returnPolicyPage.refundAtmTitle"),
      time: t("returnPolicyPage.refundAtmTime"),
      note: t("returnPolicyPage.refundAtmNote"),
      accent: "text-gray-900",
    },
    {
      title: t("returnPolicyPage.refundCardTitle"),
      time: t("returnPolicyPage.refundCardTime"),
      note: t("returnPolicyPage.refundCardNote"),
      accent: "text-gray-900",
    },
  ];
  const faq = [
    {
      question: t("returnPolicyPage.faq1Question"),
      answer: t("returnPolicyPage.faq1Answer"),
    },
    {
      question: t("returnPolicyPage.faq2Question"),
      answer: t("returnPolicyPage.faq2Answer"),
    },
    {
      question: t("returnPolicyPage.faq3Question"),
      answer: t("returnPolicyPage.faq3Answer"),
    },
  ];

  return (
    <div className="bg-gray-50/60 min-h-screen py-6 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-gray-500"
        >
          <Link
            href="/"
            className="hover:text-gray-900 transition-colors flex items-center gap-1"
          >
            {t("returnPolicyPage.breadcrumbHome")}
          </Link>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-gray-400">
            {t("returnPolicyPage.breadcrumbPolicy")}
          </span>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="font-semibold text-gray-900">
            {t("returnPolicyPage.breadcrumbReturns")}
          </span>
        </nav>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-gray-950 via-gray-900 to-gray-800 text-white p-6 sm:p-10 lg:p-12 shadow-xl border border-gray-800">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold backdrop-blur-md">
              <ShieldCheck size={16} className="text-red-400" />
              <span>{t("returnPolicyPage.heroBadge")}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              {t("returnPolicyPage.heroTitle")}
            </h1>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-normal">
              {t("returnPolicyPage.heroDesc")}
            </p>
            <div className="pt-2 flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {t("returnPolicyPage.lastUpdated")}
              </span>
            </div>
          </div>

          {/* Decorative Background Icon */}
          <ShieldCheck
            size={280}
            className="absolute -right-12 -bottom-16 text-white/5 pointer-events-none stroke-[1]"
          />
        </div>

        {/* 3 Core Commitments */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-950 tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {t("returnPolicyPage.sectionCommitmentsTitle")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Commitment 1 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
                  <RotateCcw size={22} className="stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {t("productDetail.commitment1Title")}
                </h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  {t("productDetail.commitment1Desc")}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                <CheckCircle2 size={15} />
                <span>{t("returnPolicyPage.commitment1Footer")}</span>
              </div>
            </div>

            {/* Commitment 2 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Truck size={22} className="stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {t("productDetail.commitment2Title")}
                </h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  {t("productDetail.commitment2Desc")}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 size={15} />
                <span>{t("returnPolicyPage.commitment2Footer")}</span>
              </div>
            </div>

            {/* Commitment 3 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Eye size={22} className="stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {t("productDetail.commitment3Title")}
                </h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  {t("productDetail.commitment3Desc")}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                <CheckCircle2 size={15} />
                <span>{t("returnPolicyPage.commitment3Footer")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Steps Timeline */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-950 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {t("returnPolicyPage.sectionProcessTitle")}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {t("returnPolicyPage.processIntro")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: t("productDetail.step1Title"),
                desc: t("returnPolicyPage.step1Desc"),
              },
              {
                title: t("productDetail.step2Title"),
                desc: t("returnPolicyPage.step2Desc"),
              },
              {
                title: t("productDetail.step3Title"),
                desc: t("returnPolicyPage.step3Desc"),
              },
              {
                title: t("productDetail.step4Title"),
                desc: t("returnPolicyPage.step4Desc"),
              },
            ].map((step, index) => (
              <div
                key={step.title}
                className="relative p-5 rounded-2xl bg-gray-50/70 border border-gray-200/70 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block mb-3">
                    {t("returnPolicyPage.stepLabel", { step: index + 1 })}
                  </span>
                  <h4 className="text-sm font-bold text-gray-900">
                    {step.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conditions: Eligible vs Non-eligible */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Eligible */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
              <h3 className="text-base font-bold text-gray-950">
                {t("returnPolicyPage.sectionConditionsTitle")}
              </h3>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-gray-600">
              {eligible.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2
                    size={16}
                    className="text-emerald-500 shrink-0 mt-0.5"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Non-Eligible */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                <XCircle size={18} />
              </div>
              <h3 className="text-base font-bold text-gray-950">
                {t("returnPolicyPage.sectionNonReturnableTitle")}
              </h3>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-gray-600">
              {ineligible.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Refund Timeline & Methods */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-950">
              {t("returnPolicyPage.refundTitle")}
            </h3>
          </div>
          <p className="text-xs text-gray-500">
            {t("returnPolicyPage.refundIntro")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {refundMethods.map((method) => (
              <div
                key={method.title}
                className="p-4 rounded-xl bg-gray-50 border border-gray-100"
              >
                <h4 className="text-xs font-bold text-gray-900">
                  {method.title}
                </h4>
                <p className={`text-lg font-black mt-1 ${method.accent}`}>
                  {method.time}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">{method.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <HelpCircle size={18} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-950">
              {t("returnPolicyPage.sectionFaqTitle")}
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            {faq.map((item) => (
              <div key={item.question} className="py-3.5 space-y-1">
                <p className="text-xs sm:text-sm font-bold text-gray-900">
                  {item.question}
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Live Support Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-r from-red-500 to-rose-600 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-lg shadow-red-500/20">
          <div className="space-y-1">
            <h3 className="text-base sm:text-xl font-bold">
              {t("returnPolicyPage.needHelpTitle")}
            </h3>
            <p className="text-xs sm:text-sm text-red-100 leading-relaxed max-w-xl">
              {t("returnPolicyPage.needHelpDesc")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link href="/chat">
              <Button className="px-5 py-2.5 bg-white text-red-600 hover:bg-gray-100 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 border-none">
                <MessageCircle size={16} />
                <span>{t("returnPolicyPage.chatNow")}</span>
              </Button>
            </Link>

            <Link href="/contact">
              <Button className="px-5 py-2.5 bg-red-600/60 hover:bg-red-700/60 text-white font-semibold text-xs rounded-xl border border-white/20 transition-colors flex items-center gap-1.5">
                <Phone size={15} />
                <span>{t("returnPolicyPage.contactUs")}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
