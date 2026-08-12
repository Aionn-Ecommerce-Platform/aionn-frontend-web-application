"use client";

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Fragment } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "./Button";
import { useTranslation } from "@/hooks";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  children?: React.ReactNode;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  variant = "danger",
  loading = false,
  children,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-xl flex-shrink-0 ${
                      variant === "danger" ? "bg-red-50" : "bg-blue-50"
                    }`}
                  >
                    <AlertTriangle
                      size={20}
                      className={
                        variant === "danger" ? "text-red-600" : "text-blue-600"
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-base font-semibold text-gray-900">
                      {title}
                    </DialogTitle>
                    <p className="mt-2 text-sm text-gray-500">{message}</p>
                    {children}
                  </div>
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    disabled={loading}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant={variant === "danger" ? "danger" : "primary"}
                    size="sm"
                    onClick={onConfirm}
                    loading={loading}
                  >
                    {confirmLabel ?? t("common.confirm")}
                  </Button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
