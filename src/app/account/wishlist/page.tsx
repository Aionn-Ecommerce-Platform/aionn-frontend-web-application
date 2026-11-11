"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Loader2, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
import AuthGuard from "@/components/auth/AuthGuard";
import ProductCard from "@/components/product/ProductCard";
import { Button, EmptyState } from "@/shared/ui";
import { wishlistService } from "@/lib/services";
import { useTranslation } from "@/hooks";
import { getErrorMessage } from "@/shared/lib/errors";

function WishlistInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => wishlistService.list(0, 50),
  });

  const remove = useMutation({
    mutationFn: (productId: string) => wishlistService.remove(productId),
    onSuccess: () => {
      toast.success(t("wishlist.removed"));
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      qc.invalidateQueries({ queryKey: ["wishlist-status"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const products = data?.content ?? [];

  return (
    <MemberPageLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            {t("wishlist.title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t("wishlist.subtitle")}</p>
        </div>
        <Link href="/products">
          <Button variant="outline" size="sm" className="rounded-xl">
            <ShoppingBag size={14} className="mr-1.5" />
            {t("common.allProducts")}
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-brand" size={28} />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={t("wishlist.empty")}
          description={t("wishlist.emptyDescription")}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => {
            const variants = product.variants ?? [];
            const lowest = [...variants].sort(
              (a, b) => a.price - b.price,
            )[0];
            const originalPrice = lowest?.originalPrice ?? undefined;
            return (
              <div key={product.productId} className="relative group">
                <ProductCard
                  id={product.productId}
                  slug={product.slug}
                  name={product.name}
                  price={lowest?.price ?? 0}
                  originalPrice={originalPrice}
                  image={product.imageList?.[0] ?? ""}
                  rating={product.rating}
                  reviewCount={product.reviewCount}
                  sold={product.soldCount}
                  isBestSeller={product.isBestSeller}
                  currency={lowest?.currency ?? "VND"}
                />
                <button
                  type="button"
                  onClick={() => remove.mutate(product.productId)}
                  disabled={remove.isPending}
                  className="absolute right-2 top-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 border border-rose-200 text-rose-600 shadow-sm hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                  aria-label={t("wishlist.removed")}
                >
                  {remove.isPending && remove.variables === product.productId ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Heart size={14} className="fill-rose-500 text-rose-500" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </MemberPageLayout>
  );
}

export default function WishlistPage() {
  return (
    <AuthGuard>
      <WishlistInner />
    </AuthGuard>
  );
}
