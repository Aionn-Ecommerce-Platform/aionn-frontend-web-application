"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import { Avatar } from "@/shared/ui";
import {
  User,
  CreditCard,
  ShoppingBag,
  Bell,
  Shield,
  Ticket,
  MessageCircle,
  Settings,
  Bot,
  ShieldCheck,
  Heart,
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
    translationKey: "memberSidebar.paymentMethods",
    href: "/account/payment-methods",
    icon: CreditCard,
  },
  {
    translationKey: "memberSidebar.wishlist",
    href: "/account/wishlist",
    icon: Heart,
  },
  {
    translationKey: "memberSidebar.orders",
    href: "/orders",
    icon: ShoppingBag,
  },
  {
    translationKey: "memberSidebar.vouchers",
    href: "/vouchers",
    icon: Ticket,
  },
  {
    translationKey: "memberSidebar.notifications",
    href: "/notifications",
    icon: Bell,
    badgeKey: "notifications" as const,
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
    merchantOnly: true,
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
  const isMerchant = (user?.roles ?? []).some(
    (role) => role.replace(/^ROLE_/, "") === "MERCHANT",
  );
  const visibleMenuItems = menuItems.filter(
    (item) =>
      !("merchantOnly" in item) || !item.merchantOnly || isMerchant,
  );

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
      <div className="relative overflow-hidden rounded-2xl border border-purple-800/60 bg-gradient-to-br from-purple-900 via-indigo-950 to-purple-950 p-5 text-white shadow-xl shadow-purple-950/20">
        <div className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-purple-600/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-fuchsia-600/20 blur-2xl" />

        <div className="relative z-10 flex items-center gap-3 border-b border-amber-400/70 pb-4">
          <Avatar
            src={user?.avatarUrl}
            alt={displayName}
            size="md"
            className="ring-2 ring-white/20 shadow-sm shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">
              {displayName}
            </p>
          </div>
        </div>

        <nav className="relative z-10 mt-4 space-y-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeHref === item.href;
            const badgeCount = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer group",
                  isActive
                    ? "bg-purple-600 font-bold text-white shadow-md shadow-purple-600/40"
                    : "text-purple-100/80 hover:bg-white/10 hover:text-white",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={18}
                    className={cn(
                      "transition-colors shrink-0",
                      isActive
                        ? "text-white"
                        : "text-purple-200/70 group-hover:text-white",
                    )}
                  />
                  <span className="truncate">{t(item.translationKey)}</span>
                </div>
                {badgeCount > 0 && (
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2 py-0.5 rounded-full transition-all shrink-0",
                      isActive
                        ? "bg-amber-400 text-purple-950 shadow-xs"
                        : "bg-white/15 text-white group-hover:bg-amber-400 group-hover:text-purple-950",
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
