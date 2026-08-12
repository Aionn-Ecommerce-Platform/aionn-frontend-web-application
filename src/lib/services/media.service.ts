import api from "@/shared/api";
import type { UploadSignature } from "@/types";

export const mediaService = {
  generateAvatarSignature() {
    return api.post<UploadSignature>("/media/upload-signatures/avatar");
  },
  generateKycDocumentSignature() {
    return api.post<UploadSignature>("/media/upload-signatures/kyc");
  },
  generateProductImageSignature() {
    return api.post<UploadSignature>(
      "/catalog/media/upload-signatures/product-image",
    );
  },
  generateReviewImageSignature() {
    return api.post<UploadSignature>(
      "/catalog/media/upload-signatures/review-image",
    );
  },
  generateChatImageSignature() {
    return api.post<UploadSignature>("/chat/media/upload-signatures/image");
  },
  generateBannerSignature() {
    return api.post<UploadSignature>(
      "/promotions/media/upload-signatures/banner",
    );
  },
};

export async function uploadToCloudinary(
  file: File,
  signature: UploadSignature,
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signature.apiKey);
  form.append("timestamp", String(signature.timestamp));
  form.append("signature", signature.signature);
  if (signature.folder) form.append("folder", signature.folder);

  const res = await fetch(signature.uploadUrl, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    const detail = body?.error?.message;
    throw new Error(
      detail
        ? `Cloudinary upload failed: ${detail}`
        : `Cloudinary upload failed: ${res.status}`,
    );
  }
  const data = (await res.json()) as { secure_url?: string; url?: string };
  const url = data.secure_url ?? data.url;
  if (!url) throw new Error("Cloudinary did not return a URL");
  return url;
}
