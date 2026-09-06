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
  Zap,
} from "lucide-react";
import { Button, ProductCardSkeleton } from "@/shared/ui";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/hooks";
import { qk } from "@/lib/query-keys";
import {
  categoryService,
  productService,
  promotionService,
} from "@/lib/services";
import type { CategoryTreeNode, Product } from "@/types";
import ProductCard from "@/components/product/ProductCard";
import FlashSaleSection from "@/components/product/FlashSaleSection";
import { logger } from "@/shared/lib/logger";
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
  const merchantRegisterHref = isAuthenticated
    ? "/merchant/register"
    : "/auth/login?redirect=/merchant/register";
  const [personalizedProducts, setPersonalizedProducts] = useState<Product[]>(
    [],
  );
  const [personalizedLoading, setPersonalizedLoading] = useState(true);

  useEffect(() => {
    async function loadPersonalized() {
      setPersonalizedLoading(true);
      try {
        let cats: string[] = [];
        let brands: string[] = [];

        if (!isAuthenticated) {
          const storedCats = localStorage.getItem("viewed_categories");
          const storedBrands = localStorage.getItem("viewed_brands");

          cats = storedCats ? JSON.parse(storedCats) : [];
          brands = storedBrands ? JSON.parse(storedBrands) : [];

          if (!Array.isArray(cats)) cats = [];
          if (!Array.isArray(brands)) brands = [];
        }

        const products = await productService.getPersonalized(cats, brands, 6);
        setPersonalizedProducts(products);
      } catch (e) {
        logger.error("Failed to load personalized recommendations", e);
      } finally {
        setPersonalizedLoading(false);
      }
    }

    loadPersonalized();
  }, [isAuthenticated]);

  const recommendedProducts = useMemo(() => {
    const seen = new Set<string>();
    const out: Product[] = [];
    for (const p of personalizedProducts) {
      if (seen.has(p.productId)) continue;
      seen.add(p.productId);
      out.push(p);
    }
    for (const p of featured) {
      if (seen.has(p.productId)) continue;
      seen.add(p.productId);
      out.push(p);
    }
    return out.slice(0, 30);
  }, [personalizedProducts, featured]);

  const recommendedLoading = featuredLoading || personalizedLoading;

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

  const displayedCategories = flatCategories.slice(0, 12);

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
    <div>
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-[220px] sm:h-[320px] md:h-[400px] relative w-full overflow-hidden bg-gray-100 group shadow-sm rounded-b-2xl">
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

      <FlashSaleSection />

      <section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="pt-10 text-2xl font-bold text-gray-900">
              {t("home.featuredCategories")}
            </h2>
          </div>
          {catLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-200/60 animate-pulse -ml-px first:ml-0"
                />
              ))}
            </div>
          ) : displayedCategories.length === 0 ? (
            <p className="text-sm text-gray-500">{t("home.noCategories")}</p>
          ) : (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              className="grid grid-cols-3 sm:grid-cols-6"
            >
              {displayedCategories.map((node) => {
                const cat = node.category;
                return (
                  <motion.div
                    key={cat.categoryId}
                    variants={fadeUp}
                    className="-ml-px -mt-px"
                  >
                    <Link
                      href={`/products?categoryId=${cat.categoryId}`}
                      className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-400 hover:border-blue-500 hover:bg-blue-50 hover:shadow-lg hover:shadow-blue-500/15 hover:relative hover:z-10 transition-all group h-[140px]"
                    >
                      {cat.iconUrl ? (
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <Image
                            src={cat.iconUrl}
                            alt={cat.name}
                            fill
                            sizes="64px"
                            className="object-contain group-hover:scale-110 transition-transform"
                          />
                        </div>
                      ) : (
                        <Layers
                          size={40}
                          className="text-blue-500 group-hover:scale-110 transition-transform flex-shrink-0"
                        />
                      )}
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors text-center truncate w-full px-1">
                        {cat.name}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
          {!catLoading && flatCategories && flatCategories.length > 12 && (
            <div className="mt-10 flex justify-center">
              <Link href="/categories">
                <Button
                  size="lg"
                  className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/25"
                >
                  {t("home.viewAllCategories")}
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

      <section className="pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="pt-10 text-2xl font-bold text-gray-900">
              {t("home.featuredProducts")}
            </h2>
          </div>
          {recommendedLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 lg:gap-4">
              {Array.from({ length: 30 }).map((_, i) => (
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
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 lg:gap-4"
            >
              {recommendedProducts.map((product) => {
                let lowestVariant:
                  | (typeof product.variants)[number]
                  | undefined;
                for (const v of product.variants ?? []) {
                  if (!lowestVariant || v.price < lowestVariant.price) {
                    lowestVariant = v;
                  }
                }
                const price = lowestVariant?.price ?? lowestPrice(product) ?? 0;
                const originalPrice = lowestVariant?.originalPrice;
                const image = product.imageList?.[0] ?? "/images/logo.png";
                return (
                  <motion.div key={product.productId} variants={fadeUp}>
                    <ProductCard
                      id={product.productId}
                      name={product.name}
                      price={price}
                      originalPrice={originalPrice}
                      image={image}
                      merchant={product.merchantId}
                      rating={product.rating}
                      reviewCount={product.reviewCount}
                      sold={product.soldCount}
                      flashSale={product.flashSale}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
          {!recommendedLoading && recommendedProducts.length > 0 && (
            <div className="mt-10 flex justify-center">
              <Link href="/products">
                <Button
                  size="lg"
                  className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/25"
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

      <section className="py-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-80 h-80 bg-indigo-300/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-cyan-200/30 rounded-full blur-2xl" />
        <div
          className="absolute inset-0 opacity-[0.36]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #2563eb 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 bg-white/70 backdrop-blur-sm border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm">
              <Zap size={14} className="fill-blue-500 text-blue-500" />
              {t("home.forMerchants")}
            </span>
            <h2 className="mt-5 pb-1 text-3xl lg:text-5xl leading-[1.2] font-extrabold bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t("home.startSelling")}
            </h2>
            <p className="mt-4 text-gray-700 max-w-2xl mx-auto text-lg">
              {t("home.startSellingDesc")}
            </p>
            <div className="mt-8 flex justify-center">
              <div className="h-56 w-56">
                <Image
                  src="/images/logo_without_text.png"
                  alt="Aionn"
                  width={194}
                  height={181}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <div className="mt-8">
              <Link href={merchantRegisterHref}>
                <Button
                  size="lg"
                  className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/25"
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
