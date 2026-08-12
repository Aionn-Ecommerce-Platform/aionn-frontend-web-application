import api from "@/shared/api";
import type { Address, AddressType } from "@/types";

export interface AddressInput {
  contactName: string;
  phone: string;
  provinceCode: string;
  districtCode: string;
  wardCode: string;
  detailAddress: string;
  type: AddressType;
  isDefault?: boolean;
}

export const addressService = {
  list() {
    return api.get<Address[]>("/addresses");
  },
  create(body: AddressInput) {
    return api.post<Address>("/addresses", body);
  },
  update(addressId: string, body: Omit<AddressInput, "isDefault">) {
    return api.put<Address>(`/addresses/${addressId}`, body);
  },
  delete(addressId: string) {
    return api.delete<void>(`/addresses/${addressId}`);
  },
  setDefault(addressId: string) {
    return api.patch<Address>(`/addresses/${addressId}/default`);
  },
};
