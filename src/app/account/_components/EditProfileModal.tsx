"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, Mail, Phone, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input, Modal } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { DEFAULT_AVATAR_URL } from "@/shared/ui/Avatar";
import type { UserProfile } from "@/types";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSave: (data: { displayName?: string; avatarFile?: File }) => Promise<void>;
  onOpenEmailModal: () => void;
  onOpenPhoneModal: () => void;
  loading: boolean;
}

export function EditProfileModal({
  open,
  onClose,
  user,
  onSave,
  onOpenEmailModal,
  onOpenPhoneModal,
  loading,
}: EditProfileModalProps) {
  const { t, locale } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [prevUser, setPrevUser] = useState(user);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (prevUser !== user) {
    setPrevUser(user);
    setDisplayName(user?.displayName ?? "");
  }

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleClose() {
    if (loading) return;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setDisplayName(user?.displayName ?? "");
    onClose();
  }

  const MAX_FILE_SIZE_MB = 1;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  function handleFileChange(file: File) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      toast.error(
        locale === "en"
          ? "Only .JPEG, .PNG, .WEBP formats are supported"
          : "Chỉ hỗ trợ định dạng: .JPEG, .PNG, .WEBP",
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(
        locale === "en"
          ? `File size exceeds ${MAX_FILE_SIZE_MB} MB limit`
          : `Dung lượng file tối đa là ${MAX_FILE_SIZE_MB} MB`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleResetImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleConfirm() {
    const trimmed = displayName.trim();
    const hasNameChanged = trimmed !== (user?.displayName ?? "").trim();
    const hasAvatarChanged = Boolean(selectedFile);

    if (!hasNameChanged && !hasAvatarChanged) {
      onClose();
      return;
    }

    await onSave({
      displayName: hasNameChanged ? trimmed : undefined,
      avatarFile: selectedFile ?? undefined,
    });
  }

  const currentAvatar = user?.avatarUrl?.trim() || DEFAULT_AVATAR_URL;
  const displayImage = previewUrl || currentAvatar;

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={locale === "en" ? "Edit Profile" : "Sửa Hồ Sơ"}
      size="md"
    >
      <div className="space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative group">
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-gray-300 shadow-md bg-gray-50 flex items-center justify-center">
              <Image
                src={displayImage}
                alt="Avatar"
                fill
                sizes="112px"
                className="object-cover"
                unoptimized={Boolean(previewUrl)}
              />
              {loading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 size={28} className="text-white animate-spin" />
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-transform hover:scale-105 cursor-pointer disabled:opacity-50"
              title={locale === "en" ? "Change photo" : "Đổi ảnh đại diện"}
            >
              <Camera size={16} />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileChange(f);
            }}
          />

          {selectedFile ? (
            <div className="mt-2.5 flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
              <span className="truncate max-w-[180px]">
                {selectedFile.name}
              </span>
              <button
                type="button"
                onClick={handleResetImage}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
            >
              {locale === "en" ? "Change profile photo" : "Đổi ảnh đại diện"}
            </button>
          )}

          {/* Helper note on file limits */}
          <div className="mt-2.5 text-center text-xs text-gray-400 space-y-0.5">
            <p>
              {locale === "en"
                ? `Max file size: ${MAX_FILE_SIZE_MB} MB`
                : `Dung lượng file tối đa ${MAX_FILE_SIZE_MB} MB`}
            </p>
            <p>
              {locale === "en"
                ? "Format: .JPEG, .PNG, .WEBP"
                : "Định dạng: .JPEG, .PNG, .WEBP"}
            </p>
          </div>
        </div>

        {/* Username (read-only) */}
        <div>
          <label htmlFor="modalUsername" className="block text-sm font-medium text-gray-700 mb-1">
            {locale === "en" ? "Username" : "Tên đăng nhập"}
          </label>
          <Input
            id="modalUsername"
            value={user?.username ?? ""}
            disabled
            className="w-full text-sm font-medium text-gray-900 bg-gray-50 border-gray-300"
          />
        </div>

        {/* Display Name Input */}
        <div>
          <label htmlFor="modalDisplayName" className="block text-sm font-medium text-gray-700 mb-1">
            {t("account.displayName")}
          </label>
          <Input
            id="modalDisplayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            placeholder={
              locale === "en" ? "Enter your name" : "Nhập tên hiển thị"
            }
            className="w-full text-sm font-medium text-gray-900 border-gray-300"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="modalEmail" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="modalEmail"
              value={
                user?.email ?? (locale === "en" ? "Not set" : "Chưa thiết lập")
              }
              disabled
              icon={<Mail size={16} className="text-gray-500" />}
              className="flex-1 text-sm font-medium text-gray-900 bg-gray-50 border-gray-300"
            />
            <Button
              type="button"
              onClick={() => {
                onClose();
                onOpenEmailModal();
              }}
              className="h-[42px] px-4 shrink-0 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold rounded-lg flex items-center justify-center cursor-pointer text-sm"
            >
              {user?.email
                ? locale === "en"
                  ? "Change"
                  : "Đổi"
                : locale === "en"
                  ? "Add"
                  : "Thêm"}
            </Button>
          </div>
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="modalPhone" className="block text-sm font-medium text-gray-700 mb-1">
            {locale === "en" ? "Phone Number" : "Số điện thoại"}
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="modalPhone"
              value={
                user?.phone ?? (locale === "en" ? "Not set" : "Chưa thiết lập")
              }
              disabled
              icon={<Phone size={16} className="text-gray-500" />}
              className="flex-1 text-sm font-medium text-gray-900 bg-gray-50 border-gray-300"
            />
            <Button
              type="button"
              onClick={() => {
                onClose();
                onOpenPhoneModal();
              }}
              className="h-[42px] px-4 shrink-0 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold rounded-lg flex items-center justify-center cursor-pointer text-sm"
            >
              {user?.phone
                ? locale === "en"
                  ? "Change"
                  : "Đổi"
                : locale === "en"
                  ? "Add"
                  : "Thêm"}
            </Button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            loading={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            {locale === "en" ? "Save changes" : "Lưu thay đổi"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
