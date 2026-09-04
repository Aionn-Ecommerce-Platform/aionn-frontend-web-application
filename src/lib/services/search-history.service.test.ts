import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/shared/api";
import { searchHistoryService } from "./search-history.service";

vi.mock("@/shared/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("searchHistoryService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gets recent searches from the authenticated endpoint", async () => {
    vi.mocked(api.get).mockResolvedValue({ queries: ["phone"] });

    await expect(searchHistoryService.getRecent()).resolves.toEqual(["phone"]);
    expect(api.get).toHaveBeenCalledWith("/catalog/search-history");
  });

  it("records searches and returns the canonical server order", async () => {
    vi.mocked(api.post).mockResolvedValue({ queries: ["phone", "laptop"] });

    await expect(searchHistoryService.record(["phone"])).resolves.toEqual([
      "phone",
      "laptop",
    ]);
    expect(api.post).toHaveBeenCalledWith("/catalog/search-history", {
      queries: ["phone"],
    });
  });
});
