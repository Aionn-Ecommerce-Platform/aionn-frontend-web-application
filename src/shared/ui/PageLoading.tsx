"use client";

import { useTranslation } from "@/hooks";

export default function PageLoading() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div
        className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
        role="status"
        aria-label={t("common.loading")}
      />
    </div>
  );
}
