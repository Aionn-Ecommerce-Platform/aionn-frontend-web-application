import { create } from "zustand";
import { persist } from "zustand/middleware";
import toast from "react-hot-toast";
import type { CartItem, Product, ServerCart } from "@/types";
import { cartService } from "@/lib/services/cart.service";
import { productService } from "@/lib/services/product.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { t } from "@/i18n/translate";
import { useLocaleStore } from "@/stores/locale.store";

interface CartState {
  items: CartItem[];
  voucherCode: string | null;
  hydratedFromServer: boolean;
  syncing: boolean;
  totalItems: () => number;
  totalAmount: () => number;
  addItem: (
    item: CartItem,
    opts?: { authenticated?: boolean },
  ) => Promise<void>;
  removeItem: (
    skuId: string,
    opts?: { authenticated?: boolean },
  ) => Promise<void>;
  updateQuantity: (
    skuId: string,
    qty: number,
    opts?: { authenticated?: boolean },
  ) => Promise<void>;
  applyVoucher: (
    code: string,
    opts?: { authenticated?: boolean },
  ) => Promise<void>;
  removeVoucher: (opts?: { authenticated?: boolean }) => Promise<void>;
  clearCart: (opts?: { authenticated?: boolean }) => Promise<void>;
  hydrateFromServer: () => Promise<void>;
  pushPendingToServer: () => Promise<void>;
}

function formatVariantAttributes(
  product: Product | undefined,
  attributes: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!attributes) return undefined;

  const option = attributes.option?.trim().toLowerCase();
  if (option !== "option 1" && option !== "option 2") return attributes;

  const locale = useLocaleStore.getState().locale;
  const isFirstOption = option === "option 1";
  const categoryIds = product?.categoryIds ?? [];
  const isElectronics = [
    "CAT_ELE",
    "CAT_ACC",
    "CAT_SMH",
    "CAT_SML",
    "CAT_SMS",
  ].some((categoryId) => categoryIds.includes(categoryId));

  if (isElectronics) {
    return {
      [locale === "vi" ? "Phiên bản & Màu sắc" : "Version & Color"]:
        isFirstOption
          ? locale === "vi"
            ? "Bản Tiêu Chuẩn (Trắng)"
            : "Standard Edition (White)"
          : locale === "vi"
            ? "Bản Cao Cấp (Đen)"
            : "Premium Edition (Black)",
    };
  }

  return {
    [locale === "vi" ? "Phân loại" : "Classification"]: isFirstOption
      ? locale === "vi"
        ? "Bản Tiêu Chuẩn"
        : "Standard Edition"
      : locale === "vi"
        ? "Bản Cao Cấp"
        : "Premium Edition",
  };
}

function mergeServerCart(
  local: CartItem[],
  server: ServerCart,
  productsBySku = new Map<string, Product>(),
): CartItem[] {
  return server.items.map((srv) => {
    const cached = local.find((l) => l.skuId === srv.skuId);
    const product = productsBySku.get(srv.skuId);
    const variant = product?.variants.find((item) => item.skuId === srv.skuId);
    const flashSaleOffer = product?.flashSale?.skuOffers.find(
      (offer) => offer.skuId === srv.skuId,
    );

    const variantAttributes =
      cached?.variantAttributes ?? variant?.attributeValues;
    const effectivePrice =
      flashSaleOffer?.salePrice ?? variant?.price ?? cached?.price ?? 0;
    const effectiveCurrency =
      flashSaleOffer?.currency ??
      variant?.currency ??
      cached?.currency ??
      "VND";

    return {
      skuId: srv.skuId,
      productId: product?.productId ?? cached?.productId ?? srv.skuId,
      productName: product?.name ?? cached?.productName ?? srv.skuId,
      imageUrl: product?.imageList[0] ?? cached?.imageUrl ?? "/images/logo.png",
      price: effectivePrice,
      qty: srv.qty,
      currency: effectiveCurrency,
      variantAttributes: formatVariantAttributes(product, variantAttributes),
      merchantId: product?.merchantId ?? cached?.merchantId,
    };
  });
}

