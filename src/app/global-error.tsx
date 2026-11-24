"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import StateView from "@/shared/ui/StateView";
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
      <body className="bg-white antialiased">
        <StateView
          icon={AlertTriangle}
          iconClassName="text-rose-500"
          title={t("globalError.title")}
          description={t("globalError.description")}
          meta={
            error.digest
              ? t("globalError.code", { code: error.digest })
              : undefined
          }
          className="min-h-screen"
          action={
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
            >
              <RefreshCw size={16} />
              {t("globalError.reload")}
            </button>
          }
        />
      </body>
    </html>
  );
}
