import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { guestRecommendationConfig } from "@/features/catalog/guest-recommendation/config";
import type { GuestViewedProduct } from "@/features/catalog/guest-recommendation/ranking";

interface GuestRecommendationState {
  seed: string;
  viewed: GuestViewedProduct[];
  lastActiveAt: number;
  ensureSession: () => void;
  recordView: (view: {
    productId: string;
    categoryIds: string[];
    brandId: string | null;
  }) => void;
  reset: () => void;
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const STORAGE_KEY = "aionn-guest-recommendation";


function createSeed(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function isExpired(lastActiveAt: number, now: number): boolean {
  if (!lastActiveAt) return true;
  return now - lastActiveAt > guestRecommendationConfig.viewTtlMinutes * 60_000;
}

function freshState() {
  return {
    seed: createSeed(),
    viewed: [] as GuestViewedProduct[],
    lastActiveAt: Date.now(),
  };
}

export const useGuestRecommendationStore = create<GuestRecommendationState>()(
  persist(
    (set) => ({
      ...freshState(),

      ensureSession: () =>
        set((state) => {
          const now = Date.now();
          return isExpired(state.lastActiveAt, now) || !state.seed
            ? freshState()
            : { lastActiveAt: now };
        }),

      recordView: (view) =>
        set((state) => {
          const now = Date.now();
          const base = isExpired(state.lastActiveAt, now) ? freshState() : state;
          const nextViewed = [
            { ...view, viewedAt: now },
            ...base.viewed.filter((item) => item.productId !== view.productId),
          ].slice(0, guestRecommendationConfig.maxViewedProducts);
          return {
            seed: base.seed,
            viewed: nextViewed,
            lastActiveAt: now,
          };
        }),

      reset: () => set(freshState()),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : window.sessionStorage,
      ),
      partialize: (state) => ({
        seed: state.seed,
        viewed: state.viewed,
        lastActiveAt: state.lastActiveAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const now = Date.now();
        if (!state.seed || isExpired(state.lastActiveAt, now)) {
          state.seed = createSeed();
          state.viewed = [];
          state.lastActiveAt = now;
        }
      },
    },
  ),
);
