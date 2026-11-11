import api from "@/shared/api";

export interface Collection {
  collectionId: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface SaveCollectionInput {
  slug?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  active?: boolean;
  displayOrder?: number;
}

export const collectionService = {
  list(activeOnly = true) {
    return api.get<Collection[]>("/catalog/collections", {
      anonymous: true,
      query: { activeOnly },
    });
  },

  get(key: string) {
    return api.get<Collection>(`/catalog/collections/${key}`, {
      anonymous: true,
    });
  },

  create(body: SaveCollectionInput) {
    return api.post<Collection>("/catalog/collections", body);
  },

  update(collectionId: string, body: SaveCollectionInput) {
    return api.put<Collection>(
      `/catalog/collections/${collectionId}`,
      body,
    );
  },

  delete(collectionId: string) {
    return api.delete<void>(`/catalog/collections/${collectionId}`);
  },
};
