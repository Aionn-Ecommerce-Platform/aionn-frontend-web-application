"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { useTranslation } from "@/hooks";
import PageLoading from "@/shared/ui/PageLoading";

interface AuthGuardProps {
  children: ReactNode;
  requiredRoles?: string[];
  fallback?: ReactNode;
}

export default function AuthGuard({
  children,
  requiredRoles,
  fallback,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitializing, user } = useAuthStore();
  const { t } = useTranslation();

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      const redirect = encodeURIComponent(pathname || "/");
      router.replace(`/auth/login?redirect=${redirect}`);
      return;
    }
    if (requiredRoles && requiredRoles.length > 0) {
      const userRoles = user?.roles ?? [];
      const ok = requiredRoles.some(
        (r) => userRoles.includes(r) || userRoles.includes(`ROLE_${r}`),
      );
      if (!ok) {
        router.replace("/");
      }
    }
  }, [isInitializing, isAuthenticated, requiredRoles, user, router, pathname]);

  if (isInitializing || !isAuthenticated) {
    return fallback ?? <PageLoading />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const userRoles = user?.roles ?? [];
    const ok = requiredRoles.some(
      (r) => userRoles.includes(r) || userRoles.includes(`ROLE_${r}`),
    );
    if (!ok) {
      return (
        fallback ?? (
          <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
            {t("common.accessDenied")}
          </div>
        )
      );
    }
  }

  return <>{children}</>;
}
