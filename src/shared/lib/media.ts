export const MEDIA_LIMITS = {
  returnEvidenceFiles: 5,
  reviewFiles: 3,
  imageBytes: 8 * 1024 * 1024,
  videoBytes: 50 * 1024 * 1024,
  chatVideoBytes: 25 * 1024 * 1024,
} as const;

export function isVideoUrl(url: string): boolean {
  return (
    /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) ||
    url.includes("/video/upload/")
  );
}
