"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Loader2, MessageSquare, Send } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/shared/ui";
import { questionService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";

export default function ProductQA({
  productId,
  authenticated,
}: {
  productId: string;
  authenticated: boolean;
}) {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["product-questions", productId, page],
    queryFn: () => questionService.list(productId, page, 10),
  });

  const ask = useMutation({
    mutationFn: () => questionService.ask(productId, draft.trim()),
    onSuccess: () => {
      toast.success(t("productQa.submitted"));
      setDraft("");
      setPage(0);
      qc.invalidateQueries({ queryKey: ["product-questions", productId] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const questions = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div
      id="product-questions"
      className="bg-white rounded-2xl border border-gray-300 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 lg:p-8 mt-6"
    >
      <div className="flex items-center justify-between gap-4 mb-5">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <HelpCircle size={18} className="text-brand" />
          {t("productQa.title")}
        </h2>
        <span className="text-xs text-gray-500">
          {t("productQa.count", { count: data?.totalElements ?? 0 })}
        </span>
      </div>

      {authenticated ? (
        <div className="mb-6">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder={t("productQa.placeholder")}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              onClick={() => ask.mutate()}
              disabled={draft.trim().length < 5 || ask.isPending}
            >
              {ask.isPending ? (
                <Loader2 size={14} className="mr-1.5 animate-spin" />
              ) : (
                <Send size={14} className="mr-1.5" />
              )}
              {t("productQa.submit")}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mb-5 text-sm text-gray-500">{t("productQa.loginToAsk")}</p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={22} className="animate-spin text-brand" />
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-gray-400">
          <MessageSquare size={28} className="mb-2" />
          <p className="text-sm">{t("productQa.empty")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((item) => (
            <div
              key={item.questionId}
              className="rounded-xl border border-gray-100 bg-gray-50/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {item.question}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {item.userDisplayName || item.userName || t("productQa.buyer")}
                    {" · "}
                    {formatDateTime(item.createdAt, locale)}
                  </p>
                </div>
              </div>
              {item.answer ? (
                <div className="mt-3 rounded-lg border-l-2 border-brand bg-white p-3">
                  <p className="text-xs font-semibold text-brand mb-1">
                    {t("productQa.sellerAnswer")}
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {item.answer}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-gray-400">
                  {t("productQa.unanswered")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            {t("common.previous")}
          </Button>
          <span className="text-xs text-gray-500">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            {t("common.next")}
          </Button>
        </div>
      )}
    </div>
  );
}
