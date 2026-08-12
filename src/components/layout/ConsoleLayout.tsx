"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bot,
  Boxes,
  CreditCard,
  Folder,
  Home,
  Image,
  ListChecks,
  MessageCircle,
  MessageSquare,
  Package,
  PackageSearch,
  PackageX,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Ticket,
  Truck,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useTranslation } from "@/hooks";

const EMPTY_ROLES: string[] = [];

type ConsoleKind = "merchant" | "admin";

interface ConsoleMenuItem {
  labelKey: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
  roles?: string[];
}

const merchantItems: ConsoleMenuItem[] = [
  {
    labelKey: "console.merchant.dashboard",
    href: "/merchant/dashboard",
    icon: Home,
    exact: true,
  },
  {
    labelKey: "console.merchant.products",
    href: "/merchant/products",
    icon: Package,
  },
  {
    labelKey: "console.merchant.orders",
    href: "/merchant/orders",
    icon: ShoppingBag,
    exact: true,
  },
  {
    labelKey: "console.merchant.returns",
    href: "/merchant/orders/returns",
    icon: PackageX,
  },
  {
    labelKey: "console.merchant.warehouses",
    href: "/merchant/warehouses",
    icon: Warehouse,
  },
  {
    labelKey: "console.merchant.inventory",
    href: "/merchant/inventory",
    icon: Boxes,
    exact: true,
  },
  {
    labelKey: "console.merchant.payouts",
    href: "/merchant/payouts",
    icon: Wallet,
  },
  {
    labelKey: "console.merchant.reviews",
    href: "/merchant/reviews",
    icon: MessageSquare,
  },
  {
    labelKey: "console.merchant.vouchers",
    href: "/merchant/promotions/vouchers",
    icon: Ticket,
  },
  {
    labelKey: "console.merchant.flashSale",
    href: "/merchant/promotions/flash-sales",
    icon: Sparkles,
  },
  {
    labelKey: "console.merchant.autoReply",
    href: "/merchant/chat/auto-reply",
    icon: Bot,
  },
  {
    labelKey: "console.merchant.chat",
    href: "/merchant/chat",
    icon: MessageCircle,
    exact: true,
  },
  {
    labelKey: "console.merchant.settings",
    href: "/merchant/settings",
    icon: Settings,
  },
];

const adminItems: ConsoleMenuItem[] = [
  {
    labelKey: "console.admin.dashboard",
    href: "/admin",
    icon: Home,
    exact: true,
  },
  { labelKey: "console.admin.users", href: "/admin/users", icon: Users },
  { labelKey: "console.admin.kyc", href: "/admin/kyc", icon: ShieldCheck },
  {
    labelKey: "console.admin.feedbacks",
    href: "/admin/feedbacks",
    icon: MessageSquare,
  },
  {
    labelKey: "console.admin.returns",
    href: "/admin/orders/returns",
    icon: PackageX,
  },
  {
    labelKey: "console.admin.productReview",
    href: "/admin/products/pending",
    icon: ListChecks,
  },
  {
    labelKey: "console.admin.merchants",
    href: "/admin/merchants",
    icon: Store,
  },
  {
    labelKey: "console.admin.brands",
    href: "/admin/brands",
    icon: Tag,
    roles: ["SYSTEM_ADMIN", "CS_ADMIN"],
  },
  {
    labelKey: "console.admin.categories",
    href: "/admin/categories",
    icon: Folder,
    roles: ["SYSTEM_ADMIN", "CS_ADMIN"],
  },
  {
    labelKey: "console.admin.attributes",
    href: "/admin/attribute-templates",
    icon: PackageSearch,
    roles: ["SYSTEM_ADMIN"],
  },
  {
    labelKey: "console.admin.inventory",
    href: "/admin/inventory",
    icon: Boxes,
  },
  {
    labelKey: "console.admin.payments",
    href: "/admin/payments",
    icon: CreditCard,
  },
  {
    labelKey: "console.admin.payouts",
    href: "/admin/payouts",
    icon: Wallet,
    roles: ["SYSTEM_ADMIN"],
  },
  {
    labelKey: "console.admin.shippingRates",
    href: "/admin/shipping/rates",
    icon: Truck,
    roles: ["SYSTEM_ADMIN"],
  },
  {
    labelKey: "console.admin.banners",
    href: "/admin/promotions/banners",
    icon: Image,
  },
  {
    labelKey: "console.admin.campaigns",
    href: "/admin/promotions/campaigns",
    icon: Sparkles,
    roles: ["SYSTEM_ADMIN"],
  },
  {
    labelKey: "console.admin.flashSale",
    href: "/admin/promotions/flash-sales",
    icon: Ticket,
    roles: ["SYSTEM_ADMIN"],
  },
  {
    labelKey: "console.admin.notificationTemplates",
    href: "/admin/notifications/templates",
    icon: Bell,
    roles: ["SYSTEM_ADMIN"],
  },
  {
    labelKey: "console.admin.notificationProviders",
    href: "/admin/notifications/providers",
    icon: Settings,
    roles: ["SYSTEM_ADMIN"],
  },
];

export default function ConsoleLayout({
  children,
  kind,
}: {
  children: React.ReactNode;
  kind: ConsoleKind;
}) {
  const pathname = usePathname();
  const userRoles = useAuthStore((s) => s.user?.roles ?? EMPTY_ROLES);
  const { t } = useTranslation();

  if (kind === "merchant" && pathname.startsWith("/merchant/register")) {
    return <>{children}</>;
  }

  const items =
    kind === "merchant"
      ? merchantItems
      : adminItems.filter((item) => canSeeItem(item, userRoles));
  const title =
    kind === "merchant"
      ? t("console.merchant.title")
      : t("console.admin.title");
  const Icon = kind === "merchant" ? Store : ShieldCheck;

  return (
    <div className="console-page member-page bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-md border border-gray-400 p-5 space-y-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-150 pb-3">
                <Icon size={16} className="text-gray-500" />
                {title}
              </h3>
              <nav className="space-y-1">
                {items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
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
                      <ItemIcon
                        size={18}
                        className={isActive ? "text-blue-700" : "text-gray-500"}
                      />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>
          <section className="console-content flex-1 min-w-0">
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}

function canSeeItem(item: ConsoleMenuItem, userRoles: string[]) {
  if (!item.roles || userRoles.length === 0) {
    return true;
  }
  return item.roles.some(
    (role) => userRoles.includes(role) || userRoles.includes(`ROLE_${role}`),
  );
}
