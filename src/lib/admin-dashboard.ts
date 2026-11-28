import {
  BarChart3,
  Bell,
  Boxes,
  Coins,
  MessageCircle,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Store,
  Ticket,
  Truck,
  Wallet,
} from "lucide-react";

export const ADMIN_DASHBOARD_MODULES = [
  {
    labelKey: "console.admin.analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    labelKey: "console.admin.orders",
    href: "/admin/orders",
    icon: ShoppingBag,
  },
  {
    labelKey: "console.admin.reviews",
    href: "/admin/reviews",
    icon: MessageCircle,
  },
  {
    labelKey: "console.admin.chat",
    href: "/admin/chat",
    icon: MessageSquare,
  },
  {
    labelKey: "console.admin.merchants",
    href: "/admin/merchants",
    icon: Store,
  },
  {
    labelKey: "console.admin.warehouses",
    href: "/admin/warehouses",
    icon: Boxes,
  },
  {
    labelKey: "console.admin.payouts",
    href: "/admin/payouts",
    icon: Wallet,
    roles: ["SYSTEM_ADMIN"],
  },
  {
    labelKey: "console.admin.codReconciliation",
    href: "/admin/cod-reconciliation",
    icon: Coins,
    roles: ["SYSTEM_ADMIN"],
  },
  {
    labelKey: "console.admin.shippingRates",
    href: "/admin/shipping/rates",
    icon: Truck,
    roles: ["SYSTEM_ADMIN"],
  },
  {
    labelKey: "console.admin.flashSale",
    href: "/admin/promotions/flash-sales",
    icon: Ticket,
    roles: ["SYSTEM_ADMIN"],
  },
  {
    labelKey: "console.admin.campaigns",
    href: "/admin/promotions/campaigns",
    icon: Sparkles,
    roles: ["SYSTEM_ADMIN"],
  },
  {
    labelKey: "console.admin.notificationTemplates",
    href: "/admin/notifications/templates",
    icon: Bell,
    roles: ["SYSTEM_ADMIN"],
  },
];
