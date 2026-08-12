import api from "@/shared/api";
import type { GeographyItem } from "@/types";

export const geographyService = {
  listCountries() {
    return api.get<GeographyItem[]>("/geography/countries", {
      anonymous: true,
    });
  },
  listProvinces(countryCode?: string) {
    return api.get<GeographyItem[]>("/geography/provinces", {
      anonymous: true,
      query: { countryCode },
    });
  },
  listDistricts(provinceCode: string) {
    return api.get<GeographyItem[]>("/geography/districts", {
      anonymous: true,
      query: { provinceCode },
    });
  },
  listWards(districtCode: string) {
    return api.get<GeographyItem[]>("/geography/wards", {
      anonymous: true,
      query: { districtCode },
    });
  },
};
