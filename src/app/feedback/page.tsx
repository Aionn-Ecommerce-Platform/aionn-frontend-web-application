"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  MessageSquare,
  Send,
  Star,
  Bug,
  Sparkles,
  Lightbulb,
  AlertCircle,
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
  colorClass: string;
}[] = [
  {
    value: "GENERAL",
    translationKey: "feedback.typeGeneral",
    icon: Sparkles,
    colorClass: "text-blue-500 bg-blue-50/50 border-blue-500",
  },
  {
    value: "BUG",
    translationKey: "feedback.typeBug",
    icon: Bug,
    colorClass: "text-red-500 bg-red-50/50 border-red-500",
  },
  {
    value: "FEATURE_REQUEST",
    translationKey: "feedback.typeFeature",
    icon: Lightbulb,
    colorClass: "text-yellow-500 bg-yellow-50/50 border-yellow-500",
  },
  {
    value: "COMPLAINT",
    translationKey: "feedback.typeComplaint",
    icon: AlertCircle,
    colorClass: "text-orange-500 bg-orange-50/50 border-orange-500",
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

  const submit = useMutation({
    mutationFn: feedbackService.submit,
    onSuccess: () => {
      toast.success(t("feedback.success"));
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
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 transform translate-x-4 -translate-y-4 opacity-10">
            <MessageSquare size={160} />
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md relative z-10 shrink-0">
            <MessageSquare size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <h1 className="text-2xl font-extrabold tracking-tight">
              {t("feedback.title")}
            </h1>
            <p className="text-white/80 text-sm mt-1">
              {t("feedback.subtitle")}
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-400 p-8 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-3">
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
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm font-semibold transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? c.colorClass + " shadow-sm scale-[1.01]"
                          : "border-gray-400 bg-white text-gray-700 hover:bg-gray-50/80"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? "bg-white shadow-sm" : "bg-gray-100"}`}
                      >
                        <Icon size={18} />
                      </div>
                      <span className="truncate">{t(c.translationKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                {t("feedback.title_field")}
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                placeholder={t("feedback.titlePlaceholder")}
                className="w-full rounded-xl border border-gray-400 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-gray-800">
                  {t("feedback.content")}
                </label>
                <span className="text-xs font-semibold text-gray-400">
                  {content.length}/5000
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                maxLength={5000}
                required
                placeholder={t("feedback.contentPlaceholder")}
                className="w-full rounded-xl border border-gray-400 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
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
                    aria-label={t("feedback.starLabel").replace(
                      "{n}",
                      String(n),
                    )}
                  >
                    <Star
                      size={32}
                      className={`transition-colors duration-100 ${
                        n <= (hoverRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {!isAuthenticated && (
              <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-gray-150">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    {t("feedback.emailOptional")}
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-xl border border-gray-400 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    {t("feedback.phoneOptional")}
                  </label>
                  <input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="0901234567"
                    className="w-full rounded-xl border border-gray-400 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              loading={submit.isPending}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-all duration-200 border-none mt-2"
            >
              <Send size={16} className="mr-2" />
              {t("feedback.submit")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
