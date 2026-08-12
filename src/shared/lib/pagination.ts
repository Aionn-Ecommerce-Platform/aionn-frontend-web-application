type PaginationItem = number | "...";

export function getPaginationRange(
  currentPage: number,
  totalPages: number,
  delta = 2,
): PaginationItem[] {
  const current = currentPage + 1;
  const range: PaginationItem[] = [];
  for (let page = 1; page <= totalPages; page += 1) {
    if (
      page === 1 ||
      page === totalPages ||
      (page >= current - delta && page <= current + delta)
    ) {
      range.push(page);
    } else if (range[range.length - 1] !== "...") {
      range.push("...");
    }
  }
  return range;
}
