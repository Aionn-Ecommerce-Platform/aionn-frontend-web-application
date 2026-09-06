import api from "@/shared/api";

interface SearchHistoryResponse {
  queries: string[];
}

export const searchHistoryService = {
  async getRecent() {
    const response = await api.get<SearchHistoryResponse>(
      "/catalog/search-history",
    );
    return response.queries;
  },
  async record(queries: string[]) {
    const response = await api.post<SearchHistoryResponse>(
      "/catalog/search-history",
      { queries },
    );
    return response.queries;
  },
};
