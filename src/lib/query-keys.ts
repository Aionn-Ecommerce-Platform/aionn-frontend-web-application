export const qk = {
  // identity / account
  me: ["me"] as const,
  sessions: ["me", "sessions"] as const,
  auditLogs: ["me", "audit-logs"] as const,
  preferences: ["me", "preferences"] as const,
  consents: ["me", "consents"] as const,
  addresses: ["addresses"] as const,
  agentIdentities: ["agent-identities"] as const,
  agentAudit: (agentId: string) =>
    ["agent-identities", "audit", agentId] as const,
  myKyc: ["kyc", "mine"] as const,
  socialAccounts: ["me", "social-accounts"] as const,

  // catalog
  product: (productId: string) => ["products", "detail", productId] as const,
  productRelated: (productId: string, limit: number) =>
    ["products", "related", productId, limit] as const,
  productSearch: (params: Record<string, unknown>) =>
    ["products", "search", params] as const,
  productSearchByMerchant: (params: Record<string, unknown>) =>
    ["products", "search-by-merchant", params] as const,
  productPopular: (limit: number) => ["products", "popular", limit] as const,
  productPersonalized: (params: Record<string, unknown>) =>
    ["products", "personalized", params] as const,
  productsByIds: (skuOrProductIds: string[]) =>
    ["products", "by-ids", [...skuOrProductIds].sort().join(",")] as const,
  merchantProductFacets: (merchantId: string) =>
    ["products", "facets", merchantId] as const,
  merchantProductsCount: (merchantId: string) =>
    ["products", "count", merchantId] as const,
  categoriesTree: ["categories", "tree"] as const,
  brands: (params: { page: number; size: number }) =>
    ["brands", "list", params] as const,
  attributeTemplate: (categoryId: string) =>
    ["attribute-templates", categoryId] as const,

  // reviews
  productReviews: (productId: string, page: number) =>
    ["reviews", "by-product", productId, page] as const,
  productRatingSummary: (productId: string) =>
    ["reviews", "rating-summary", productId] as const,
  reviewEligibility: (productId: string, authenticated: boolean) =>
    ["reviews", "eligibility", productId, authenticated] as const,
  merchantReviews: (params: Record<string, unknown>) =>
    ["reviews", "merchant", params] as const,
  adminProductReviews: (productId: string) =>
    ["reviews", "admin", "by-product", productId] as const,

  // merchants
  merchantMe: ["merchants", "me"] as const,
  merchant: (merchantId: string) =>
    ["merchants", "detail", merchantId] as const,
  merchants: (params: Record<string, unknown> = {}) =>
    ["merchants", "list", params] as const,
  merchantProductSearch: (params: Record<string, unknown>) =>
    ["merchants", "product-search", params] as const,
  merchantFacets: (merchantId: string) =>
    ["merchants", "facets", merchantId] as const,

  // cart / ordering
  cart: ["cart"] as const,
  orders: (params: Record<string, unknown> = {}) =>
    ["orders", "list", params] as const,
  order: (orderId: string) => ["orders", "detail", orderId] as const,
  merchantOrders: (params: Record<string, unknown> = {}) =>
    ["orders", "merchant", params] as const,
  adminOrder: (orderId: string) => ["orders", "admin", orderId] as const,
  myReturns: ["returns", "mine"] as const,
  merchantReturns: (params: Record<string, unknown> = {}) =>
    ["returns", "merchant", params] as const,
  adminReturns: (params: Record<string, unknown> = {}) =>
    ["returns", "admin", params] as const,

  // payment
  paymentMethods: ["payment-methods"] as const,
  paymentMethod: (methodId: string) =>
    ["payment-methods", "detail", methodId] as const,
  paymentPreference: ["payment-methods", "preference"] as const,
  payments: (orderId: string) => ["payments", "by-order", orderId] as const,
  payment: (paymentId: string) => ["payments", "detail", paymentId] as const,
  merchantBalance: (currency: string) =>
    ["payouts", "balance", currency] as const,
  merchantPayouts: (params: Record<string, unknown> = {}) =>
    ["payouts", "merchant", params] as const,
  adminPayouts: (params: Record<string, unknown> = {}) =>
    ["payouts", "admin", params] as const,

  // shipping
  shipments: (orderId: string) => ["shipments", "by-order", orderId] as const,
  shipment: (shipmentId: string) =>
    ["shipments", "detail", shipmentId] as const,
  shippingQuote: (params: Record<string, unknown>) =>
    ["shipments", "quote", params] as const,
  shippingRates: (params: Record<string, unknown> = {}) =>
    ["shipments", "rates", params] as const,

  // inventory
  warehouses: (params: Record<string, unknown> = {}) =>
    ["inventory", "warehouses", params] as const,
  warehouse: (warehouseId: string) =>
    ["inventory", "warehouses", "detail", warehouseId] as const,
  inventoryByWarehouse: (warehouseId: string, page: number) =>
    ["inventory", "by-warehouse", warehouseId, page] as const,
  inventoryBySku: (skuId: string) => ["inventory", "by-sku", skuId] as const,
  lowStock: (params: Record<string, unknown> = {}) =>
    ["inventory", "low-stock", params] as const,
  stockReservation: (reservationId: string) =>
    ["inventory", "reservations", reservationId] as const,

  // promotion
  campaigns: (status?: string) =>
    ["promotions", "campaigns", status ?? "RUNNING"] as const,
  promotionBanners: ["promotions", "banners"] as const,
  activeFlashSales: (limit: number) =>
    ["promotions", "flash-sales", "active", limit] as const,
  merchantFlashSales: (params: Record<string, unknown> = {}) =>
    ["promotions", "flash-sales", "merchant", params] as const,
  adminFlashSales: (params: Record<string, unknown> = {}) =>
    ["promotions", "flash-sales", "admin", params] as const,
  myVouchers: (limit = 50) => ["vouchers", "mine", limit] as const,
  shopVouchers: (merchantId: string) =>
    ["vouchers", "shop", merchantId] as const,
  campaignVouchers: (campaignIds: string[]) =>
    ["vouchers", "by-campaigns", [...campaignIds].sort().join(",")] as const,

  // chat
  conversations: (params: Record<string, unknown> = {}) =>
    ["chat", "conversations", params] as const,
  conversation: (conversationId: string) =>
    ["chat", "conversations", "detail", conversationId] as const,
  messages: (conversationId: string) =>
    ["chat", "messages", conversationId] as const,
  unreadCounts: ["chat", "unread-counts"] as const,
  chatBlocks: ["chat", "blocks"] as const,
  chatAutoReply: (merchantId: string) =>
    ["chat", "auto-reply", merchantId] as const,

  // notification
  notifications: (limit = 50) => ["notifications", "list", limit] as const,
  notificationTemplates: (limit: number) =>
    ["notifications", "templates", limit] as const,
  notificationProviders: ["notifications", "providers"] as const,

  // geography
  provinces: (countryCode = "VN") =>
    ["geography", "provinces", countryCode] as const,
  districts: (provinceCode: string) =>
    ["geography", "districts", provinceCode] as const,
  wards: (districtCode: string) =>
    ["geography", "wards", districtCode] as const,

  // admin
  adminUsers: (params: Record<string, unknown> = {}) =>
    ["admin", "users", params] as const,
  adminUser: (userId: string) => ["admin", "users", "detail", userId] as const,
  adminMerchants: (params: Record<string, unknown> = {}) =>
    ["admin", "merchants", params] as const,
  adminKyc: (params: Record<string, unknown> = {}) =>
    ["admin", "kyc", params] as const,
  adminFeedbacks: (params: Record<string, unknown> = {}) =>
    ["admin", "feedbacks", params] as const,
  adminBanners: ["admin", "banners"] as const,
  adminDashboard: (section: string) => ["admin", "dashboard", section] as const,

  // analytics
  platformOrderAnalytics: (params: Record<string, unknown> = {}) =>
    ["analytics", "platform", "orders", params] as const,
  returnAnalytics: (params: Record<string, unknown> = {}) =>
    ["analytics", "returns", params] as const,
  paymentAnalytics: (params: Record<string, unknown> = {}) =>
    ["analytics", "payments", params] as const,
  userAnalytics: (params: Record<string, unknown> = {}) =>
    ["analytics", "users", params] as const,
  kycAnalytics: (params: Record<string, unknown> = {}) =>
    ["analytics", "kyc", params] as const,
  feedbackAnalytics: (params: Record<string, unknown> = {}) =>
    ["analytics", "feedbacks", params] as const,
  productAnalytics: ["analytics", "products"] as const,
  merchantOrderAnalytics: (params: Record<string, unknown> = {}) =>
    ["analytics", "merchant", "orders", params] as const,
  merchantTopProducts: (params: Record<string, unknown> = {}) =>
    ["analytics", "merchant", "top-products", params] as const,
  merchantVoucherAnalytics: ["analytics", "merchant", "vouchers"] as const,
  merchantLowStock: ["analytics", "merchant", "low-stock"] as const,
};
