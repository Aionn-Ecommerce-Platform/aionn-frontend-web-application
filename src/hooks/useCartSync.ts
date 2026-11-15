"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useCartStore } from "@/stores/cart.store";

export function useCartSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const hydrateFromServer = useCartStore((s) => s.hydrateFromServer);
  const hydratedFromServer = useCartStore((s) => s.hydratedFromServer);
  const hydrationAttempts = useCartStore((s) => s.hydrationAttempts);
  const syncing = useCartStore((s) => s.syncing);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) return;
    if (hydratedFromServer) return;
    if (syncing) return;
    if (hydrationAttempts >= 3) return;
    void hydrateFromServer();
  }, [
    isAuthenticated,
    isInitializing,
    hydratedFromServer,
    hydrationAttempts,
    syncing,
    hydrateFromServer,
  ]);
}
