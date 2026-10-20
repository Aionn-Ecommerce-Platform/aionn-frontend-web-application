"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/hooks";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  scrollToTop?: boolean;
  ariaLabel?: string;
  previousAriaLabel?: string;
  nextAriaLabel?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
  scrollToTop = true,
  ariaLabel,
  previousAriaLabel,
  nextAriaLabel,
}: PaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const handleSelect = (page: number) => {
    onPageChange(page);
    if (scrollToTop && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const resolvedNavLabel = ariaLabel ?? t("common.pagination");
  const resolvedPrevLabel = previousAriaLabel ?? t("common.previous");
  const resolvedNextLabel = nextAriaLabel ?? t("common.next");

  return (
    <nav
      aria-label={resolvedNavLabel}
      className={`flex items-center justify-center pt-8 pb-4 ${className}`}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleSelect(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage <= 1}
          aria-label={resolvedPrevLabel}
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-900 bg-white text-gray-900 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
            (pageNum) => {
              const isSelected = pageNum === safeCurrentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => handleSelect(pageNum)}
                  aria-label={t("common.pageNumber", { page: pageNum })}
                  aria-current={isSelected ? "page" : undefined}
                  className={`h-9 min-w-9 px-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                    isSelected
                      ? "bg-gray-950 text-white border-2 border-gray-950 shadow-xs"
                      : "bg-white text-gray-800 border-2 border-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {pageNum}
                </button>
              );
            },
          )}
        </div>

        <button
          onClick={() => handleSelect(Math.min(totalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage >= totalPages}
          aria-label={resolvedNextLabel}
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-900 bg-white text-gray-900 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
