"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Footer from "@/components/layout/Footer";
import { useTranslation } from "@/hooks";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();

  let pageTitle = "";
  if (pathname?.includes("/auth/login")) {
    pageTitle = t("auth.loginTitle");
  } else if (pathname?.includes("/auth/register")) {
    pageTitle = t("auth.registerTitle");
  } else if (pathname?.includes("/auth/forgot-password")) {
    pageTitle = t("auth.forgotPasswordTitle");
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2.5 group">
                <Image
                  src="/images/logo_without_text.png"
                  alt="Aionn"
                  width={194}
                  height={181}
                  className="h-auto w-10 rounded-lg group-hover:scale-105 transition-transform"
                />
                <span className="text-2xl font-bold tracking-tight text--brand">
                  Aionn
                </span>
              </Link>
              {pageTitle && (
                <>
                  <div className="h-6 w-px bg-gray-300" />
                  <span className="text-lg font-medium text-gray-800">
                    {pageTitle}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">{children}</div>

      <Footer />
    </div>
  );
}
