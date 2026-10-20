import { describe, it, expect } from "vitest";
import {
  resolveProvinceName,
  cleanProvinceName,
  getLocalizedAddress,
} from "./address-utils";
import type { GeographyItem } from "@/types";

describe("address-utils", () => {
  describe("resolveProvinceName", () => {
    const mockProvinces: GeographyItem[] = [
      { code: "01", name: "Thành phố Hà Nội", nameEn: "Hanoi" },
      { code: "79", name: "Thành phố Hồ Chí Minh", nameEn: "Ho Chi Minh City" },
      { code: "48", name: "Thành phố Đà Nẵng", nameEn: "Da Nang" },
    ];

    it("returns null for null, undefined, or empty string", () => {
      expect(resolveProvinceName(null)).toBeNull();
      expect(resolveProvinceName(undefined)).toBeNull();
      expect(resolveProvinceName("   ")).toBeNull();
    });

    it("matches from geography provinces list by code", () => {
      expect(resolveProvinceName("01", mockProvinces, "vi")).toBe("Thành phố Hà Nội");
      expect(resolveProvinceName("01", mockProvinces, "en")).toBe("Hanoi");
    });

    it("matches from geography provinces list with vn- prefix", () => {
      expect(resolveProvinceName("VN-01", mockProvinces, "vi")).toBe("Thành phố Hà Nội");
    });

    it("falls back to ISO map when not in geography list", () => {
      expect(resolveProvinceName("VN-HN", [], "vi")).toBe("Thành phố Hà Nội");
      expect(resolveProvinceName("VN-HN", [], "en")).toBe("Hanoi");
      expect(resolveProvinceName("VN-SG", [], "vi")).toBe("Thành phố Hồ Chí Minh");
      expect(resolveProvinceName("VN-SG", [], "en")).toBe("Ho Chi Minh City");
      expect(resolveProvinceName("VN-DAD", [], "en")).toBe("Da Nang");
    });

    it("returns null for unknown province code", () => {
      expect(resolveProvinceName("UNKNOWN_CODE", [], "vi")).toBeNull();
    });
  });

  describe("cleanProvinceName", () => {
    it("cleans prefixes and suffixes", () => {
      expect(cleanProvinceName("Thành phố Hà Nội")).toBe("Hà Nội");
      expect(cleanProvinceName("Tỉnh Bình Dương")).toBe("Bình Dương");
      expect(cleanProvinceName("Province of Khanh Hoa")).toBe("Khanh Hoa");
      expect(cleanProvinceName("")).toBe("");
    });
  });

  describe("getLocalizedAddress", () => {
    it("formats vietnamese address", () => {
      const addr = {
        detailAddress: "123 Lê Lợi",
        wardName: "Phường Bến Nghé",
        districtName: "Quận 1",
        provinceName: "Thành phố Hồ Chí Minh",
      };
      expect(getLocalizedAddress(addr, "vi")).toBe(
        "123 Lê Lợi, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh"
      );
    });

    it("formats english address", () => {
      const addr = {
        detailAddress: "123 Lê Lợi",
        wardName: "Phường Bến Nghé",
        districtName: "Quận 1",
        provinceName: "Thành phố Hồ Chí Minh",
      };
      expect(getLocalizedAddress(addr, "en")).toBe(
        "123 Le Loi, Ben Nghe Ward, 1 District, Ho Chi Minh City"
      );
    });
  });
});
