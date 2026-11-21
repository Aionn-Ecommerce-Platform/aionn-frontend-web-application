"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Button, Modal } from "@/shared/ui";
import { SubmitReviewForm } from "@/components/review/SubmitReviewForm";
import { reviewService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { useTranslation } from "@/hooks";

export default function RateOrderItem({
  orderId,
  skuId,
  productId,
  productName,
}: {
  orderId: string;
  skuId: string;
  productId: string;
  productName: string;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: eligibility } = useQuery({
    queryKey: ["review-eligibility", orderId, skuId, productId],
    queryFn: () => reviewService.checkEligibility(productId, { orderId, skuId }),
  });

  if (!eligibility?.canReview) {
    return null;
  }

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        className="mt-2 h-8 gap-1.5 rounded-lg px-3 text-xs"
        onClick={() => setOpen(true)}
      >
        <Star size={14} />
        {t("orders.rateItem")}
      </Button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={t("orders.rateTitle")}
        size="lg"
      >
        <div className="p-6">
          <p className="mb-4 text-sm font-medium text-gray-500">{productName}</p>
          <SubmitReviewForm
            productId={productId}
            orderId={orderId}
            skuId={skuId}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: qk.myReviews });
              setOpen(false);
            }}
            onCancel={() => setOpen(false)}
          />
        </div>
      </Modal>
    </>
  );
}
