"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus, Edit2, Trash2, Star, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  Button,
  Badge,
  Modal,
  Input,
  ConfirmDialog,
  EmptyState,
  Select,
} from "@/shared/ui";
import Sidebar from "@/components/layout/Sidebar";
import AuthGuard from "@/components/auth/AuthGuard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks";
import { qk } from "@/lib/query-keys";
import { addressService, geographyService } from "@/lib/services";
import type { AddressInput } from "@/lib/services";
import type { Address, AddressType } from "@/types";
import { getErrorMessage, getFieldErrors } from "@/shared/lib/errors";
import {
  cleanProvinceName,
  getLocalizedAddress,
} from "@/shared/lib/address-utils";

interface FormState {
  contactName: string;
  phone: string;
  provinceCode: string;
  districtCode: string;
  wardCode: string;
  detailAddress: string;
  type: AddressType;
  isDefault: boolean;
}

const emptyForm: FormState = {
  contactName: "",
  phone: "",
  provinceCode: "",
  districtCode: "",
  wardCode: "",
  detailAddress: "",
  type: "HOME",
  isDefault: false,
};

function AddressesInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const addressQuery = useQuery({
    queryKey: qk.addresses,
    queryFn: () => addressService.list(),
  });
  const addresses = {
    data: addressQuery.data,
    loading: addressQuery.isLoading,
    refetch: () => qc.invalidateQueries({ queryKey: qk.addresses }),
  };

  const ADDRESS_TYPES: { value: AddressType; label: string }[] = [
    { value: "HOME", label: t("addresses.home") },
    { value: "OFFICE", label: t("addresses.office") },
  ];

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data: provinces = [], error: provinceError } = useQuery({
    queryKey: qk.provinces(),
    queryFn: () => geographyService.listProvinces(),
  });

  const { data: districts = [] } = useQuery({
    queryKey: qk.districts(form.provinceCode),
    queryFn: () => geographyService.listDistricts(form.provinceCode),
    enabled: Boolean(form.provinceCode),
  });

  const { data: wards = [] } = useQuery({
    queryKey: qk.wards(form.districtCode),
    queryFn: () => geographyService.listWards(form.districtCode),
    enabled: Boolean(form.districtCode),
  });

  useEffect(() => {
    if (!provinceError) return;
    toast.error(
      getErrorMessage(
        provinceError,
        locale === "en"
          ? "Failed to load provinces"
          : t("addresses.provinceLoadError"),
      ),
    );
  }, [provinceError, locale, t]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(addr: Address) {
    setEditingId(addr.addressId);
    setForm({
      contactName: addr.contactName,
      phone: addr.phone,
      provinceCode: addr.provinceCode,
      districtCode: addr.districtCode,
      wardCode: addr.wardCode,
      detailAddress: addr.detailAddress,
      type: addr.type,
      isDefault: addr.isDefault,
    });
    setFieldErrors({});
    setModalOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setFieldErrors({});
    try {
      const body: AddressInput = {
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        provinceCode: form.provinceCode,
        districtCode: form.districtCode,
        wardCode: form.wardCode,
        detailAddress: form.detailAddress.trim(),
        type: form.type,
        isDefault: form.isDefault,
      };
      if (editingId) {
        await addressService.update(editingId, body);
        toast.success(t("addresses.updateSuccess"));
      } else {
        await addressService.create(body);
        toast.success(t("addresses.addSuccess"));
      }
      setModalOpen(false);
      void addresses.refetch();
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setActionLoading(true);
    try {
      await addressService.delete(id);
      toast.success(t("addresses.deleteSuccess"));
      void addresses.refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
      setDeleteId(null);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await addressService.setDefault(id);
      toast.success(t("addresses.setDefaultSuccess"));
      void addresses.refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const hasAddresses = addresses.data && addresses.data.length > 0;

  return (
    <div className="member-page bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <Sidebar />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {t("addresses.title")}
              </h1>
              {hasAddresses && (
                <Button size="sm" onClick={openCreate}>
                  <Plus size={16} className="mr-1" />
                  {t("addresses.addAddress")}
                </Button>
              )}
            </div>

            {addresses.loading ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 flex justify-center">
                <Loader2 className="animate-spin text-blue-600" size={28} />
              </div>
            ) : hasAddresses ? (
              <div className="space-y-4">
                {[...(addresses.data || [])]
                  .sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : 0))
                  .map((addr) => (
                    <div
                      key={addr.addressId}
                      className="bg-white rounded-xl border border-gray-100 p-5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                          <MapPin
                            size={18}
                            className="text-blue-500 mt-0.5 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900">
                                {addr.contactName}
                              </span>
                              <span className="text-sm text-gray-500">
                                • {addr.phone}
                              </span>
                              {addr.isDefault && (
                                <Badge variant="info">
                                  {t("addresses.defaultBadge")}
                                </Badge>
                              )}
                              <Badge>
                                {ADDRESS_TYPES.find(
                                  (tItem) => tItem.value === addr.type,
                                )?.label ?? addr.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {getLocalizedAddress(addr, locale)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!addr.isDefault && (
                            <button
                              onClick={() => handleSetDefault(addr.addressId)}
                              className="p-2 text-gray-400 hover:text-blue-600"
                              title={t("addresses.setDefault")}
                            >
                              <Star size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(addr)}
                            className="p-2 text-gray-400 hover:text-blue-600"
                            title={t("common.edit")}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteId(addr.addressId)}
                            className="p-2 text-gray-400 hover:text-red-500"
                            title={t("common.delete")}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100">
                <EmptyState
                  icon={MapPin}
                  title={t("addresses.emptyTitle")}
                  description={
                    t("addresses.emptyDesc") || t("addresses.emptyDescription")
                  }
                  action={
                    <Button onClick={openCreate}>
                      {t("addresses.addAddress")}
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingId ? t("addresses.editAddress") : t("addresses.addNewAddress")
        }
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("addresses.receiverName")}
              value={form.contactName}
              onChange={(e) =>
                setForm({ ...form, contactName: e.target.value })
              }
              error={fieldErrors.contactName}
              required
            />
            <Input
              label={t("addresses.phone")}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              error={fieldErrors.phone}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select
              label={t("addresses.province")}
              value={form.provinceCode}
              onChange={(val) =>
                setForm({
                  ...form,
                  provinceCode: val,
                  districtCode: "",
                  wardCode: "",
                })
              }
              placeholder={t("addresses.selectProvince")}
              options={provinces.map((p) => {
                const rawName = locale === "en" && p.nameEn ? p.nameEn : p.name;
                return {
                  value: p.code,
                  label: cleanProvinceName(rawName),
                };
              })}
              required
            />
            <Select
              label={t("addresses.district")}
              value={form.districtCode}
              onChange={(val) =>
                setForm({
                  ...form,
                  districtCode: val,
                  wardCode: "",
                })
              }
              disabled={!form.provinceCode}
              placeholder={t("addresses.selectDistrict")}
              options={districts.map((d) => {
                const rawName = locale === "en" && d.nameEn ? d.nameEn : d.name;
                const capitalized = rawName
                  .trim()
                  .split(/\s+/)
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");
                return {
                  value: d.code,
                  label: capitalized,
                };
              })}
              required
            />
            <Select
              label={t("addresses.ward")}
              value={form.wardCode}
              onChange={(val) => setForm({ ...form, wardCode: val })}
              disabled={!form.districtCode}
              placeholder={t("addresses.selectWard")}
              options={wards.map((w) => {
                const rawName = locale === "en" && w.nameEn ? w.nameEn : w.name;
                const capitalized = rawName
                  .trim()
                  .split(/\s+/)
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");
                return {
                  value: w.code,
                  label: capitalized,
                };
              })}
              required
            />
          </div>
          <Input
            label={t("addresses.detailAddress")}
            value={form.detailAddress}
            onChange={(e) =>
              setForm({ ...form, detailAddress: e.target.value })
            }
            placeholder={
              t("addresses.detailPlaceholder") ||
              t("addresses.detailPlaceholder")
            }
            error={fieldErrors.detailAddress}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("addresses.addressType")}
            </label>
            <div className="flex gap-2">
              {ADDRESS_TYPES.map((tItem) => (
                <button
                  key={tItem.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: tItem.value })}
                  className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                    form.type === tItem.value
                      ? "border-blue-500 bg-blue-50 text-blue-700 font-bold"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tItem.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) =>
                setForm({ ...form, isDefault: e.target.checked })
              }
              className="rounded border-gray-350 text-blue-600 focus:ring-blue-500"
            />
            {t("addresses.setDefault")}
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingId ? t("common.save") : t("common.add")}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title={t("addresses.deleteTitle")}
        message={t("addresses.deleteConfirm")}
        confirmLabel={t("common.delete")}
        loading={actionLoading}
      />
    </div>
  );
}

export default function AddressesPage() {
  return (
    <AuthGuard>
      <AddressesInner />
    </AuthGuard>
  );
}
