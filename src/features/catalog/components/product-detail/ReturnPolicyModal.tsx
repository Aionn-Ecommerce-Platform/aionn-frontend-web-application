"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Truck,
  Eye,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Modal from "@/shared/ui/Modal";
import { useTranslation } from "@/hooks";

interface ReturnPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReturnPolicyModal({
  isOpen,
  onClose,
}: ReturnPolicyModalProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck size={24} className="stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {t("productDetail.returnPolicyTitle") ||
                "Chính sách Trả hàng & Hoàn tiền 15 ngày"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("productDetail.buyerProtectionTitle") ||
                "An tâm mua sắm cùng Aionn"}
            </p>
          </div>
        </div>

        {/* 3 Golden Commitments */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Commitment 1 */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100/80 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-red-100/80 text-red-600 flex items-center justify-center mb-2.5">
                <RotateCcw size={16} />
              </div>
              <h4 className="text-xs font-bold text-gray-900">
                {t("productDetail.commitment1Title") ||
                  "Đổi trả miễn phí 15 ngày"}
              </h4>
              <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                {t("productDetail.commitment1Desc") ||
                  "Áp dụng trong 15 ngày kể từ ngày giao hàng thành công khi lỗi sản xuất, bể vỡ, sai mẫu hoặc đổi ý."}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-red-600">
              <CheckCircle2 size={13} />
              <span>15 ngày cam kết</span>
            </div>
          </div>

          {/* Commitment 2 */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100/80 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-600 flex items-center justify-center mb-2.5">
                <Truck size={16} />
              </div>
              <h4 className="text-xs font-bold text-gray-900">
                {t("productDetail.commitment2Title") ||
                  "Miễn phí 100% cước trả hàng"}
              </h4>
              <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                {t("productDetail.commitment2Desc") ||
                  "Shipper đối tác đến tận nhà lấy hàng. Khách hàng không phải chi trả bất kỳ khoản phí nào."}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <CheckCircle2 size={13} />
              <span>0đ phí hoàn trả</span>
            </div>
          </div>

          {/* Commitment 3 */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100/80 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-blue-600 flex items-center justify-center mb-2.5">
                <Eye size={16} />
              </div>
              <h4 className="text-xs font-bold text-gray-900">
                {t("productDetail.commitment3Title") ||
                  "Đồng kiểm khi nhận hàng"}
              </h4>
              <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                {t("productDetail.commitment3Desc") ||
                  "Được kiểm tra ngoại quan gói hàng và tem niêm phong cùng shipper trước khi nhận hàng."}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-blue-600">
              <CheckCircle2 size={13} />
              <span>Đồng kiểm an tâm</span>
            </div>
          </div>
        </div>

        {/* 4 Steps Timeline */}
        <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100/80">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {t("productDetail.processTitle") ||
              "Quy trình 4 bước trả hàng & hoàn tiền"}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left">
            <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/40">
              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                Bước 1
              </span>
              <p className="text-xs font-semibold text-gray-900 mt-1.5">
                {t("productDetail.step1Title") || "Gửi yêu cầu"}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {t("productDetail.step1Desc") ||
                  "Vào Đơn mua > Yêu cầu trả hàng"}
              </p>
            </div>
            <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/40">
              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                Bước 2
              </span>
              <p className="text-xs font-semibold text-gray-900 mt-1.5">
                {t("productDetail.step2Title") || "Đóng gói hàng"}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {t("productDetail.step2Desc") ||
                  "Đóng gói kèm phụ kiện, quà tặng"}
              </p>
            </div>
            <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/40">
              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                Bước 3
              </span>
              <p className="text-xs font-semibold text-gray-900 mt-1.5">
                {t("productDetail.step3Title") || "Giao Shipper"}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {t("productDetail.step3Desc") ||
                  "Shipper đến lấy hàng miễn phí"}
              </p>
            </div>
            <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/40">
              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                Bước 4
              </span>
              <p className="text-xs font-semibold text-gray-900 mt-1.5">
                {t("productDetail.step4Title") || "Hoàn tiền 100%"}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {t("productDetail.step4Desc") ||
                  "Tiền hoàn về ví/thẻ ban đầu"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/policy/returns"
            onClick={onClose}
            className="text-xs font-medium text-red-500 hover:text-red-600 inline-flex items-center gap-1 group transition-colors"
          >
            {t("productDetail.viewFullPolicy") ||
              "Xem toàn bộ điều khoản chính sách"}
            <ArrowRight
              size={13}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg cursor-pointer transition-colors shadow-xs"
          >
            {t("productDetail.close") || "Đã hiểu"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
