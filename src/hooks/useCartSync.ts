"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useCartStore } from "@/stores/cart.store";

export function useCartSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const hydrateFromServer = useCartStore((s) => s.hydrateFromServer);
  const hydratedFromServer = useCartStore((s) => s.hydratedFromServer);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) return;
    if (hydratedFromServer) return;
    void hydrateFromServer();
  }, [
    isAuthenticated,
    isInitializing,
    hydratedFromServer,
    hydrateFromServer,
  ]);
}
