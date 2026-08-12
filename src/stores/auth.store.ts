import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthTokens, UserProfile } from "@/types";
import { tokenStore, setUnauthorizedHandler } from "@/shared/api";
import { authService, userService } from "@/lib/services";

interface AuthState {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;

  isInitializing: boolean;
  isLoading: boolean;

  setUser: (user: UserProfile | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  loginSuccess: (tokens: AuthTokens, user?: UserProfile) => void;
  logout: (silent?: boolean) => Promise<void>;
  setLoading: (loading: boolean) => void;
  bootstrap: () => Promise<void>;

  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isInitializing: true,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTokens: (tokens) => {
        tokenStore.setTokens(tokens);
        set({ tokens, isAuthenticated: !!tokens });
      },

      loginSuccess: (tokens, user) => {
        tokenStore.setTokens(tokens);
        set({
          tokens,
          user: user ?? get().user,
          isAuthenticated: true,
        });
      },

      logout: async (silent = false) => {
        if (!silent) {
          try {
            await authService.logout();
          } catch {}
        }
        tokenStore.setTokens(null);

        try {
          const { useCartStore } = await import("@/stores/cart.store");
          useCartStore.setState({
            items: [],
            voucherCode: null,
            hydratedFromServer: false,
          });
        } catch {}
        try {
          const { queryClient } = await import("@/lib/query-client");
          queryClient.clear();
        } catch {}
        set({ user: null, tokens: null, isAuthenticated: false });
      },

      setLoading: (isLoading) => set({ isLoading }),

      bootstrap: async () => {
        try {
          const tokens = await authService.refresh();
          tokenStore.setTokens(tokens);

          let user: UserProfile | null = get().user;
          try {
            user = await userService.getMyProfile();
          } catch {}
          set({
            tokens,
            user,
            isAuthenticated: true,
            isInitializing: false,
          });
        } catch {
          tokenStore.setTokens(null);
          set({
            tokens: null,
            user: null,
            isAuthenticated: false,
            isInitializing: false,
          });
        }
      },

      refreshProfile: async () => {
        try {
          const user = await userService.getMyProfile();
          set({ user });
        } catch {}
      },
    }),
    {
      name: "aionn-auth",

      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") return window.localStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
          clear: () => {},
          key: () => null,
          length: 0,
        } as Storage;
      }),

      partialize: (state) => ({ user: state.user }),

      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isInitializing = true;
          state.isAuthenticated = false;
          state.tokens = null;
        }
      },
    },
  ),
);

export function registerUnauthorizedHandler() {
  setUnauthorizedHandler(() => {
    const { logout } = useAuthStore.getState();
    void logout(true);
  });
}
