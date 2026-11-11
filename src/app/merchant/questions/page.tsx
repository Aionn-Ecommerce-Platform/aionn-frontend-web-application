"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Loader2, Send } from "lucide-react";
import toast from "react-hot-toast";
import AuthGuard from "@/components/auth/AuthGuard";
import { Button, EmptyState, Modal, Textarea } from "@/shared/ui";
import { questionService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";

function MerchantQuestionsInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"UNANSWERED" | "ALL">("UNANSWERED");
  const [answerTarget, setAnswerTarget] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-questions", tab],
    queryFn: () =>
      questionService.listForMerchant({
        answered: tab === "UNANSWERED" ? false : undefined,
        page: 0,
        size: 100,
      }),
  });

  const submit = useMutation({
    mutationFn: () => questionService.answer(answerTarget!, answer.trim()),
    onSuccess: () => {
      toast.success(t("merchantQuestions.answered"));
      setAnswerTarget(null);
      setAnswer("");
      qc.invalidateQueries({ queryKey: ["merchant-questions"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const questions = data?.content ?? [];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {t("merchantQuestions.title")}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {t("merchantQuestions.subtitle")}
        </p>

        <div className="flex gap-2 mb-6">
          <Button
            size="sm"
            variant={tab === "UNANSWERED" ? "primary" : "outline"}
            onClick={() => setTab("UNANSWERED")}
          >
            {t("merchantQuestions.tabUnanswered")}
          </Button>
          <Button
            size="sm"
            variant={tab === "ALL" ? "primary" : "outline"}
            onClick={() => setTab("ALL")}
          >
            {t("merchantQuestions.tabAll")}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-brand" size={28} />
          </div>
        ) : questions.length === 0 ? (
          <EmptyState
            icon={HelpCircle}
            title={t("merchantQuestions.empty")}
            description={t("merchantQuestions.emptyDescription")}
          />
        ) : (
          <div className="space-y-3">
            {questions.map((q) => (
              <div
                key={q.questionId}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5"
              >
                <p className="text-sm font-semibold text-gray-900">
                  {q.question}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {q.userDisplayName || q.userName || t("productQa.buyer")}
                  {" · "}
                  {formatDateTime(q.createdAt, locale)}
                </p>
                {q.answer ? (
                  <div className="mt-3 rounded-lg border-l-2 border-brand bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-brand mb-1">
                      {t("productQa.sellerAnswer")}
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {q.answer}
                    </p>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => {
                      setAnswerTarget(q.questionId);
                      setAnswer("");
                    }}
                  >
                    <Send size={14} className="mr-1.5" />
                    {t("merchantQuestions.answer")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={answerTarget !== null}
        onClose={() => setAnswerTarget(null)}
        title={t("merchantQuestions.answerTitle")}
      >
        <div className="space-y-4">
          <Textarea
            label={t("merchantQuestions.answerLabel")}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            placeholder={t("merchantQuestions.answerPlaceholder")}
          />
          <Button
            className="w-full"
            onClick={() => submit.mutate()}
            loading={submit.isPending}
            disabled={!answer.trim()}
          >
            {t("merchantQuestions.submit")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function MerchantQuestionsPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantQuestionsInner />
    </AuthGuard>
  );
}
