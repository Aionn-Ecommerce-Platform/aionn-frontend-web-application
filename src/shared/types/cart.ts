export interface CartItem {
  skuId: string;
  productId: string;
  productName: string;
  imageUrl: string;
  price: number;
  qty: number;
  currency: string;

  variantAttributes?: Record<string, string>;
  merchantId?: string;
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
