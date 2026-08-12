"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { logger } from "@/shared/lib/logger";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    logger.error("[app/error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertTriangle size={32} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("common.errorBoundaryTitle")}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {t("common.errorBoundaryDescription")}
        </p>
        {error.digest && (
          <p className="mt-3 text-xs font-mono text-gray-400">
            {t("common.errorCode", { code: error.digest })}
          </p>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={reset}>
            <RefreshCw size={16} className="mr-1.5" />
            {t("common.tryAgain")}
          </Button>
          <Link href="/">
            <Button variant="outline">
              <Home size={16} className="mr-1.5" />
              {t("common.home")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
