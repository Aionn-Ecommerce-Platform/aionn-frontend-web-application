export function readMultiParam(params: URLSearchParams, key: string) {
  return (params.get(key) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

interface FilterItemInput {
  names: Map<string, string>;
  counts?: Record<string, number>;
  selectedIds: string[];
}

export function buildFilterItems({
  names,
  counts = {},
  selectedIds,
}: FilterItemInput) {
  return Array.from(new Set([...Object.keys(counts), ...names.keys()]))
    .map((id) => ({
      id,
      label: names.get(id) ?? id,
      count: counts[id] ?? 0,
      selected: selectedIds.includes(id),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function hasCatalogFilters(
  values: Array<string | number | boolean | null | undefined>,
) {
  return values.some((value) => Boolean(value));
}
