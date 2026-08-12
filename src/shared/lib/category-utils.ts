import type { CategoryTreeNode } from "@/types";

export function buildCategoryNameMap(
  nodes: CategoryTreeNode[] | null | undefined,
) {
  const names = new Map<string, string>();

  const visit = (items: CategoryTreeNode[]) => {
    items.forEach(({ category, children }) => {
      names.set(category.categoryId, category.name);
      visit(children);
    });
  };

  visit(nodes ?? []);
  return names;
}
