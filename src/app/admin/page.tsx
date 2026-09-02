"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Boxes,
  ListChecks,
  MessageSquare,
  PackageX,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { Card, CardTitle } from "@/shared/ui";
import { ADMIN_DASHBOARD_MODULES } from "@/lib/admin-dashboard";
import { hasRole } from "@/shared/lib/role-utils";
import {
  adminAnalyticsService,
  adminFeedbackService,
  adminKycService,
  adminOrderReturnService,
  merchantService,
  productService,
} from "@/lib/services";
import { useAuthStore } from "@/stores/auth.store";
import { useTranslation } from "@/hooks";

function AdminDashboardInner() {
  const { t } = useTranslation();
  const userRoles = useAuthStore((s) => s.user?.roles ?? []);
  const isSystemAdmin = hasRole(userRoles, "SYSTEM_ADMIN");
  const visibleModules = ADMIN_DASHBOARD_MODULES.filter(
    (mod) => !mod.roles || mod.roles.some((role) => hasRole(userRoles, role)),
  );

  const { data: userAnalytics } = useQuery({
    queryKey: ["admin-dashboard", "user-analytics"],
    queryFn: () => adminAnalyticsService.users(),
    enabled: isSystemAdmin,
  });
  const { data: merchants } = useQuery({
    queryKey: ["admin-dashboard", "merchants"],
    queryFn: () => merchantService.list(0, 100),
    enabled: isSystemAdmin,
  });
  const { data: allProducts } = useQuery({
    queryKey: ["admin-dashboard", "products"],
    queryFn: () => productService.search({ page: 0, size: 1 }),
    enabled: isSystemAdmin,
  });
  const { data: pendingProducts } = useQuery({
    queryKey: ["admin-dashboard", "pending-products"],
    queryFn: () =>
      productService.searchByMerchant({
        status: "PENDING_REVIEW",
        page: 0,
        size: 1,
      }),
  });
  const { data: submittedKyc } = useQuery({
    queryKey: ["admin-dashboard", "kyc", "submitted"],
    queryFn: () => adminKycService.listByStatus("SUBMITTED", 100),
  });
  const { data: openFeedbacks } = useQuery({
    queryKey: ["admin-dashboard", "feedbacks", "open"],
    queryFn: () =>
      adminFeedbackService.list({ status: "OPEN", page: 0, size: 1 }),
  });
  const { data: requestedReturns } = useQuery({
    queryKey: ["admin-dashboard", "returns", "requested"],
    queryFn: () => adminOrderReturnService.listByStatus("REQUESTED", 100),
  });

  const queueStats = [
    {
      label: t("adminDashboard.pendingKyc"),
      value: submittedKyc?.data?.length ?? 0,
      href: "/admin/kyc",
      icon: ShieldCheck,
    },
    {
      label: t("adminDashboard.newFeedback"),
      value: openFeedbacks?.totalElements ?? openFeedbacks?.content.length ?? 0,
      href: "/admin/feedbacks",
      icon: MessageSquare,
    },
    {
      label: t("adminDashboard.pendingReturns"),
      value: requestedReturns?.length ?? 0,
      href: "/admin/orders/returns",
      icon: PackageX,
    },
    {
      label: t("adminDashboard.pendingProducts"),
      value:
        pendingProducts?.totalElements ?? pendingProducts?.content?.length ?? 0,
      href: "/admin/products/pending",
      icon: ListChecks,
    },
  ];

  const systemStats = [
    {
      label: t("adminDashboard.accounts"),
      value: userAnalytics?.totalUsers ?? 0,
      href: "/admin/users",
      icon: Users,
    },
    {
      label: t("adminDashboard.merchants"),
      value: merchants?.length ?? 0,
      href: "/admin/merchants",
      icon: Store,
    },
    {
      label: t("adminDashboard.products"),
      value:
        allProducts?.page?.totalElements ??
        allProducts?.page?.content?.length ??
        0,
      href: "/admin/products/pending",
      icon: Boxes,
    },
    {
      label: t("adminDashboard.operationsQueue"),
      value: queueStats.reduce((sum, stat) => sum + stat.value, 0),
      href: "/admin/kyc",
      icon: AlertCircle,
    },
  ];

  const stats = isSystemAdmin ? systemStats : queueStats;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t("adminDashboard.title")}
        </h1>
        <p className="text-gray-500 mb-8">{t("adminDashboard.description")}</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="h-full hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
                <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">
                  {stat.label}
                </p>
                <p className="text-xl font-bold text-gray-900 mt-2 truncate">
                  {stat.value}
                </p>
              </Card>
            </Link>
          ))}
        </div>

        {isSystemAdmin ? (
          <div className="mb-8">
            <Card>
              <div className="flex items-center justify-between mb-5">
                <CardTitle>{t("adminDashboard.operationsQueue")}</CardTitle>
                <span className="text-xs text-gray-500">
                  {t("adminDashboard.items", {
                    count: queueStats.reduce(
                      (sum, stat) => sum + stat.value,
                      0,
                    ),
                  })}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {queueStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <Link
                      key={stat.label}
                      href={stat.href}
                      className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3 hover:border-blue-200 hover:bg-blue-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {stat.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {t("adminDashboard.items", { count: stat.value })}
                        </p>
                      </div>
                      <Icon size={18} className="text-blue-600" />
                    </Link>
                  );
                })}
              </div>
            </Card>
          </div>
        ) : null}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.href} href={mod.href}>
                <Card className="h-full hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-blue-50 rounded-md mb-3">
                      <Icon size={24} className="text-blue-600" />
                    </div>
                    <CardTitle className="text-sm">{mod.label}</CardTitle>
                    <p className="text-xs text-gray-500 mt-1">{mod.desc}</p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminDashboardInner />
    </AuthGuard>
  );
}
