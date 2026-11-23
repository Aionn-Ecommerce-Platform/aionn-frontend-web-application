"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button, Modal, Input, Select } from "@/shared/ui";
import { geographyService, orderService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { cleanProvinceName } from "@/shared/lib/address-utils";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatCurrency } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import type { Order } from "@/types";

function capitalizeWords(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cleanAdministrativeName(value: string) {
  return capitalizeWords(
    value.replace(
      /^(thành phố|thanh pho|tp\.?|quận|quan|huyện|huyen|thị xã|thi xa|thị trấn|thi tran|phường|phuong|xã|xa)\s+/i,
      "",
    ),
  );
}

export function EditShippingModal({
  order,
  onClose,
  onSuccess,
}: {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t, locale } = useTranslation();
  const [fullName, setFullName] = useState(order.recipientName ?? "");
  const [phone, setPhone] = useState(order.recipientPhone ?? "");
  const [addressLine, setAddressLine] = useState(
    order.recipientAddressLine ?? "",
  );
  const [wardCode, setWardCode] = useState(order.recipientWardCode ?? "");
  const [districtCode, setDistrictCode] = useState(
    order.recipientDistrictCode ?? "",
  );
  const [provinceCode, setProvinceCode] = useState(
    order.recipientProvinceCode ?? "",
  );

  const { data: provinces = [] } = useQuery({
    queryKey: qk.provinces(),
    queryFn: () => geographyService.listProvinces(),
  });
  const { data: districts = [] } = useQuery({
    queryKey: qk.districts(provinceCode),
    queryFn: () => geographyService.listDistricts(provinceCode),
    enabled: Boolean(provinceCode),
  });
  const { data: wards = [] } = useQuery({
    queryKey: qk.wards(districtCode),
    queryFn: () => geographyService.listWards(districtCode),
    enabled: Boolean(districtCode),
  });

  const mutation = useMutation({
    mutationFn: () =>
      orderService.changeShippingAddress(order.orderId, {
        newAddress: {
          addressId: order.addressId,
          fullName: fullName.trim(),
          phone: phone.trim(),
          addressLine: addressLine.trim(),
          wardCode,
          districtCode,
          provinceCode,
          countryCode: "VN",
        },
      }),
    onSuccess: () => {
      toast.success(t("merchant.orders.toastShippingUpdated"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const submit = () => {
    if (
      !fullName.trim() ||
      !phone.trim() ||
      !addressLine.trim() ||
      !provinceCode ||
      !districtCode ||
      !wardCode
    ) {
      toast.error(t("merchant.orders.errMissingFields"));
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.orders.editShippingTitle")}
      size="lg"
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-gray-200 px-4 py-2.5">
          <p className="text-xs text-gray-500">
            {t("merchant.orders.detailOrderId")}
          </p>
          <p className="break-all font-mono text-base font-semibold text-gray-900">
            {order.orderId}
          </p>
        </div>
        <p className="text-xs text-gray-500">
          {t("merchant.orders.editShippingHint")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t("merchant.orders.editFieldFullName")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label={t("merchant.orders.editFieldPhone")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <Input
          label={t("merchant.orders.editFieldAddress")}
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t("merchant.orders.editFieldProvince")}
            value={provinceCode}
            onChange={(value) => {
              setProvinceCode(value);
              setDistrictCode("");
              setWardCode("");
            }}
            placeholder={t("merchant.orders.editSelectProvince")}
            options={provinces.map((province) => {
              const rawName =
                locale === "en" && province.nameEn
                  ? province.nameEn
                  : province.name;
              return {
                value: province.code,
                label: cleanProvinceName(rawName),
              };
            })}
            required
          />
          <Select
            label={t("merchant.orders.editFieldDistrict")}
            value={districtCode}
            onChange={(value) => {
              setDistrictCode(value);
              setWardCode("");
            }}
            placeholder={t("merchant.orders.editSelectDistrict")}
            options={districts.map((district) => {
              const rawName =
                locale === "en" && district.nameEn
                  ? district.nameEn
                  : district.name;
              return {
                value: district.code,
                label: cleanAdministrativeName(rawName),
              };
            })}
            disabled={!provinceCode}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t("merchant.orders.editFieldWard")}
            value={wardCode}
            onChange={setWardCode}
            placeholder={t("merchant.orders.editSelectWard")}
            options={wards.map((ward) => {
              const rawName =
                locale === "en" && ward.nameEn ? ward.nameEn : ward.name;
              return {
                value: ward.code,
                label: cleanAdministrativeName(rawName),
              };
            })}
            disabled={!districtCode}
            required
          />
          <div>
            <p className="mb-1 block text-sm font-medium text-gray-700">
              {t("merchant.orders.editFieldShippingFee", {
                currency: order.currency,
              })}
            </p>
            <div className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-500">
              {formatCurrency(order.shippingFee, order.currency)}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {t("merchant.orders.editDomesticOnly")}
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.orders.btnCancel")}
          </Button>
          <Button onClick={submit} loading={mutation.isPending}>
            {t("merchant.orders.btnSave")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
