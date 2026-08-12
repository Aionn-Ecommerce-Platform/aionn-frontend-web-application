"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import {
  User,
  MapPin,
  CreditCard,
  ShoppingBag,
  RotateCcw,
  Bell,
  Shield,
  Ticket,
  MessageCircle,
  Settings,
} from "lucide-react";

const menuItems = [
  {
    translationKey: "memberSidebar.profile",
    href: "/account",
    icon: User,
  },
  {
    translationKey: "memberSidebar.addresses",
    href: "/account/addresses",
    icon: MapPin,
  },
  {
    translationKey: "memberSidebar.paymentMethods",
    href: "/account/payment-methods",
    icon: CreditCard,
  },
  {
    translationKey: "memberSidebar.orders",
    href: "/orders",
    icon: ShoppingBag,
  },
  {
    translationKey: "memberSidebar.returns",
    href: "/orders/returns",
    icon: RotateCcw,
  },
  {
    translationKey: "memberSidebar.notifications",
    href: "/notifications",
    icon: Bell,
  },
  {
    translationKey: "memberSidebar.vouchers",
    href: "/vouchers",
    icon: Ticket,
  },
  {
    translationKey: "memberSidebar.chat",
    href: "/chat",
    icon: MessageCircle,
  },
  {
    translationKey: "memberSidebar.security",
    href: "/account/security",
    icon: Shield,
  },
  {
    translationKey: "memberSidebar.settings",
    href: "/account/settings",
    icon: Settings,
  },
];

function isMenuItemActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/orders") {
    return (
      pathname.startsWith("/orders/") && !pathname.startsWith("/orders/returns")
    );
  }
  return pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:block">
      <div className="bg-white rounded-xl border border-gray-400 p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-150 pb-3">
          <User size={16} className="text-gray-500" />
          {t("memberSidebar.title")}
        </h3>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isMenuItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-55",
                )}
              >
                <Icon
                  size={18}
                  className={isActive ? "text-blue-700" : "text-gray-500"}
                />
                {t(item.translationKey)}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
