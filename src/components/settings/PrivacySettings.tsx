"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Check, XCircle, Loader2, Download } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, Switch as Toggle } from "@/shared/ui";
import { qk } from "@/lib/query-keys";
import { consentService, userService } from "@/lib/services";
import type { ConsentResponse } from "@/lib/services/consent.service";
import { ApiError } from "@/shared/api";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";

const EXPORT_TIMEOUT_MS = 30_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The export is built by a background worker, so the document is not available immediately after the
 * request is accepted. A 404 here means "not ready yet", not "missing".
 */
async function fetchExportWhenReady(requestId: string) {
  const deadline = Date.now() + EXPORT_TIMEOUT_MS;
  let delay = 800;
  while (Date.now() < deadline) {
    try {
      return await userService.getDataExport(requestId);
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 404) {
        throw err;
      }
      await sleep(delay);
      delay = Math.min(delay * 1.5, 4_000);
    }
  }
  return null;
}

export default function PrivacySettings() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading: loading } = useQuery({
    queryKey: qk.consents,
    queryFn: () => consentService.getMyConsents(),
  });
  const refetch = () => qc.invalidateQueries({ queryKey: qk.consents });
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleDownloadData() {
    setExporting(true);
    try {
      const request = await userService.requestDataExport();
      const payload = await fetchExportWhenReady(request.requestId);
      if (!payload) {
        toast(t("privacy.exportPending"));
        return;
      }
      const blob = new Blob([payload.payload], {
        type: payload.contentType || "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `aionn-data-export-${request.requestId}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(t("privacy.exportSuccess"));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  const consentsMap = new Map<string, ConsentResponse>();
  data?.forEach((c) => consentsMap.set(c.consentType, c));

  const termsConsent = consentsMap.get("TERMS_OF_SERVICE");
  const privacyConsent = consentsMap.get("PRIVACY_POLICY");
  const marketingConsent = consentsMap.get("MARKETING");

  async function handleToggleMarketing(agreed: boolean) {
    setUpdating(true);
    try {
      await consentService.updateMarketing(agreed);
      toast.success(
        t(agreed ? "privacy.marketingEnabled" : "privacy.marketingDisabled"),
      );
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  }

  const consentBadge = (agreed: boolean) =>
    agreed ? (
      <Badge variant="success" className="shrink-0 gap-1">
        <Check size={12} />
        {t("privacy.agreed")}
      </Badge>
    ) : (
      <Badge className="shrink-0 gap-1">
        <XCircle size={12} />
        {t("privacy.notAgreed")}
      </Badge>
    );

  const header = (
    <h3 className="flex items-center gap-2.5 font-bold text-gray-950 text-base mb-5 border-b border-gray-100 pb-3.5">
      <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
        <Shield size={16} />
      </div>
      {t("privacy.title")}
    </h3>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-400 shadow-xs p-6 sm:p-7">
        {header}
        <div className="py-12 flex justify-center">
          <Loader2 className="animate-spin text-brand" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-400 shadow-xs p-6 sm:p-7">
      {header}
      <div className="divide-y divide-gray-100">
        <div className="py-3.5 first:pt-0 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {t("privacy.termsTitle")}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("privacy.termsDescription")}
            </p>
          </div>
          {consentBadge(Boolean(termsConsent?.agreed))}
        </div>

        <div className="py-3.5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {t("privacy.policyTitle")}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("privacy.policyDescription")}
            </p>
          </div>
          {consentBadge(Boolean(privacyConsent?.agreed))}
        </div>

        <div className="py-3.5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {t("privacy.marketingTitle")}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("privacy.marketingDescription")}
            </p>
          </div>
          <Toggle
            checked={marketingConsent?.agreed ?? false}
            onChange={handleToggleMarketing}
            disabled={updating}
          />
        </div>

        <div className="py-3.5 last:pb-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {t("privacy.exportTitle")}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("privacy.exportDescription")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 self-start rounded-xl border-gray-400 hover:border-brand hover:text-brand sm:self-auto"
            onClick={handleDownloadData}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 size={14} className="mr-2 animate-spin" />
            ) : (
              <Download size={14} className="mr-2" />
            )}
            {t("privacy.exportButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}
