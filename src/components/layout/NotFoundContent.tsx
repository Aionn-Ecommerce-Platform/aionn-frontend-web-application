"use client";

import Link from "next/link";
import { Home, PackageX, Search } from "lucide-react";
import { Button } from "@/shared/ui";
import { useTranslation } from "@/hooks";

export default function NotFoundContent() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gray-100 flex items-center justify-center">
          <PackageX size={32} className="text-gray-500" />
        </div>
        <p className="text-7xl font-extrabold text-gray-900 tracking-tight">
          404
        </p>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">
          {t("notFound.title")}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {t("notFound.description")}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/">
            <Button>
              <Home size={16} className="mr-1.5" />
              {t("notFound.home")}
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="outline">
              <Search size={16} className="mr-1.5" />
              {t("notFound.products")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
