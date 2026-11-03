"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Truck,
  Eye,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MessageCircle,
  Phone,
  ChevronRight,
  Package,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/shared/ui";
import { useTranslation } from "@/hooks";

export default function ReturnsPolicyPage() {
  const { t } = useTranslation();

  return (
    <div className="bg-gray-50/60 min-h-screen py-6 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-gray-500"
        >
          <Link
            href="/"
            className="hover:text-gray-900 transition-colors flex items-center gap-1"
          >
            {t("returnPolicyPage.breadcrumbHome")}
          </Link>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-gray-400">
            {t("returnPolicyPage.breadcrumbPolicy")}
          </span>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="font-semibold text-gray-900">
            {t("returnPolicyPage.breadcrumbReturns")}
          </span>
        </nav>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-gray-950 via-gray-900 to-gray-800 text-white p-6 sm:p-10 lg:p-12 shadow-xl border border-gray-800">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold backdrop-blur-md">
              <ShieldCheck size={16} className="text-red-400" />
              <span>{t("returnPolicyPage.heroBadge")}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              {t("returnPolicyPage.heroTitle")}
            </h1>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-normal">
              {t("returnPolicyPage.heroDesc")}
            </p>
            <div className="pt-2 flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {t("returnPolicyPage.lastUpdated")}
              </span>
            </div>
          </div>

          {/* Decorative Background Icon */}
          <ShieldCheck
            size={280}
            className="absolute -right-12 -bottom-16 text-white/5 pointer-events-none stroke-[1]"
          />
        </div>

        {/* 3 Core Commitments */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-950 tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {t("returnPolicyPage.sectionCommitmentsTitle")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Commitment 1 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
                  <RotateCcw size={22} className="stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {t("productDetail.commitment1Title") ||
                    "Đổi trả miễn phí 15 ngày"}
                </h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  {t("productDetail.commitment1Desc") ||
                    "Áp dụng trong 15 ngày kể từ ngày giao hàng thành công. Bạn có thể gửi yêu cầu trực tiếp từ trang Quản lý đơn hàng."}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                <CheckCircle2 size={15} />
                <span>Thời hạn 15 ngày dài nhất thị trường</span>
              </div>
            </div>

            {/* Commitment 2 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Truck size={22} className="stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {t("productDetail.commitment2Title") ||
                    "Miễn phí 100% cước trả hàng"}
                </h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  {t("productDetail.commitment2Desc") ||
                    "Shipper đối tác vận chuyển Aionn sẽ liên hệ và tới tận địa chỉ của bạn để nhận hàng. Bạn không phải trả bất kỳ cước phí nào."}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 size={15} />
                <span>Không mất phí vận chuyển hoàn về</span>
              </div>
            </div>

            {/* Commitment 3 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Eye size={22} className="stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {t("productDetail.commitment3Title") ||
                    "Đồng kiểm khi nhận hàng"}
                </h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  {t("productDetail.commitment3Desc") ||
                    "Được quyền mở hộp kiểm tra ngoại quan (số lượng, đúng màu sắc, tem niêm phong) cùng bưu tá trước khi nhận hàng."}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                <CheckCircle2 size={15} />
                <span>Đồng kiểm minh bạch & an tâm</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Steps Timeline */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-950 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {t("returnPolicyPage.sectionProcessTitle")}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Thực hiện đơn giản hoàn toàn trực tuyến trên website Aionn
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="relative p-5 rounded-2xl bg-gray-50/70 border border-gray-200/70 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block mb-3">
                  Bước 1
                </span>
                <h4 className="text-sm font-bold text-gray-900">
                  {t("productDetail.step1Title") || "Gửi yêu cầu đổi trả"}
                </h4>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Truy cập vào <strong>Đơn mua</strong> &gt; Chọn đơn hàng &gt;
                  Nhấn <strong>Yêu cầu Trả hàng / Hoàn tiền</strong>, chọn lý
                  do và tải ảnh/video thực tế.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative p-5 rounded-2xl bg-gray-50/70 border border-gray-200/70 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block mb-3">
                  Bước 2
                </span>
                <h4 className="text-sm font-bold text-gray-900">
                  {t("productDetail.step2Title") || "Đóng gói hàng cẩn thận"}
                </h4>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Đóng gói sản phẩm cẩn thận vào kiện hàng kèm đầy đủ phụ kiện,
                  quà tặng kèm và hóa đơn bảo hành (nếu có).
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative p-5 rounded-2xl bg-gray-50/70 border border-gray-200/70 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block mb-3">
                  Bước 3
                </span>
                <h4 className="text-sm font-bold text-gray-900">
                  {t("productDetail.step3Title") || "Bàn giao cho Shipper"}
                </h4>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Shipper đối tác Aionn sẽ chủ động gọi điện và đến tận nhà bạn
                  để lấy kiện hàng đổi trả hoàn toàn miễn phí.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative p-5 rounded-2xl bg-gray-50/70 border border-gray-200/70 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block mb-3">
                  Bước 4
                </span>
                <h4 className="text-sm font-bold text-gray-900">
                  {t("productDetail.step4Title") || "Nhận tiền hoàn 100%"}
                </h4>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Khi hàng được trả về kho và kiểm tra đạt điều kiện, hệ thống
                  sẽ lập tức hoàn tiền 100% về phương thức thanh toán ban đầu.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Conditions: Eligible vs Non-eligible */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Eligible */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
              <h3 className="text-base font-bold text-gray-950">
                {t("returnPolicyPage.sectionConditionsTitle")}
              </h3>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle2
                  size={16}
                  className="text-emerald-500 shrink-0 mt-0.5"
                />
                <span>
                  Sản phẩm bị lỗi kỹ thuật hoặc hư hại từ phía nhà sản xuất.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  size={16}
                  className="text-emerald-500 shrink-0 mt-0.5"
                />
                <span>
                  Sản phẩm bị vỡ, móp méo, trầy xước trong quá trình vận chuyển.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  size={16}
                  className="text-emerald-500 shrink-0 mt-0.5"
                />
                <span>
                  Giao sai sản phẩm, sai màu sắc, kích cỡ hoặc thiếu phụ
                  kiện/quà tặng kèm theo đơn hàng.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  size={16}
                  className="text-emerald-500 shrink-0 mt-0.5"
                />
                <span>
                  Khách hàng đổi ý mua sắm (áp dụng cho các sản phẩm còn nguyên
                  seal, tem mác, chưa qua sử dụng).
                </span>
              </li>
            </ul>
          </div>

          {/* Non-Eligible */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                <XCircle size={18} />
              </div>
              <h3 className="text-base font-bold text-gray-950">
                {t("returnPolicyPage.sectionNonReturnableTitle")}
              </h3>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <span>
                  Quá 15 ngày kể từ thời điểm đơn hàng giao thành công.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <span>
                  Sản phẩm hư hỏng do lỗi người dùng (vào nước, rơi vỡ, sử dụng
                  sai hướng dẫn, tự ý tháo mở thiết bị).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <span>
                  Các mặt hàng vệ sinh cá nhân, đồ lót, đồ bơi, mỹ phẩm hoặc
                  thực phẩm đã mở niêm phong/màng bọc.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <span>
                  Mã thẻ cào, phần mềm kỹ thuật số, voucher điện tử đã được kích
                  hoạt.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Refund Timeline & Methods */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-950">
              Thời gian &amp; Phương thức hoàn tiền
            </h3>
          </div>
          <p className="text-xs text-gray-500">
            Sau khi kiện hàng hoàn trả được nhận và duyệt thành công, tiền sẽ
            được hoàn theo thời gian sau:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <h4 className="text-xs font-bold text-gray-900">
                Ví điện tử / Số dư Aionn
              </h4>
              <p className="text-lg font-black text-emerald-600 mt-1">
                Ngay lập tức
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Tiền hoàn ghi nhận trong vòng 2 - 24 giờ.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <h4 className="text-xs font-bold text-gray-900">
                Thẻ ATM nội địa (Napas)
              </h4>
              <p className="text-lg font-black text-gray-900 mt-1">
                3 - 5 ngày
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Tính theo ngày làm việc của ngân hàng.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <h4 className="text-xs font-bold text-gray-900">
                Thẻ Quốc tế (Visa, Mastercard)
              </h4>
              <p className="text-lg font-black text-gray-900 mt-1">
                7 - 14 ngày
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Tùy thuộc vào kỳ sao kê ngân hàng phát hành.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <HelpCircle size={18} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-950">
              {t("returnPolicyPage.sectionFaqTitle")}
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            <div className="py-3.5 space-y-1">
              <p className="text-xs sm:text-sm font-bold text-gray-900">
                1. Tôi có phải thanh toán phí ship khi gửi trả hàng không?
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Hoàn toàn không. Aionn miễn phí 100% cước thu hồi hàng. Shipper
                sẽ đến lấy hàng tại địa chỉ của bạn mà không thu thêm bất kỳ chi
                phí nào.
              </p>
            </div>

            <div className="py-3.5 space-y-1">
              <p className="text-xs sm:text-sm font-bold text-gray-900">
                2. Tôi cần chuẩn bị những gì khi đóng gói hàng trả?
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Quý khách vui lòng cho sản phẩm vào hộp ban đầu (nếu có), kèm
                đầy đủ phụ kiện, quà tặng kèm theo và dán kín kiện hàng. Bưu tá
                sẽ in mã vận đơn và dán lên kiện hàng khi nhận.
              </p>
            </div>

            <div className="py-3.5 space-y-1">
              <p className="text-xs sm:text-sm font-bold text-gray-900">
                3. Đơn hàng giao trễ hơn ngày hẹn có được hỗ trợ gì không?
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Có. Aionn tự động tặng ngay Voucher 15.000₫ vào ví voucher của
                bạn nếu đơn hàng được giao trễ hơn ngày giao dự kiến cam kết.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Live Support Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-r from-red-500 to-rose-600 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-lg shadow-red-500/20">
          <div className="space-y-1">
            <h3 className="text-base sm:text-xl font-bold">
              {t("returnPolicyPage.needHelpTitle")}
            </h3>
            <p className="text-xs sm:text-sm text-red-100 leading-relaxed max-w-xl">
              {t("returnPolicyPage.needHelpDesc")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link href="/chat">
              <Button className="px-5 py-2.5 bg-white text-red-600 hover:bg-gray-100 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 border-none">
                <MessageCircle size={16} />
                <span>{t("returnPolicyPage.chatNow")}</span>
              </Button>
            </Link>

            <Link href="/contact">
              <Button className="px-5 py-2.5 bg-red-600/60 hover:bg-red-700/60 text-white font-semibold text-xs rounded-xl border border-white/20 transition-colors flex items-center gap-1.5">
                <Phone size={15} />
                <span>{t("returnPolicyPage.contactUs")}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

