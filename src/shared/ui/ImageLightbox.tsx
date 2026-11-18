"use client";

import { useEffect } from "react";
import AppImage from "./AppImage";

interface ImageLightboxProps {
  src: string | null;
  alt: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!src) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <button
      type="button"
      className="fixed inset-0 z-[100] flex cursor-zoom-out appearance-none items-center justify-center border-0 bg-black/80 p-4"
      aria-label={alt}
      onClick={onClose}
    >
      <AppImage
        src={src}
        alt={alt}
        width={1600}
        height={1600}
        className="h-auto w-auto min-w-[320px] max-h-[85vh] max-w-[90vw] object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </button>
  );
}
