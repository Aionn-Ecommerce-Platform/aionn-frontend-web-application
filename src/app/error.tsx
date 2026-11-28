"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button, StateView } from "@/shared/ui";
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
    <StateView
      icon={AlertTriangle}
      iconClassName="text-rose-500"
      title={t("common.errorBoundaryTitle")}
      description={t("common.errorBoundaryDescription")}
      meta={
        error.digest
          ? t("common.errorCode", { code: error.digest })
          : undefined
      }
      className="min-h-[60vh]"
      action={
        <>
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
        </>
      }
    />
  );
}
