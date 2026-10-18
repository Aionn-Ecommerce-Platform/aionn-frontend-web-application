"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Send,
  Star,
  Bug,
  Sparkles,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/shared/ui";
import { feedbackService } from "@/lib/services";
import { useAuthStore } from "@/stores";
import type { FeedbackCategory } from "@/lib/services/feedback.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";

const CATEGORY_CONFIG: {
  value: FeedbackCategory;
  translationKey: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  {
    value: "GENERAL",
    translationKey: "feedback.typeGeneral",
    icon: Sparkles,
  },
  {
    value: "BUG",
    translationKey: "feedback.typeBug",
    icon: Bug,
  },
  {
    value: "FEATURE_REQUEST",
    translationKey: "feedback.typeFeature",
    icon: Lightbulb,
  },
  {
    value: "COMPLAINT",
    translationKey: "feedback.typeComplaint",
    icon: AlertCircle,
  },
];

export default function FeedbackPage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const [category, setCategory] = useState<FeedbackCategory>("GENERAL");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = useMutation({
    mutationFn: feedbackService.submit,
    onSuccess: () => {
      toast.success(t("feedback.success"));
      setSubmitted(true);
      setSubject("");
      setContent("");
      setRating(0);
      if (!isAuthenticated) {
        setContactEmail("");
        setContactPhone("");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (err) => toast.error(getErrorMessage(err, t("feedback.error"))),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      toast.error(t("feedback.contentRequired"));
      return;
    }
    submit.mutate({
      category,
      subject: subject.trim() || undefined,
      content: content.trim(),
      rating: rating > 0 ? rating : undefined,
      contactEmail:
        contactEmail.trim() ||
        (isAuthenticated ? (user?.email ?? undefined) : undefined),
      contactPhone:
        contactPhone.trim() ||
        (isAuthenticated ? (user?.phone ?? undefined) : undefined),
    });
  }

  return (
    <div className="bg-white min-h-screen py-8 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Title */}
        <div className="mb-8 lg:mb-12 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
            {t("feedback.title")}
          </h1>
          {t("feedback.subtitle") && (
            <p className="mt-2 text-base text-gray-600 leading-relaxed">
              {t("feedback.subtitle")}
            </p>
          )}
        </div>

        {/* 2-Column Split: Borderless seamless canvas */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* Left Column: Form */}
          <div className="lg:col-span-6">
            {submitted ? (
              <div className="py-12 px-6 rounded-2xl bg-gray-50/70 border border-gray-100 text-center space-y-4">
                <div className="w-16 h-16 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle size={36} />
                </div>
                <h3 className="text-2xl font-bold text-gray-950">
                  {t("feedback.success")}
                </h3>
                <p className="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">
                  {t("feedback.successDesc")}
                </p>
                <div className="pt-4">
                  <Button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="bg-brand hover:bg-brand-strong text-white font-semibold px-6 py-2.5 rounded-xl shadow-xs"
                  >
                    {t("feedback.submit")}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-6">
                {/* Category Selection: Open Chips */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-3">
                    {t("feedback.type")}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {CATEGORY_CONFIG.map((c) => {
                      const Icon = c.icon;
                      const isSelected = category === c.value;
                      return (
                        <button
                          type="button"
                          key={c.value}
                          onClick={() => setCategory(c.value)}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-left text-sm font-semibold transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? "border-brand bg-brand/5 text-brand shadow-xs ring-1 ring-brand/30"
                              : "border-gray-200 bg-gray-50/60 text-gray-700 hover:border-gray-300 hover:bg-gray-100/80"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-brand text-white shadow-xs"
                                : "bg-white text-gray-600 shadow-2xs"
                            }`}
                          >
                            <Icon size={16} />
                          </div>
                          <span className="truncate">{t(c.translationKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject Title */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    {t("feedback.title_field")}
                  </label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={200}
                    placeholder={t("feedback.titlePlaceholder")}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/40 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none transition-all"
                  />
                </div>

                {/* Content */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-bold text-gray-900">
                      {t("feedback.content")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs font-medium text-gray-400">
                      {content.length}/5000
                    </span>
                  </div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    maxLength={5000}
                    required
                    placeholder={t("feedback.contentPlaceholder")}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/40 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none transition-all leading-relaxed"
                  />
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    {t("feedback.ratingOptional")}
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setRating(rating === n ? 0 : n)}
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 cursor-pointer transition-transform hover:scale-110 active:scale-95 duration-100"
                        aria-label={t("feedback.starLabel", { n: String(n) })}
                      >
                        <Star
                          size={28}
                          className={`transition-colors duration-100 ${
                            n <= (hoverRating || rating)
                              ? "fill-yellow-400 text-yellow-400 drop-shadow-xs"
                              : "text-gray-300 hover:text-gray-400"
                          }`}
                        />
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="text-xs font-semibold text-gray-600 ml-2">
                        {rating}/5
                      </span>
                    )}
                  </div>
                </div>

                {/* Anonymous / Guest contact fields */}
                {!isAuthenticated && (
                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        {t("feedback.emailOptional")}
                      </label>
                      <div className="relative">
                        <Mail
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        />
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/40 pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        {t("feedback.phoneOptional")}
                      </label>
                      <div className="relative">
                        <Phone
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        />
                        <input
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="0901234567"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/40 pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  loading={submit.isPending}
                  className="w-full sm:w-auto px-10 bg-brand hover:bg-brand-strong text-white font-bold py-3 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 border-none mt-2 text-base cursor-pointer"
                >
                  <Send size={17} className="mr-2" />
                  {t("feedback.submit")}
                </Button>
              </form>
            )}
          </div>

          {/* Right Column: Customer Service Illustration & Info - Seamless, Borderless */}
          <div className="lg:col-span-6 flex flex-col items-center text-center pt-2 lg:pt-0">
            <div className="relative w-full max-w-[440px] aspect-square mb-6 flex items-center justify-center">
              <div className="absolute inset-2 bg-purple-200/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
              <Image
                src="/images/customer_service.png"
                alt="Aionn Customer Service"
                width={500}
                height={500}
                priority
                className="relative z-10 w-full h-full object-contain drop-shadow-sm select-none pointer-events-none"
              />
            </div>

            <div className="space-y-3 max-w-md">
              <h3 className="text-xl font-bold text-gray-950">
                Chúng tôi luôn lắng nghe bạn
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Mỗi phản hồi, đóng góp ý kiến hoặc báo cáo lỗi của bạn là nguồn
                thông tin quý giá giúp Aionn nâng cao trải nghiệm mua sắm thông minh mỗi ngày.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
