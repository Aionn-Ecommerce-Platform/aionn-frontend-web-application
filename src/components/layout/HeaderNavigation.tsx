"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { useTranslation } from "@/hooks";

interface Props {
  mobileOpen: boolean;
  sellHref: string;
  onCloseMobile: () => void;
}

export default function HeaderNavigation({
  mobileOpen,
  sellHref,
  onCloseMobile,
}: Props) {
  const { t } = useTranslation();
  const primaryLinks = [
    { href: "/products", label: t("nav.allProducts") },
    { href: "/categories", label: t("nav.categories") },
    { href: "/promotions", label: t("nav.promotions") },
    { href: "/merchants", label: t("nav.shops") },
  ];
  const mobileLinks = [
    ...primaryLinks,
    { href: "/feedback", label: t("common.feedback") },
    { href: "/contact", label: t("common.contactUs") },
    { href: sellHref, label: t("common.sellOnAionn") },
  ];

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden"
          >
            <div className="pb-4 space-y-3">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  placeholder={t("common.search")}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <nav className="space-y-1">
                {mobileLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={onCloseMobile}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="hidden md:block border-t border-gray-100/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-8 h-10 text-sm">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-200" />
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
