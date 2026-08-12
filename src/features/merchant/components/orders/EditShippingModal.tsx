"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button, Modal, Input } from "@/shared/ui";
import { orderService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";
import type { Order } from "@/types";
export function EditShippingModal({
  order,
  onClose,
  onSuccess,
}: {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [wardCode, setWardCode] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [countryCode, setCountryCode] = useState("VN");
  const [shippingFee, setShippingFee] = useState(String(order.shippingFee));

  const mutation = useMutation({
    mutationFn: () =>
      orderService.changeShippingInfo(order.orderId, {
        newAddress: {
          addressId: order.addressId,
          fullName: fullName.trim(),
          phone: phone.trim(),
          addressLine: addressLine.trim(),
          wardCode: wardCode.trim() || null,
          districtCode: districtId.trim() || null,
          provinceCode: provinceCode.trim() || null,
          countryCode: countryCode.trim() || "VN",
        },
        newShippingFee: Number(shippingFee),
      }),
    onSuccess: () => {
      toast.success(t("merchant.orders.toastShippingUpdated"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const submit = () => {
    if (!fullName.trim() || !phone.trim() || !addressLine.trim()) {
      toast.error(t("merchant.orders.errMissingFields"));
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.orders.editShippingTitle", {
        id: order.orderId.slice(0, 8).toUpperCase(),
      })}
      size="md"
    >
      <div className="space-y-4">
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
        <div className="grid grid-cols-3 gap-3">
          <Input
            label={t("merchant.orders.editFieldWard")}
            value={wardCode}
            onChange={(e) => setWardCode(e.target.value)}
          />
          <Input
            label={t("merchant.orders.editFieldDistrict")}
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value)}
          />
          <Input
            label={t("merchant.orders.editFieldProvince")}
            value={provinceCode}
            onChange={(e) => setProvinceCode(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t("merchant.orders.editFieldCountry")}
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
          />
          <Input
            label={t("merchant.orders.editFieldShippingFee", {
              currency: order.currency,
            })}
            type="number"
            min="0"
            value={shippingFee}
            onChange={(e) => setShippingFee(e.target.value)}
          />
        </div>
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
