/**
 * Product descriptions arrive with a localized heading. Matching it is content parsing rather than
 * UI copy, so the pattern lives with the other product-detail helpers instead of inside a component.
 */
export const DESCRIPTION_HEADING_PATTERN =
  /^(mô tả sản phẩm|description|product description)\s*\n+/i;

export function getProductImages(imageList: string[]): string[] {
  if (!imageList || imageList.length === 0) {
    return ["/images/logo.png"];
  }
  return Array.from(new Set(imageList.filter(Boolean)));
}
