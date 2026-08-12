"use client";

import { useCartSync } from "@/hooks/useCartSync";

export default function CartSyncBoundary() {
  useCartSync();
  return null;
}
