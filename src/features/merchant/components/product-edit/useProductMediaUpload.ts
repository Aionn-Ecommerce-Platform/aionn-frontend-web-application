"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { mediaService, uploadToCloudinary } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { MEDIA_LIMITS, isVideoUrl } from "@/shared/lib/media";
import { useTranslation } from "@/hooks";

export function useProductMediaUpload({
  images,
  setImages,
  messagePrefix,
  successMessageKey,
}: {
  images: string[];
  setImages: (updater: (prev: string[]) => string[]) => void;
  messagePrefix: "merchant.productEdit" | "merchant.productNew";
  successMessageKey: string;
}) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);

  async function addMedia(file: File) {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isImage && !isVideo) {
      toast.error(t(`${messagePrefix}.errorOnlyMedia`));
      return;
    }
    if (images.length >= MEDIA_LIMITS.productFiles) {
      toast.error(
        t(`${messagePrefix}.errorMediaLimit`, {
          count: MEDIA_LIMITS.productFiles,
        }),
      );
      return;
    }
    if (isVideo) {
      if (
        images.filter((url) => isVideoUrl(url)).length >=
        MEDIA_LIMITS.productVideos
      ) {
        toast.error(
          t(`${messagePrefix}.errorVideoLimit`, {
            count: MEDIA_LIMITS.productVideos,
          }),
        );
        return;
      }
      if (file.size > MEDIA_LIMITS.videoBytes) {
        toast.error(t(`${messagePrefix}.errorVideoTooLarge`));
        return;
      }
    } else if (file.size > MEDIA_LIMITS.imageBytes) {
      toast.error(t(`${messagePrefix}.errorImageTooLarge`));
      return;
    }
    setUploading(true);
    try {
      const sig = await mediaService.generateProductImageSignature();
      const url = await uploadToCloudinary(file, sig);
      setImages((prev) => [...prev, url]);
      toast.success(t(successMessageKey));
    } catch (err) {
      toast.error(getErrorMessage(err, t(`${messagePrefix}.uploadFailed`)));
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((item) => item !== url));
  }

  function reorderImages(from: number, to: number) {
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (moved) next.splice(to, 0, moved);
      return next;
    });
  }

  return { uploading, addMedia, removeImage, reorderImages };
}
