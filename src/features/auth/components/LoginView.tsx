"use client";

import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "@/components/auth";
import { useTranslation } from "@/hooks";

function LoginInner() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 bg-gradient-to-br from-purple-50/70 via-gray-50/80 to-purple-50/50 flex items-center justify-center py-12 lg:py-20 px-4">
      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 hidden lg:flex flex-col items-center justify-center space-y-6">
          <div className="relative h-56 w-56 flex items-center justify-center">
            <div className="absolute inset-4 bg-purple-400/20 rounded-full blur-2xl animate-pulse" />
            <Image
              src="/images/logo_without_text.png"
              alt="Aionn"
              width={194}
              height={181}
              className="relative h-full w-full object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="space-y-3 text-center">
            <h1 className="font-brand text-5xl lg:text-6xl font-bold text-brand tracking-wide select-none">
              Aionn
            </h1>
            <p className="max-w-md text-xl font-semibold leading-relaxed text-gray-900">
              {t("auth.tagline")}
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
          <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.2)] border border-gray-200/90 p-8 transition-shadow">
            <h2 className="text-2xl font-bold text-gray-950 mb-6">
              {t("auth.loginTitle")}
            </h2>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-gradient-to-br from-purple-50 via-gray-50 to-purple-50 flex items-center justify-center">
          <div className="text-gray-900 text-lg font-medium">
            {t("common.loading")}
          </div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
