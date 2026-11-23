"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslation } from "@/hooks";
import { isVideoUrl } from "@/shared/lib/media";
import AppImage from "./AppImage";

interface ImageLightboxProps {
  src: string | null;
  alt: string;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function ImageLightbox({
  src,
  alt,
  onClose,
}: ImageLightboxProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!src) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
    >
      {isVideoUrl(src) ? (
        <video
          src={src}
          controls
          autoPlay
          playsInline
          className="max-h-[85vh] max-w-[90vw] rounded-lg bg-black"
        >
          <track kind="captions" />
        </video>
      ) : (
        <AppImage
          src={src}
          alt={alt}
          width={1600}
          height={1600}
          unoptimized
          className="h-auto w-auto min-w-[320px] max-h-[85vh] max-w-[90vw] object-contain"
        />
      )}
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label={t("common.close")}
        className="absolute right-4 top-4 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
      >
        <X size={20} />
      </button>
    </div>
  );
}
