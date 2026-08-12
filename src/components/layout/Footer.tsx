"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "@/hooks";
import { useAuthStore } from "@/stores/auth.store";

export default function Footer() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const merchantRegisterHref = isAuthenticated
    ? "/merchant/register"
    : "/auth/login?redirect=/merchant/register";

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <Link
              href="/"
              className="flex items-center gap-2.5 flex-shrink-0 group mb-4"
            >
              <Image
                src="/images/logo_without_text.png"
                alt="Aionn"
                width={194}
                height={181}
                className="h-auto w-10 rounded-lg group-hover:scale-105 transition-transform"
              />
              <span className="text-2xl font-bold tracking-tight text--brand">
                Aionn
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              {t("footer.description")}
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">
              {t("footer.customerTitle")}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/products"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.products")}
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.categories")}
                </Link>
              </li>
              <li>
                <Link
                  href="/promotions"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.promotions")}
                </Link>
              </li>
              <li>
                <Link
                  href="/orders"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.orders")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">
              {t("footer.sellerTitle")}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={merchantRegisterHref}
                  className="hover:text-white transition-colors"
                >
                  {t("footer.sellerRegister")}
                </Link>
              </li>
              <li>
                <Link
                  href="/merchant/products"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.manageProducts")}
                </Link>
              </li>
              <li>
                <Link
                  href="/merchant/orders"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.manageOrders")}
                </Link>
              </li>
              <li>
                <Link
                  href="/merchant/inventory"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.inventory")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">
              {t("footer.supportTitle")}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/help"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.helpCenter")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.contact")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.terms")}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.privacy")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-8 flex justify-center">
          <p className="text-sm text-gray-500 text-center">
            {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
