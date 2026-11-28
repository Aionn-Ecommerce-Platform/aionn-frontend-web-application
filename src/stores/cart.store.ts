import { create } from "zustand";
import toast from "react-hot-toast";
import type { CartItem, Product, ServerCart } from "@/types";
import { cartService } from "@/lib/services/cart.service";
import { productService } from "@/lib/services/product.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { getProductCoverImage } from "@/shared/lib/media";
import { t } from "@/i18n/translate";
import { useLocaleStore } from "@/stores/locale.store";

if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem("aionn-cart");
  } catch {}
}

interface CartState {
  items: CartItem[];
  platformVoucherCode: string | null;
  shopVoucherCode: string | null;
  shopVoucherCodes: Record<string, string>;
  shippingVoucherCode: string | null;
  hydratedFromServer: boolean;
  hydrationAttempts: number;
  syncing: boolean;
  totalItems: () => number;
  totalAmount: () => number;
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (skuId: string) => Promise<void>;
  updateQuantity: (skuId: string, qty: number) => Promise<void>;
  setVoucher: (slot: VoucherSlot, code: string) => void;
  setShopVoucher: (merchantId: string, code: string) => void;
  clearShopVoucher: (merchantId: string) => void;
  clearVoucher: (slot: VoucherSlot) => void;
  clearCart: () => Promise<void>;
  hydrateFromServer: () => Promise<void>;
}

export type VoucherSlot = "platform" | "shop" | "shipping";

