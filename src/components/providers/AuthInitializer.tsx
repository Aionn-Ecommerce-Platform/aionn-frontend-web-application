"use client";

import { useEffect } from "react";
import { useAuthStore, registerUnauthorizedHandler } from "@/stores/auth.store";

export default function AuthInitializer() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  useEffect(() => {
    registerUnauthorizedHandler();
    if (isInitializing) {
      void bootstrap();
    }
  }, [bootstrap, isInitializing]);

  return null;
}
