"use client";

import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "@/components/auth";
import { useTranslation } from "@/hooks";

function LoginInner() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 bg-gradient-to-br from-blue-100 via-indigo-100 to-cyan-100 flex items-center justify-center py-12 lg:py-20 px-4">
      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 hidden lg:flex flex-col items-center justify-center space-y-6">
          <div className="h-56 w-56">
            <Image
              src="/images/logo_without_text.png"
              alt="Aionn"
              width={194}
              height={181}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="space-y-3 text-center">
            <h1 className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 bg-clip-text text-4xl font-extrabold leading-none tracking-tight text-transparent lg:text-5xl">
              Aionn
            </h1>
            <p className="max-w-md text-xl font-medium leading-relaxed text-gray-600">
              {t("auth.tagline")}
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
          <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 p-8">
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
        <div className="flex-1 bg-gradient-to-br from-blue-100 via-indigo-100 to-cyan-100 flex items-center justify-center">
          <div className="text-blue-700 text-lg font-medium">
            {t("common.loading")}
          </div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
