export const MEDIA_LIMITS = {
  returnEvidenceFiles: 5,
  reviewFiles: 3,
  productFiles: 12,
  productVideos: 3,
  imageBytes: 8 * 1024 * 1024,
  videoBytes: 50 * 1024 * 1024,
  chatVideoBytes: 25 * 1024 * 1024,
} as const;

export function isVideoUrl(url: string): boolean {
  return (
    /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || url.includes("/video/upload/")
  );
}

/**
 * Product cards must always show an image. Videos are allowed in the gallery,
 * but they must never become the storefront cover.
 */
export function getProductCoverImage(
  imageList: readonly string[] | null | undefined,
): string {
  const cover = (imageList ?? []).find((url) => url && !isVideoUrl(url));
  return cover ?? "/images/logo.png";
}
