"use client";

import { useEffect } from "react";
import { logger } from "@/shared/lib/logger";
import { useTranslation } from "@/hooks";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t, locale } = useTranslation();
  useEffect(() => {
    logger.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang={locale}>
      <body className="bg-gray-50 antialiased">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              {t("globalError.title")}
            </h1>
            <p className="mt-3 text-sm text-gray-500">
              {t("globalError.description")}
            </p>
            {error.digest && (
              <p className="mt-3 text-xs font-mono text-gray-400">
                {t("globalError.code", { code: error.digest })}
              </p>
            )}
            <button
              onClick={reset}
              className="mt-8 inline-flex items-center px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              {t("globalError.reload")}
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
