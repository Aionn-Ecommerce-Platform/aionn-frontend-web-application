import { Star } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface RatingStarsProps {
  rating: number;
  size?: number;
  className?: string;
  filledClassName?: string;
  emptyClassName?: string;
}

export default function RatingStars({
  rating,
  size = 14,
  className,
  filledClassName = "fill-amber-400 text-amber-400",
  emptyClassName = "fill-gray-100 text-gray-300",
}: RatingStarsProps) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  const rounded = Math.round(value * 2) / 2;

  return (
    <div
      className={cn("flex items-center", className)}
      aria-label={`${value.toFixed(1)} / 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        if (rounded >= star) {
          return (
            <Star
              key={star}
              size={size}
              className={cn("shrink-0", filledClassName)}
            />
          );
        }
        if (rounded >= star - 0.5) {
          return (
            <span
              key={star}
              className="relative inline-flex shrink-0"
              style={{ width: size, height: size }}
            >
              <Star
                size={size}
                className={cn("absolute inset-0", emptyClassName)}
              />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: "50%" }}
              >
                <Star
                  size={size}
                  className={cn("absolute inset-0", filledClassName)}
                />
              </span>
            </span>
          );
        }
        return (
          <Star
            key={star}
            size={size}
            className={cn("shrink-0", emptyClassName)}
          />
        );
      })}
    </div>
  );
}
