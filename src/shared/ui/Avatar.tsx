"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/shared/lib/utils";

export const DEFAULT_AVATAR_URL = "/images/default_avt.jpg";

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  className?: string;
  fallbackSrc?: string;
}

const PIXEL_SIZE = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  "2xl": 80,
  "3xl": 96,
};

export default function Avatar({
  src,
  alt,
  size = "md",
  className,
  fallbackSrc = DEFAULT_AVATAR_URL,
}: AvatarProps) {
  const [prevSrc, setPrevSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  if (prevSrc !== src) {
    setPrevSrc(src);
    setHasError(false);
    setFallbackError(false);
  }

  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
    "2xl": "h-20 w-20",
    "3xl": "h-24 w-24",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
    "2xl": "text-xl",
    "3xl": "text-2xl",
  };

  const px = PIXEL_SIZE[size];
  const effectiveSrc =
    !hasError && src && src.trim() ? src.trim() : fallbackSrc;

  if (fallbackError) {
    const initials = (alt || "U")
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <div
        className={cn(
          "rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-medium flex-shrink-0",
          sizes[size],
          textSizes[size],
          className,
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex-shrink-0 bg-gray-100",
        sizes[size],
        className,
      )}
    >
      <Image
        src={effectiveSrc}
        alt={alt || "Avatar"}
        fill
        sizes={`${px}px`}
        className="object-cover"
        onError={() => {
          if (!hasError && src && src.trim()) {
            setHasError(true);
          } else {
            setFallbackError(true);
          }
        }}
      />
    </div>
  );
}
