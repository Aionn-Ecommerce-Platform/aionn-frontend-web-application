"use client";

import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/shared/ui";
import { useTranslation } from "@/hooks";

export default function ContactPage() {
  const { t } = useTranslation();

  return (
    <div className="bg-white min-h-screen py-8 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Title */}
        <div className="mb-8 lg:mb-10 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
            {t("contact.title")}
          </h1>
        </div>

        <div className="space-y-8">
          {/* Live Chat Action Card */}
          <div className="p-6 sm:p-7 rounded-2xl bg-gray-50/60 border border-gray-200/90 hover:border-brand/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <MessageCircle size={24} />
              </div>
              <div className="space-y-1 max-w-2xl">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-950">
                    {t("contact.liveChatTitle")}
                  </h2>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t("contact.liveChatDescription")}
                </p>
              </div>
            </div>

            <Link href="/chat" className="shrink-0">
              <Button className="w-full sm:w-auto px-6 bg-brand hover:bg-brand-strong text-white font-semibold py-2.5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 border-none flex items-center justify-center gap-2">
                <MessageCircle size={16} />
                {t("contact.chatNow")}
              </Button>
            </Link>
          </div>

          {/* 4 Cards in 1 Row: Hotline, Email, Trụ sở chính, Thời gian làm việc */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Hotline Card */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/40 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-brand flex items-center justify-center mb-3">
                  <Phone size={20} />
                </div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {t("contact.hotline")}
                </h3>
                <p className="text-xl font-black text-gray-950 mt-1">
                  +84 68068337
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200/60 leading-relaxed">
                Hỗ trợ trực tiếp
              </p>
            </div>

            {/* 2. Email Card */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/40 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-brand flex items-center justify-center mb-3">
                  <Mail size={20} />
                </div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {t("contact.email")}
                </h3>
                <p className="text-base font-bold text-gray-950 mt-1 truncate">
                  flourinetran@gmail.com
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200/60 leading-relaxed">
                Phản hồi nhanh chóng
              </p>
            </div>

            {/* 3. Trụ sở chính Card */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/40 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-brand flex items-center justify-center mb-3">
                  <MapPin size={20} />
                </div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {t("contact.address")}
                </h3>
                <p className="text-sm font-semibold text-gray-900 mt-1 leading-snug">
                  Đại học Công nghệ Thông tin - ĐHQG TP.HCM (UIT)
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200/60">
                Khu phố 6, P. Linh Trung, TP. Thủ Đức, TP.HCM
              </p>
            </div>

            {/* 4. Thời gian làm việc Card */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/40 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-brand flex items-center justify-center mb-3">
                  <Clock size={20} />
                </div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {t("contact.workingHours")}
                </h3>
                <div className="text-xs text-gray-900 font-bold mt-1.5 space-y-0.5">
                  <p className="text-base text-brand">24/7 (Full time)</p>
                  <p className="text-gray-600 font-medium">Toàn bộ các ngày trong tuần</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200/60">
                Luôn sẵn sàng hỗ trợ
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
