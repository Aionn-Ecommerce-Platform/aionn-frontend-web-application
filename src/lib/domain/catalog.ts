import type { CategoryTreeNode } from "@/types";

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
  const candidateIds = Array.from(
    new Set([...Object.keys(counts), ...selectedIds]),
  ).filter((id) => (counts[id] ?? 0) > 0 || selectedIds.includes(id));

  return candidateIds
    .map((id) => ({
      id,
      label: names.get(id) ?? id,
      count: counts[id] ?? 0,
      selected: selectedIds.includes(id),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

interface CategoryFilterItemInput extends FilterItemInput {
  nodes?: CategoryTreeNode[] | null;
}

function extractCategoryDescendants(
  nodes: CategoryTreeNode[] = [],
): Map<string, Set<string>> {
  const descendants = new Map<string, Set<string>>();

  function traverse(node: CategoryTreeNode): Set<string> {
    const set = new Set<string>();
    for (const child of node.children || []) {
      set.add(child.category.categoryId);
      const childDescendants = traverse(child);
      for (const d of childDescendants) {
        set.add(d);
      }
    }
    descendants.set(node.category.categoryId, set);
    return set;
  }

  for (const node of nodes) {
    traverse(node);
  }

  return descendants;
}

export function buildCategoryFilterItems({
  names,
  counts = {},
  selectedIds,
  nodes,
}: CategoryFilterItemInput) {
  const candidateIds = Array.from(
    new Set([...Object.keys(counts), ...selectedIds]),
  ).filter((id) => (counts[id] ?? 0) > 0 || selectedIds.includes(id));

  if (!nodes || nodes.length === 0 || candidateIds.length <= 1) {
    return buildFilterItems({ names, counts, selectedIds });
  }

  const descendantsMap = extractCategoryDescendants(nodes);
  const candidateSet = new Set(candidateIds);

  // Identify encompassing ancestor categories:
  // An ancestor P is hidden if:
  // 1. User has not explicitly selected P
  // 2. P has at least one descendant in candidateSet
  // 3. ALL other candidates in candidateSet are descendants of P
  const hiddenAncestorIds = new Set<string>();
  for (const p of candidateIds) {
    if (selectedIds.includes(p)) continue;
    const pDescendants = descendantsMap.get(p);
    if (!pDescendants || pDescendants.size === 0) continue;

    const hasDescendant = Array.from(pDescendants).some((d) =>
      candidateSet.has(d),
    );
    if (!hasDescendant) continue;

    const isEncompassing = candidateIds.every(
      (id) => id === p || pDescendants.has(id),
    );
    if (isEncompassing) {
      hiddenAncestorIds.add(p);
    }
  }

  const filteredCandidateIds = candidateIds.filter(
    (id) => !hiddenAncestorIds.has(id),
  );

  return filteredCandidateIds
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
