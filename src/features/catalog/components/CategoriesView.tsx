"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Layers,
  PackageSearch,
  Search,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button, EmptyState } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { categoryService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import type { CategoryTreeNode } from "@/types";

export default function CategoriesView() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");

  const {
    data: tree,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: qk.categoriesTree,
    queryFn: () => categoryService.tree(),
  });

  const rawTree = useMemo(() => tree ?? [], [tree]);

  // Total departments and subcategories counts
  const stats = useMemo(() => {
    let subCount = 0;
    for (const root of rawTree) {
      subCount += root.children.length;
    }
    return {
      departments: rawTree.length,
      subcategories: subCount,
    };
  }, [rawTree]);

  // Filtered tree based on department tab and search query
  const filteredTree = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return rawTree
      .filter((root) => {
        if (selectedDeptId !== "all" && root.category.categoryId !== selectedDeptId) {
          return false;
        }
        return true;
      })
      .map((root) => {
        if (!query) return root;

        const rootMatches = root.category.name.toLowerCase().includes(query);
        const matchingChildren = root.children.filter((child) =>
          child.category.name.toLowerCase().includes(query),
        );

        if (rootMatches) {
          // If root department name matches, show all its children or only matching ones if some match
          return root;
        }

        if (matchingChildren.length > 0) {
          return {
            ...root,
            children: matchingChildren,
          };
        }

        return null;
      })
      .filter((root): root is CategoryTreeNode => root !== null);
  }, [rawTree, selectedDeptId, searchQuery]);

  const totalFilteredSubcategories = useMemo(() => {
    return filteredTree.reduce((acc, r) => acc + r.children.length, 0);
  }, [filteredTree]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            {t("categories.title")}
          </h1>
        </div>

        {/* Quick Search Row - Separate row below Header */}
        <div className="relative w-full max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("categories.searchPlaceholder")}
            className="w-full h-10 pl-9 pr-9 text-xs sm:text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-gray-900 shadow-xs transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Department Quick Filter Tabs (Voucher style) */}
        {!loading && !error && rawTree.length > 0 && !searchQuery && (
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar pt-1">
            <button
              type="button"
              onClick={() => setSelectedDeptId("all")}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-150 cursor-pointer ${
                selectedDeptId === "all"
                  ? "bg-gray-950 text-white border-2 border-gray-950 shadow-xs"
                  : "bg-white text-gray-800 border-2 border-gray-950 hover:bg-gray-100 hover:text-black"
              }`}
            >
              {t("categories.allDepartments")} ({stats.departments})
            </button>

            {rawTree.map((root) => {
              const active = selectedDeptId === root.category.categoryId;
              const count = root.children.length;
              return (
                <button
                  key={root.category.categoryId}
                  type="button"
                  onClick={() => setSelectedDeptId(root.category.categoryId)}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    active
                      ? "bg-gray-950 text-white border-2 border-gray-950 shadow-xs"
                      : "bg-white text-gray-800 border-2 border-gray-950 hover:bg-gray-100 hover:text-black"
                  }`}
                >
                  {root.category.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Search Results Summary Banner */}
        {searchQuery && (
          <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-300 p-4 shadow-2xs">
            <span className="text-xs sm:text-sm text-gray-700">
              {t("categories.searchResults")
                .replace("{query}", searchQuery)
                .replace(
                  "{count}",
                  String(totalFilteredSubcategories + filteredTree.length),
                )}
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs font-bold text-brand hover:underline cursor-pointer"
            >
              {t("categories.clearSearch")}
            </button>
          </div>
        )}

        {/* Main Content Area */}
        {loading ? (
          /* Modern Department Skeletons */
          <div className="space-y-10 sm:space-y-12">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={`dept-skel-${idx}`}
                className="animate-pulse"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 items-stretch">
                  {/* Parent Category Skeleton */}
                  <div className="col-span-2 sm:col-span-2 lg:col-span-2 rounded-2xl bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 border border-purple-800/40 p-5 flex items-center justify-between min-h-[160px] sm:min-h-[175px]">
                    <div className="space-y-3">
                      <div className="h-3 w-16 bg-purple-900/60 rounded-md" />
                      <div className="h-6 w-32 bg-purple-900/60 rounded-md" />
                      <div className="h-8 w-28 bg-purple-900/60 rounded-xl" />
                    </div>
                    <div className="w-24 h-24 bg-purple-900/60 rounded-2xl" />
                  </div>
                  {/* Child Categories Skeletons */}
                  {Array.from({ length: 3 }).map((__, cIdx) => (
                    <div
                      key={`card-skel-${cIdx}`}
                      className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col items-center justify-center gap-3 min-h-[160px] sm:min-h-[175px]"
                    >
                      <div className="w-18 h-18 rounded-2xl bg-gray-100" />
                      <div className="h-3.5 w-24 bg-gray-100 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={Layers}
            title={t("categories.failedToLoad")}
            description={t("products.failedToLoadDesc")}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-4 rounded-xl cursor-pointer"
              >
                {t("common.retry") || "Thử lại"}
              </Button>
            }
          />
        ) : filteredTree.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={
              searchQuery
                ? t("categories.noSearchResults")
                : t("categories.noCategories")
            }
            description={
              searchQuery
                ? t("categories.noSearchResultsDesc")
                : t("categories.noCategoriesDesc")
            }
            action={
              searchQuery ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="mt-4 rounded-xl cursor-pointer"
                >
                  {t("categories.clearSearch")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          /* Department Sections */
          <div className="space-y-10 sm:space-y-12">
            {filteredTree.map((root) => {
              const rootCat = root.category;
              const children = root.children;

              return (
                <section
                  key={rootCat.categoryId}
                  className="transition-all"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 items-stretch">
                    {/* Parent Category Banner Card: Purple gradient matching FlashSale on Home */}
                    <Link
                      href={`/products?categoryIds=${rootCat.categoryId}`}
                      className="col-span-2 sm:col-span-2 lg:col-span-2 group relative bg-gradient-to-br from-purple-900 via-indigo-950 to-purple-950 rounded-2xl border border-purple-800/50 hover:border-purple-400 p-4 sm:p-5 flex items-center justify-between text-white shadow-md shadow-purple-950/20 hover:shadow-2xl hover:shadow-purple-900/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden min-h-[160px] sm:min-h-[175px]"
                    >
                      {/* Ambient background glowing orbs */}
                      <div className="absolute -top-10 -left-10 w-36 h-36 bg-purple-600/30 rounded-full blur-2xl pointer-events-none" />
                      <div className="absolute -bottom-8 -right-8 w-36 h-36 bg-fuchsia-600/25 rounded-full blur-2xl pointer-events-none" />

                      {/* Cyber geometric micro dot texture */}
                      <div
                        className="absolute inset-0 opacity-[0.14] pointer-events-none"
                        style={{
                          backgroundImage:
                            "radial-gradient(circle at 1px 1px, #c084fc 1px, transparent 0)",
                          backgroundSize: "20px 20px",
                        }}
                      />

                      {/* Left: Info & Button */}
                      <div className="relative z-10 flex flex-col justify-between h-full pr-3 max-w-[62%]">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-1 shadow-inner shrink-0">
                              {rootCat.iconUrl ? (
                                <div className="relative w-full h-full">
                                  <Image
                                    src={rootCat.iconUrl}
                                    alt={rootCat.name}
                                    fill
                                    sizes="28px"
                                    className="object-contain"
                                  />
                                </div>
                              ) : (
                                <Layers size={14} className="text-purple-200" />
                              )}
                            </div>
                            <span className="text-[10px] font-semibold tracking-wider uppercase text-purple-200/70">
                              {t("categories.title") || "Ngành hàng"}
                            </span>
                          </div>

                          <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-snug line-clamp-2">
                            {rootCat.name}
                          </h2>
                        </div>

                        <div className="pt-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-950 bg-white hover:bg-purple-50 px-3.5 py-1.5 rounded-xl shadow-xs transition-colors">
                            <span>{t("categories.viewAllProducts")}</span>
                            <ArrowRight
                              size={13}
                              className="transition-transform duration-200 group-hover:translate-x-0.5"
                            />
                          </span>
                        </div>
                      </div>

                      {/* Right: Floating Product Image */}
                      <div className="relative z-10 shrink-0 w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                        {rootCat.iconUrl ? (
                          <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-300 ease-out drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)]">
                            <Image
                              src={rootCat.iconUrl}
                              alt={rootCat.name}
                              fill
                              sizes="(max-width: 640px) 96px, 112px"
                              className="object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-purple-200/60">
                            <Layers size={32} strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Subcategories Cards: Same height on the same row */}
                    {children.map((child) => {
                      const childCat = child.category;

                      return (
                        <Link
                          key={childCat.categoryId}
                          href={`/products?categoryIds=${childCat.categoryId}`}
                          className="group relative bg-white hover:bg-white rounded-2xl border border-gray-300 hover:border-gray-950 p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-xs hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[160px] sm:min-h-[175px]"
                        >
                          <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-gray-50 to-gray-100/70 p-3 mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ease-out border border-gray-100">
                            {childCat.iconUrl ? (
                              <div className="relative w-full h-full">
                                <Image
                                  src={childCat.iconUrl}
                                  alt={childCat.name}
                                  fill
                                  sizes="(max-width: 640px) 72px, 80px"
                                  className="object-contain drop-shadow-sm"
                                />
                              </div>
                            ) : (
                              <Layers
                                size={26}
                                className="text-gray-400 group-hover:text-brand transition-colors"
                              />
                            )}
                          </div>

                          <h3 className="text-xs sm:text-sm font-bold text-gray-800 group-hover:text-black line-clamp-2 transition-colors px-1 leading-snug">
                            {childCat.name}
                          </h3>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
