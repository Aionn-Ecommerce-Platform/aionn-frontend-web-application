"use client";

import { AppImage } from "@/shared/ui";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Upload, X, Loader2 } from "lucide-react";
import { reviewService, type SubmitReviewRequest } from "@/lib/services";
import { mediaService, uploadToCloudinary } from "@/lib/services/media.service";
import { useTranslation } from "@/hooks";
import { getErrorMessage } from "@/shared/lib/errors";
import toast from "react-hot-toast";

interface SubmitReviewFormProps {
  productId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SubmitReviewForm({
  productId,
  onSuccess,
  onCancel,
}: SubmitReviewFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const submitMutation = useMutation({
    mutationFn: (data: SubmitReviewRequest) =>
      reviewService.submitReview(productId, data),
    onSuccess: () => {
      toast.success(t("reviews.submitSuccess"));
      queryClient.invalidateQueries({
        queryKey: ["product-reviews", productId],
      });
      queryClient.invalidateQueries({
        queryKey: ["product-rating-summary", productId],
      });
      onSuccess?.();
      setRating(5);
      setTitle("");
      setContent("");
      setImageUrls([]);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t("reviews.submitError")));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error(t("reviews.contentRequired"));
      return;
    }

    if (imageUrls.length > 5) {
      toast.error(t("reviews.maxImagesExceeded"));
      return;
    }

    submitMutation.mutate({
      rating,
      title: title.trim() || undefined,
      content: content.trim(),
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    if (imageUrls.length + files.length > 5) {
      toast.error(t("reviews.maxImagesExceeded"));
      return;
    }

    setUploading(true);
    try {
      const sig = await mediaService.generateReviewImageSignature();
      const uploaded = await Promise.all(
        files.map((f) => uploadToCloudinary(f, sig)),
      );
      setImageUrls((prev) => [...prev, ...uploaded]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("reviews.rating")} <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoveredRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600">
            {rating === 5 && t("reviews.ratingExcellent")}
            {rating === 4 && t("reviews.ratingGood")}
            {rating === 3 && t("reviews.ratingAverage")}
            {rating === 2 && t("reviews.ratingPoor")}
            {rating === 1 && t("reviews.ratingTerrible")}
          </span>
        </div>
      </div>

      <div>
        <label
          htmlFor="review-title"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {t("reviews.title")}
        </label>
        <input
          id="review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("reviews.titlePlaceholder")}
          maxLength={200}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">
          {title.length}/200 {t("common.characters")}
        </p>
      </div>

      <div>
        <label
          htmlFor="review-content"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {t("reviews.content")} <span className="text-red-500">*</span>
        </label>
        <textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("reviews.contentPlaceholder")}
          rows={5}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          {content.length} {t("common.characters")}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("reviews.images")} ({imageUrls.length}/5)
        </label>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 cursor-pointer">
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {t("reviews.addImage")}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading || imageUrls.length >= 5}
            onChange={handleFileSelect}
          />
        </label>
        {imageUrls.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-3">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative group">
                <AppImage
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="w-24 h-24 object-cover rounded-md border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">{t("reviews.imageHint")}</p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitMutation.isPending}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={submitMutation.isPending || !content.trim()}
          className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitMutation.isPending
            ? t("common.submitting")
            : t("reviews.submitReview")}
        </button>
      </div>
    </form>
  );
}
