import api from "@/shared/api";
import type { Category, CategoryTreeNode } from "@/types";

export const categoryService = {
  get(categoryId: string) {
    return api.get<Category>(`/catalog/categories/${categoryId}`, {
      anonymous: true,
    });
  },
  listRoots() {
    return api.get<Category[]>("/catalog/categories/roots", {
      anonymous: true,
    });
  },
  listChildren(categoryId: string) {
    return api.get<Category[]>(`/catalog/categories/${categoryId}/children`, {
      anonymous: true,
    });
  },
  tree() {
    return api.get<CategoryTreeNode[]>("/catalog/categories/tree", {
      anonymous: true,
    });
  },
  create(body: { parentId?: string; name: string; slug: string }) {
    return api.post<Category>("/catalog/categories", body);
  },
  update(
    categoryId: string,
    body: { name: string; iconUrl?: string; active: boolean },
  ) {
    return api.put<Category>(`/catalog/categories/${categoryId}`, body);
  },
  move(categoryId: string, body: { newParentId: string }) {
    return api.post<Category>(`/catalog/categories/${categoryId}/move`, body);
  },
  delete(categoryId: string) {
    return api.delete<void>(`/catalog/categories/${categoryId}`);
  },
};