async function hydrateCartItems(
  local: CartItem[],
  server: ServerCart,
): Promise<CartItem[]> {
  const skuIds = server.items.map((item) => item.skuId);
  if (skuIds.length === 0) return [];

  try {
    const products = await productService.resolveBySkuIds(skuIds);
    const productsBySku = new Map<string, Product>();
    for (const product of products) {
      for (const variant of product.variants) {
        productsBySku.set(variant.skuId, product);
      }
    }
    return mergeServerCart(local, server, productsBySku);
  } catch {
    return mergeServerCart(local, server);
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      voucherCode: null,
      hydratedFromServer: false,
      syncing: false,

      totalItems: () => get().items.reduce((sum, item) => sum + item.qty, 0),
      totalAmount: () =>
        get().items.reduce((sum, item) => sum + item.price * item.qty, 0),

      addItem: async (newItem, opts) => {
        const previous = get().items;
        const existing = previous.find((i) => i.skuId === newItem.skuId);
        const next = existing
          ? previous.map((i) =>
              i.skuId === newItem.skuId
                ? { ...i, qty: i.qty + newItem.qty }
                : i,
            )
          : [...previous, newItem];
        set({ items: next });

        if (!opts?.authenticated) return;
        try {
          const server = await cartService.addItem(newItem.skuId, newItem.qty);
          set({ items: await hydrateCartItems(next, server) });
        } catch (err) {
          set({ items: previous });
          toast.error(getErrorMessage(err, t("cart.addToCartError")));
          throw err;
        }
      },

      removeItem: async (skuId, opts) => {
        const previous = get().items;
        set({ items: previous.filter((i) => i.skuId !== skuId) });

        if (!opts?.authenticated) return;
        try {
          const server = await cartService.removeItem(skuId);
          set({ items: await hydrateCartItems(get().items, server) });
        } catch (err) {
          set({ items: previous });
          toast.error(getErrorMessage(err));
          throw err;
        }
      },

      updateQuantity: async (skuId, qty, opts) => {
        const safeQty = Math.max(0, qty);
        const previous = get().items;
        const next =
          safeQty === 0
            ? previous.filter((i) => i.skuId !== skuId)
            : previous.map((i) =>
                i.skuId === skuId ? { ...i, qty: safeQty } : i,
              );
        set({ items: next });

        if (!opts?.authenticated) return;
        try {
          const server = await cartService.updateItem(skuId, safeQty);
          set({ items: await hydrateCartItems(next, server) });
        } catch (err) {
          set({ items: previous });
          toast.error(getErrorMessage(err));
          throw err;
        }
      },

      applyVoucher: async (code, opts) => {
        const previous = get().voucherCode;
        set({ voucherCode: code });
        if (!opts?.authenticated) return;
        try {
          const server = await cartService.applyVoucher(code);
          set({ voucherCode: server.voucherCode });
        } catch (err) {
          set({ voucherCode: previous });
          toast.error(getErrorMessage(err, t("cart.applyVoucherError")));
          throw err;
        }
      },

      removeVoucher: async (opts) => {
        const previous = get().voucherCode;
        set({ voucherCode: null });
        if (!opts?.authenticated) return;
        try {
          await cartService.removeVoucher();
        } catch (err) {
          set({ voucherCode: previous });
          toast.error(getErrorMessage(err));
          throw err;
        }
      },

      clearCart: async (opts) => {
        const previous = { items: get().items, voucherCode: get().voucherCode };
        set({ items: [], voucherCode: null });
        if (!opts?.authenticated) return;
        try {
          await cartService.clear();
        } catch (err) {
          set(previous);
          toast.error(getErrorMessage(err));
          throw err;
        }
      },

      hydrateFromServer: async () => {
        set({ syncing: true });
        try {
          const server = await cartService.getMyCart();
          set({
            items: await hydrateCartItems(get().items, server),
            voucherCode: server.voucherCode,
            hydratedFromServer: true,
          });
        } catch {
        } finally {
          set({ syncing: false });
        }
      },

      pushPendingToServer: async () => {
        const pending = get().items;
        if (pending.length === 0) return;
        try {
          for (const item of pending) {
            await cartService.addItem(item.skuId, item.qty);
          }

          const server = await cartService.getMyCart();
          set({
            items: await hydrateCartItems(pending, server),
            voucherCode: server.voucherCode,
            hydratedFromServer: true,
          });
        } catch {}
      },
    }),
    {
      name: "aionn-cart",

      partialize: (state) => ({
        items: state.items,
        voucherCode: state.voucherCode,
      }),

      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydratedFromServer = false;
          state.syncing = false;
        }
      },
    },
  ),
);
