import { describe, expect, it } from "vitest";
import { buildCategoryNameMap } from "./category-utils";
import { getPaginationRange } from "./pagination";
import { formatVariantLabel, getProductCardSummary } from "./product-utils";
import type { CategoryTreeNode, Product } from "@/types";

describe("getPaginationRange", () => {
  it("keeps nearby pages and collapses distant ranges", () => {
    expect(getPaginationRange(5, 12)).toEqual([
      1,
      "...",
      4,
      5,
      6,
      7,
      8,
      "...",
      12,
    ]);
  });

  it("returns every page for short ranges", () => {
    expect(getPaginationRange(1, 4)).toEqual([1, 2, 3, 4]);
  });
});

describe("buildCategoryNameMap", () => {
  it("flattens a nested category tree", () => {
    const category = (categoryId: string, name: string) => ({
      categoryId,
      parentId: null,
      name,
      slug: categoryId,
      iconUrl: null,
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    const child = {
      category: category("child", "Child"),
      children: [],
    } satisfies CategoryTreeNode;
    const root = {
      category: category("root", "Root"),
      children: [child],
    } satisfies CategoryTreeNode;

    expect(Array.from(buildCategoryNameMap([root]))).toEqual([
      ["root", "Root"],
      ["child", "Child"],
    ]);
  });
});

describe("product helpers", () => {
  it("selects the lowest variant price and first image", () => {
    const product = {
      variants: [
        { price: 200, originalPrice: 250 },
        { price: 100, originalPrice: 150 },
      ],
      imageList: ["/product.jpg"],
    } as Product;

    expect(getProductCardSummary(product)).toEqual({
      price: 100,
      originalPrice: 150,
      image: "/product.jpg",
    });
  });

  it("removes generated option labels and trims values", () => {
    expect(
      formatVariantLabel({ option: "Option 1", color: " Blue ", size: "M" }),
    ).toBe("Blue / M");
  });
});