function pruneShopVoucherCodes(
  codes: Record<string, string>,
  items: CartItem[],
) {
  const merchantIds = new Set(
    items
      .map((item) => item.merchantId)
      .filter((id): id is string => Boolean(id)),
  );
  const next: Record<string, string> = {};
  for (const [merchantId, code] of Object.entries(codes)) {
    if (merchantIds.has(merchantId)) {
      next[merchantId] = code;
    }
  }
  return next;
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
    const flashSaleEndsAt = product?.flashSale?.endAt;
    const flashSaleActive = Boolean(
      flashSaleOffer &&
        flashSaleEndsAt &&
        new Date(flashSaleEndsAt).getTime() > Date.now(),
    );
    const effectivePrice =
      (flashSaleActive ? flashSaleOffer?.salePrice : undefined) ??
      variant?.price ??
      cached?.price ??
      0;
    const effectiveCurrency =
      (flashSaleActive ? flashSaleOffer?.currency : undefined) ??
      variant?.currency ??
      cached?.currency ??
      "VND";

    return {
      skuId: srv.skuId,
      productId: product?.productId ?? cached?.productId ?? srv.skuId,
      slug: product?.slug ?? cached?.slug,
      productName: product?.name ?? cached?.productName ?? srv.skuId,
      imageUrl: product
        ? getProductCoverImage(product.imageList)
        : (cached?.imageUrl ?? "/images/logo.png"),
      price: effectivePrice,
      qty: srv.qty,
      currency: effectiveCurrency,
      variantAttributes: formatVariantAttributes(product, variantAttributes),
      merchantId: product?.merchantId ?? cached?.merchantId,
      flashSaleEndAt: flashSaleActive ? flashSaleEndsAt : null,
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
    const products =
      await productService.resolveBySkuIdsWithActiveFlashSale(skuIds);
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

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  platformVoucherCode: null,
  shopVoucherCode: null,
  shopVoucherCodes: {},
  shippingVoucherCode: null,
  hydratedFromServer: false,
  hydrationAttempts: 0,
  syncing: false,

  totalItems: () => get().items.reduce((sum, item) => sum + item.qty, 0),
  totalAmount: () =>
    get().items.reduce((sum, item) => sum + item.price * item.qty, 0),

  addItem: async (newItem) => {
    const previous = get().items;
    const existing = previous.find((i) => i.skuId === newItem.skuId);
    const next = existing
      ? previous.map((i) =>
          i.skuId === newItem.skuId ? { ...i, qty: i.qty + newItem.qty } : i,
        )
      : [...previous, newItem];
    set({ items: next });

    try {
      const server = await cartService.addItem(newItem.skuId, newItem.qty);
      set({
        items: await hydrateCartItems(next, server),
        hydratedFromServer: true,
      });
    } catch (err) {
      set((state) => {
        const cur = state.items;
        const idx = cur.findIndex((i) => i.skuId === newItem.skuId);
        if (idx === -1) return { items: cur };
        const updatedQty = (cur[idx]?.qty ?? newItem.qty) - newItem.qty;
        const items =
          existing && updatedQty > 0
            ? cur.map((i, j) => (j === idx ? { ...i, qty: updatedQty } : i))
            : cur.filter((_, j) => j !== idx);
        return { items };
      });
      toast.error(getErrorMessage(err, t("cart.addToCartError")));
      throw err;
    }
  },

  removeItem: async (skuId) => {
    const previous = get().items;
    set({ items: previous.filter((i) => i.skuId !== skuId) });

    try {
      const server = await cartService.removeItem(skuId);
      const nextItems = await hydrateCartItems(get().items, server);
      set((state) => ({
        items: nextItems,
        hydratedFromServer: true,
        shopVoucherCodes: pruneShopVoucherCodes(
          state.shopVoucherCodes,
          nextItems,
        ),
      }));
    } catch (err) {
      set({ items: previous });
      toast.error(getErrorMessage(err));
      throw err;
    }
  },

  updateQuantity: async (skuId, qty) => {
    const safeQty = Math.max(0, qty);
    const previous = get().items;
    const next =
      safeQty === 0
        ? previous.filter((i) => i.skuId !== skuId)
        : previous.map((i) => (i.skuId === skuId ? { ...i, qty: safeQty } : i));
    set({ items: next });

    try {
      const server = await cartService.updateItem(skuId, safeQty);
      const nextItems = await hydrateCartItems(next, server);
      set((state) => ({
        items: nextItems,
        hydratedFromServer: true,
        shopVoucherCodes: pruneShopVoucherCodes(
          state.shopVoucherCodes,
          nextItems,
        ),
      }));
    } catch (err) {
      set({ items: previous });
      toast.error(getErrorMessage(err));
      throw err;
    }
  },

  setVoucher: (slot, code) => {
    const value = code.trim() || null;
    if (slot === "platform") set({ platformVoucherCode: value });
    else if (slot === "shop") set({ shopVoucherCode: value });
    else set({ shippingVoucherCode: value });
  },

  setShopVoucher: (merchantId, code) => {
    set((state) => ({
      shopVoucherCodes: {
        ...state.shopVoucherCodes,
        [merchantId]: code.trim(),
      },
    }));
  },

  clearShopVoucher: (merchantId) => {
    set((state) => {
      const next = { ...state.shopVoucherCodes };
      delete next[merchantId];
      return { shopVoucherCodes: next };
    });
  },

  clearVoucher: (slot) => {
    if (slot === "platform") set({ platformVoucherCode: null });
    else if (slot === "shop") set({ shopVoucherCode: null });
    else set({ shippingVoucherCode: null });
  },

  clearCart: async () => {
    const previous = {
      items: get().items,
      platformVoucherCode: get().platformVoucherCode,
      shopVoucherCode: get().shopVoucherCode,
      shippingVoucherCode: get().shippingVoucherCode,
    };
    set({
      items: [],
      platformVoucherCode: null,
      shopVoucherCode: null,
      shopVoucherCodes: {},
      shippingVoucherCode: null,
    });
    try {
      await cartService.clear();
    } catch (err) {
      set(previous);
      toast.error(getErrorMessage(err));
      throw err;
    }
  },

  hydrateFromServer: async () => {
    set((state) => ({
      syncing: true,
      hydrationAttempts: state.hydrationAttempts + 1,
    }));
    try {
      const server = await cartService.getMyCart();
      const nextItems = await hydrateCartItems(get().items, server);
      set((state) => ({
        items: nextItems,
        hydratedFromServer: true,
        hydrationAttempts: 0,
        shopVoucherCodes: pruneShopVoucherCodes(
          state.shopVoucherCodes,
          nextItems,
        ),
      }));
    } catch {
    } finally {
      set({ syncing: false });
    }
  },
}));
