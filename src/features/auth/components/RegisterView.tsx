"use client";

import { Suspense } from "react";
import Image from "next/image";
import { RegisterForm } from "@/components/auth";
import { useTranslation } from "@/hooks";

function RegisterInner() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 bg-gradient-to-br from--brand to--brand-strong flex items-center justify-center py-12 lg:py-20 px-4">
      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 hidden lg:flex flex-col items-center justify-center text-white space-y-6">
          <div className="relative w-40 h-40 bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl flex items-center justify-center group hover:scale-105 transition-transform duration-500">
            <Image
              src="/images/logo_without_text.png"
              alt="Aionn"
              width={194}
              height={181}
              className="h-auto w-[110px] object-contain"
            />
          </div>
          <div className="space-y-3 text-center">
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-none">
              Aionn
            </h1>
            <p className="text-xl text-white/80 font-medium max-w-md leading-relaxed">
              {t("auth.tagline")}
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
          <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-950 mb-6">
              {t("auth.registerTitle")}
            </h2>
            <RegisterForm />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-gradient-to-br from--brand to--brand-strong flex items-center justify-center">
          <div className="text-white text-lg font-medium">
            {t("common.loading")}
          </div>
        </div>
      }
    >
      <RegisterInner />
    </Suspense>
  );
}
