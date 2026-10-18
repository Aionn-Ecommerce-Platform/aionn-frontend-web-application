"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import { Avatar } from "@/shared/ui";
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
  Bot,
  ShieldCheck,
  FileCheck,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { notificationService, conversationService } from "@/lib/services";
import { useAuthStore } from "@/stores";

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
    badgeKey: "notifications" as const,
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
    badgeKey: "chat" as const,
  },
  {
    translationKey: "memberSidebar.security",
    href: "/account/security",
    icon: Shield,
  },
  {
    translationKey: "memberSidebar.agentIdentities",
    href: "/account/agent-identities",
    icon: Bot,
  },
  {
    translationKey: "memberSidebar.kyc",
    href: "/account/kyc",
    icon: ShieldCheck,
  },
  {
    translationKey: "memberSidebar.privacy",
    href: "/account/privacy",
    icon: FileCheck,
  },
  {
    translationKey: "memberSidebar.settings",
    href: "/account/settings",
    icon: Settings,
  },
];

function getActiveHref(pathname: string): string | null {
  const matches = menuItems
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length);
  return matches[0]?.href ?? null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activeHref = getActiveHref(pathname);

  const { data: notifications } = useQuery({
    queryKey: qk.notifications(),
    queryFn: () => notificationService.listMine(50),
    enabled: isAuthenticated,
    refetchInterval: (query) => (query.state.error ? false : 60_000),
  });

  const { data: unreadChat } = useQuery({
    queryKey: qk.unreadCounts,
    queryFn: () => conversationService.unreadCounts(),
    enabled: isAuthenticated,
    refetchInterval: (query) => (query.state.error ? false : 30_000),
  });

  const unreadNotifications = (notifications ?? []).filter(
    (n) => n.status !== "READ" && !n.readAt,
  ).length;

  const totalUnreadChat = unreadChat
    ? Object.values(unreadChat).reduce((s, n) => s + n, 0)
    : 0;

  const badges: Record<string, number> = {
    notifications: unreadNotifications,
    chat: totalUnreadChat,
  };

  const displayName =
    user?.displayName ||
    user?.username ||
    (isAuthenticated ? t("common.account") : t("common.guest"));

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:block">
      <div className="space-y-4">
        {/* User Profile Header replacing Account Control */}
        <Link
          href="/account"
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100/70 transition-colors group cursor-pointer"
        >
          <Avatar
            src={user?.avatarUrl}
            alt={displayName}
            size="md"
            className="ring-2 ring-white shadow-xs shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-950 truncate group-hover:text-brand transition-colors">
              {displayName}
            </p>
            {user?.email && (
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {user.email}
              </p>
            )}
          </div>
        </Link>

        {/* Tab Navigation */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeHref === item.href;
            const badgeCount = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer group",
                  isActive
                    ? "bg-brand/10 text-brand font-bold"
                    : "text-gray-600 hover:text-gray-950 hover:bg-gray-100/70",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={18}
                    className={cn(
                      "transition-colors shrink-0",
                      isActive
                        ? "text-brand"
                        : "text-gray-400 group-hover:text-gray-600",
                    )}
                  />
                  <span className="truncate">{t(item.translationKey)}</span>
                </div>
                {badgeCount > 0 && (
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2 py-0.5 rounded-full transition-all shrink-0",
                      isActive
                        ? "bg-brand text-white shadow-xs"
                        : "bg-gray-200 text-gray-700 group-hover:bg-brand group-hover:text-white",
                    )}
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
