"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button, ProductCardSkeleton } from "@/shared/ui";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/hooks";
import { qk } from "@/lib/query-keys";
import {
  categoryService,
  productService,
  promotionService,
  recommendationService,
} from "@/lib/services";
import type {
  CategoryTreeNode,
  FlashSaleInfo,
  Product,
  RecommendationReason,
} from "@/types";
import ProductCard from "@/components/product/ProductCard";
import FlashSaleSection from "@/components/product/FlashSaleSection";
import { useAuthStore } from "@/stores/auth.store";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

function lowestPrice(p: Product): number | null {
  if (!p.variants || p.variants.length === 0) return null;
  return Math.min(...p.variants.map((v) => v.price));
}

export default function HomePage() {
  const { t } = useTranslation();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const featuredParams = {
    status: "PUBLISHED" as const,
    page: 0,
    size: 40,
  };
  const { data: featuredResult, isLoading: featuredLoading } = useQuery({
    queryKey: qk.productSearch(featuredParams),
    queryFn: () => productService.search(featuredParams),
  });
  const featured = useMemo(
    () => featuredResult?.page.content ?? [],
    [featuredResult],
  );

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.userId);
  const merchantRegisterHref = isAuthenticated
    ? "/merchant/register"
    : "/auth/login?redirect=/merchant/register";
  const { data: homeRecommendations = [], isLoading: recommendationLoading } =
    useQuery({
      queryKey: qk.recommendationsHome(18, userId),
      queryFn: () => recommendationService.getHomeFeed(18),
    });

  const recommendedProducts = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{
      id: string;
      name: string;
      price: number;
      originalPrice?: number;
      image: string;
      merchant?: string;
      rating?: number;
      reviewCount?: number;
      sold?: number;
      flashSale?: FlashSaleInfo | null;
      isBestSeller?: boolean;
      recommendationReason?: RecommendationReason;
      currency?: string;
    }> = [];

    const featuredMap = new Map(featured.map((p) => [p.productId, p]));

    for (const r of homeRecommendations) {
      if (seen.has(r.productId)) continue;
      seen.add(r.productId);
      const f = featuredMap.get(r.productId);
      out.push({
        id: r.productId,
        name: r.name,
        price: r.priceFrom,
        image: r.imageUrl || "/images/logo.png",
        merchant: f?.merchantId,
        rating: f?.rating ?? 4.8,
        reviewCount: f?.reviewCount ?? 15,
        sold: f?.soldCount ?? (r.score ? Math.round(Number(r.score) * 1000) : 120),
        flashSale: f?.flashSale,
        isBestSeller: f?.isBestSeller,
        recommendationReason: r.reason,
        currency: r.currency,
      });
    }

    for (const p of featured) {
      if (seen.has(p.productId)) continue;
      seen.add(p.productId);
      let lowestVariant: (typeof p.variants)[number] | undefined;
      for (const v of p.variants ?? []) {
        if (!lowestVariant || v.price < lowestVariant.price) {
          lowestVariant = v;
        }
      }
      out.push({
        id: p.productId,
        name: p.name,
        price: lowestVariant?.price ?? lowestPrice(p) ?? 0,
        originalPrice: lowestVariant?.originalPrice,
        image: p.imageList?.[0] ?? "/images/logo.png",
        merchant: p.merchantId,
        rating: p.rating ?? 4.8,
        reviewCount: p.reviewCount ?? 15,
        sold: p.soldCount,
        flashSale: p.flashSale,
        isBestSeller: p.isBestSeller,
        currency: lowestVariant?.currency,
      });
    }

    return out.slice(0, 30);
  }, [homeRecommendations, featured]);

  const recommendedLoading = featuredLoading || recommendationLoading;

  const { data: categoriesTree, isLoading: catLoading } = useQuery({
    queryKey: qk.categoriesTree,
    queryFn: () => categoryService.tree(),
  });

  const flatCategories = useMemo(() => {
    const list: CategoryTreeNode[] = [];
    function traverse(node: CategoryTreeNode) {
      list.push(node);
      if (node.children.length > 0) {
        node.children.forEach(traverse);
      }
    }
    (categoriesTree ?? []).forEach(traverse);
    return list;
  }, [categoriesTree]);

  const displayedCategories = useMemo(() => {
    return flatCategories.slice(0, 16);
  }, [flatCategories]);

  const { data: bannerData } = useQuery({
    queryKey: qk.promotionBanners,
    queryFn: () => promotionService.getBanners(),
  });
  const activeBanners = bannerData?.length
    ? bannerData
    : bannerData
      ? [
          {
            bannerId: "fallback-welcome",
            title: "Welcome to Aionn",
            imageUrl: "/images/banner-welcome.png",
            imagePublicId: "",
            linkUrl: null,
            displayOrder: 0,
          },
        ]
      : [];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentIndex, activeBanners.length]);

  const prevSlide = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? activeBanners.length - 1 : prev - 1,
    );
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const safeIndex =
    activeBanners.length > 0 ? currentIndex % activeBanners.length : 0;
  const currentBanner = activeBanners[safeIndex];

  return (
    <div className="bg-white min-h-screen">
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-[220px] sm:h-[320px] md:h-[400px] relative w-full overflow-hidden bg-gray-100 group shadow-sm rounded-b-sm">
            {activeBanners.length > 0 && (
              <>
                <div className="relative w-full h-full">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={safeIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="relative w-full h-full"
                    >
                      {currentBanner?.linkUrl ? (
                        <Link
                          href={currentBanner.linkUrl}
                          className="relative block w-full h-full"
                        >
                          <Image
                            src={currentBanner.imageUrl}
                            alt={currentBanner.title}
                            fill
                            priority
                            className="object-cover"
                          />
                        </Link>
                      ) : (
                        <Image
                          src={currentBanner?.imageUrl ?? "/images/logo.png"}
                          alt={currentBanner?.title ?? ""}
                          fill
                          priority
                          className="object-cover"
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {activeBanners.length > 1 && (
                  <>
                    <button
                      onClick={prevSlide}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-200 transition-colors z-10 cursor-pointer drop-shadow-lg"
                    >
                      <ChevronLeft size={40} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-200 transition-colors z-10 cursor-pointer drop-shadow-lg"
                    >
                      <ChevronRight size={40} strokeWidth={2.5} />
                    </button>
                  </>
                )}

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {activeBanners.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        safeIndex === index
                          ? "w-6 bg-white"
                          : "w-2 bg-white/50 hover:bg-white/80"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Categories Shelf (Apple Store Style - borderless, no arrows, responsive auto-wrap across screen sizes) */}
      <section className="pt-8 pb-4 sm:pt-10 sm:pb-6 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {catLoading && (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-y-6 gap-x-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={`cat-skel-${i}`} className="flex flex-col items-center gap-2.5 animate-pulse">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100" />
                  <div className="w-14 h-3 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          )}
          {!catLoading && displayedCategories.length > 0 && (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-y-7 gap-x-2 select-none"
            >
              {displayedCategories.map((node) => {
                const cat = node.category;
                return (
                  <motion.div key={cat.categoryId} variants={fadeUp} className="flex justify-center">
                    <Link
                      href={`/products?categoryId=${cat.categoryId}`}
                      className="group flex flex-col items-center text-center w-full max-w-[110px] transition-transform duration-200"
                    >
                      {/* Apple-style Product Icon Image */}
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center mb-2.5 transition-transform duration-300 ease-out group-hover:scale-105">
                        {cat.iconUrl ? (
                          <div className="relative w-full h-full">
                            <Image
                              src={cat.iconUrl}
                              alt={cat.name}
                              fill
                              sizes="(max-width: 640px) 56px, 80px"
                              className="object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-gray-100 transition-colors">
                            <Layers size={24} strokeWidth={1.75} />
                          </div>
                        )}
                      </div>

                      {/* Apple-style Label */}
                      <span className="text-xs sm:text-[13px] md:text-sm font-semibold text-gray-900 group-hover:text-black tracking-tight leading-snug line-clamp-2 transition-colors">
                        {cat.name}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* Flash Sale Section */}
      <FlashSaleSection />

      <section className="pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display pt-10 text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
              {t("home.featuredProducts")}
            </h2>
          </div>
          {recommendedLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4">
              {Array.from({ length: 25 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : recommendedProducts.length === 0 ? (
            <p className="text-sm text-gray-500">{t("home.noProducts")}</p>
          ) : (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4"
            >
              {recommendedProducts.map((product) => (
                <motion.div key={product.id} variants={fadeUp} className="h-full">
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    originalPrice={product.originalPrice}
                    image={product.image}
                    merchant={product.merchant}
                    rating={product.rating}
                    reviewCount={product.reviewCount}
                    sold={product.sold}
                    flashSale={product.flashSale}
                    isBestSeller={product.isBestSeller}
                    recommendationReason={product.recommendationReason}
                    currency={product.currency}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
          {!recommendedLoading && recommendedProducts.length > 0 && (
            <div className="mt-10 flex justify-center">
              <Link href="/products">
                <Button
                  size="lg"
                  className="group bg-gray-900 hover:bg-black text-white font-semibold shadow-md hover:shadow-lg transition-all rounded-xl px-8 py-3.5 border-none"
                >
                  {t("home.viewAllProducts")}
                  <ArrowRight
                    size={18}
                    className="ml-2 transition-transform duration-200 group-hover:translate-x-1.5"
                  />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>


      {/* For Merchants Section (Seamless soft gradient fade to pure white, no harsh dividing border line) */}
      <section className="py-24 bg-gradient-to-b from-white via-purple-50/40 to-indigo-50/50 relative overflow-hidden">
        {/* Ambient background soft light spheres */}
        <div className="absolute top-12 -right-24 w-96 h-96 bg-purple-300/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-fuchsia-200/25 rounded-full blur-3xl pointer-events-none" />

        {/* Delicate geometric background dots with top gradient fade-out so dots dissolve into white seamlessly */}
        <div
          className="absolute inset-0 opacity-[0.22] pointer-events-none [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #974de7 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mt-2 pb-1 text-3xl lg:text-5xl leading-[1.2] font-extrabold bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 bg-clip-text text-transparent tracking-tight">
              {t("home.startSelling")}
            </h2>

            <p className="mt-4 text-gray-600 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              {t("home.startSellingDesc")}
            </p>

            <div className="mt-10 flex justify-center">
              <div className="relative h-56 w-56 flex items-center justify-center">
                {/* Subtle backglow around logo */}
                <div className="absolute inset-4 bg-purple-400/20 rounded-full blur-2xl animate-pulse" />
                <Image
                  src="/images/logo_without_text.png"
                  alt="Aionn"
                  width={194}
                  height={181}
                  className="relative h-full w-full object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>

            <div className="mt-10">
              <Link href={merchantRegisterHref}>
                <Button
                  size="lg"
                  className="group bg-gray-900 hover:bg-black text-white font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl px-9 py-4 border-none hover:scale-[1.02] cursor-pointer"
                >
                  {t("home.registerFree")}
                  <ArrowRight
                    size={18}
                    className="ml-2 transition-transform duration-200 group-hover:translate-x-1.5"
                  />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
