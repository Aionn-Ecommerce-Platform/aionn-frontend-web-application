export interface CartItem {
  skuId: string;
  productId: string;
  slug?: string | null;
  productName: string;
  imageUrl: string;
  price: number;
  qty: number;
  currency: string;

  variantAttributes?: Record<string, string>;
  merchantId?: string;
  /** End of the flash-sale window that produced `price`, when one applied. */
  flashSaleEndAt?: string | null;
}

interface ServerCartItem {
  skuId: string;
  qty: number;
}

export interface ServerCart {
  cartId: string;
  userId: string;
  items: ServerCartItem[];
  voucherCode: string | null;
  createdAt: string;
  updatedAt: string;
}
