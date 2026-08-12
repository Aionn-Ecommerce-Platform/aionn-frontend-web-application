import { cn } from "@/shared/lib/utils";
import Image from "next/image";

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const PIXEL_SIZE = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export default function Avatar({
  src,
  alt,
  size = "md",
  className,
}: AvatarProps) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  };

  if (src) {
    const px = PIXEL_SIZE[size];
    return (
      <div
        className={cn(
          "relative rounded-full overflow-hidden flex-shrink-0",
          sizes[size],
          className,
        )}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={`${px}px`}
          className="object-cover"
        />
      </div>
    );
  }

  const initials = alt
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
