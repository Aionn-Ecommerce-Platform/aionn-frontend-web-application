"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { DEFAULT_AVATAR_URL } from "@/shared/ui/Avatar";

export interface ChangeAvatarModalProps {
  open: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  onSave: (file: File) => Promise<void>;
  loading: boolean;
}

const MAX_FILE_SIZE_MB = 1;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export function ChangeAvatarModal({
  open,
  onClose,
  currentAvatarUrl,
  onSave,
  loading,
}: ChangeAvatarModalProps) {
  const { t, locale } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleClose() {
    if (loading) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    onClose();
  }

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

  const displayImage =
    previewUrl || currentAvatarUrl?.trim() || DEFAULT_AVATAR_URL;

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={locale === "en" ? "Change Avatar" : "Đổi ảnh đại diện"}
      size="sm"
    >
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center">
          <div className="relative group">
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-gray-300 shadow-md bg-gray-50 flex items-center justify-center">
              <Image
                src={displayImage}
                alt="Avatar preview"
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
            <div className="mt-2.5 flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-1 rounded-xs border border-gray-200">
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
            disabled={!selectedFile || loading}
            loading={loading}
            onClick={() => selectedFile && onSave(selectedFile)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {locale === "en" ? "Save" : "Lưu"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ChangeAvatarModal;
