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

        {/* Department Quick Filter Tabs */}
        {!loading && !error && rawTree.length > 0 && !searchQuery && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
            <button
              type="button"
              onClick={() => setSelectedDeptId("all")}
              className={`h-9 px-4 rounded-xl text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap select-none inline-flex items-center gap-1.5 font-medium ${
                selectedDeptId === "all"
                  ? "bg-gray-950 text-white shadow-xs font-semibold"
                  : "bg-white text-gray-700 hover:text-gray-950 hover:bg-gray-50 border border-gray-300 shadow-2xs"
              }`}
            >
              <span>{t("categories.allDepartments")}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                  selectedDeptId === "all"
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {stats.departments}
              </span>
            </button>

            {rawTree.map((root) => {
              const active = selectedDeptId === root.category.categoryId;
              return (
                <button
                  key={root.category.categoryId}
                  type="button"
                  onClick={() => setSelectedDeptId(root.category.categoryId)}
                  className={`h-9 px-3.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap select-none inline-flex items-center gap-1.5 font-medium ${
                    active
                      ? "bg-gray-950 text-white shadow-xs font-semibold"
                      : "bg-white text-gray-700 hover:text-gray-950 hover:bg-gray-50 border border-gray-300 shadow-2xs"
                  }`}
                >
                  <span>{root.category.name}</span>
                  {root.children.length > 0 && (
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {root.children.length}
                    </span>
                  )}
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
          <div className="space-y-8">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={`dept-skel-${idx}`}
                className="bg-white rounded-3xl border border-gray-300 p-5 sm:p-6 shadow-[0_4px_25px_rgba(0,0,0,0.04)] animate-pulse"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                  {/* Left Hero Skeleton */}
                  <div className="lg:col-span-4 rounded-2xl bg-gray-900 p-6 sm:p-7 flex flex-col justify-between min-h-[320px]">
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-gray-800 mb-4" />
                      <div className="h-6 w-36 bg-gray-800 rounded-md" />
                    </div>
                    <div className="w-28 h-28 mx-auto bg-gray-800 rounded-2xl my-4" />
                    <div className="h-11 w-full bg-gray-800 rounded-xl" />
                  </div>
                  {/* Right Grid Skeletons */}
                  <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4">
                    {Array.from({ length: 3 }).map((__, cIdx) => (
                      <div
                        key={`card-skel-${cIdx}`}
                        className="rounded-2xl border border-gray-200 p-5 flex flex-col items-center justify-center gap-3 min-h-[160px]"
                      >
                        <div className="w-18 h-18 rounded-2xl bg-gray-100" />
                        <div className="h-3.5 w-24 bg-gray-100 rounded-md" />
                      </div>
                    ))}
                  </div>
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
          <div className="space-y-8">
            {filteredTree.map((root) => {
              const rootCat = root.category;
              const children = root.children;

              return (
                <section
                  key={rootCat.categoryId}
                  className="bg-white rounded-3xl border border-gray-300 p-5 sm:p-6 shadow-[0_4px_25px_rgba(0,0,0,0.04)] transition-all"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
                    {/* Left Column: Department Hero Showcase Banner */}
                    <div className="lg:col-span-4 xl:col-span-4 rounded-2xl bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6 sm:p-7 text-white flex flex-col justify-between relative overflow-hidden shadow-lg border border-gray-800 group">
                      {/* Ambient background glow circles */}
                      <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand/25 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

                      {/* Header info */}
                      <div className="relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center p-2 mb-4 shadow-inner">
                          {rootCat.iconUrl ? (
                            <div className="relative w-full h-full">
                              <Image
                                src={rootCat.iconUrl}
                                alt={rootCat.name}
                                fill
                                sizes="48px"
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <Layers size={22} className="text-white/80" />
                          )}
                        </div>

                        <span className="text-xs font-semibold tracking-wider uppercase text-white/60">
                          {t("categories.title") || "Ngành hàng"}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                          {rootCat.name}
                        </h2>
                      </div>

                      {/* Hero Image Showcase */}
                      <div className="relative z-10 my-6 flex justify-center items-center py-2">
                        {rootCat.iconUrl ? (
                          <div className="relative w-36 h-36 sm:w-40 sm:h-40 group-hover:scale-105 transition-transform duration-500 ease-out drop-shadow-[0_20px_25px_rgba(0,0,0,0.6)]">
                            <Image
                              src={rootCat.iconUrl}
                              alt={rootCat.name}
                              fill
                              sizes="(max-width: 640px) 144px, 160px"
                              className="object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                            <Layers size={48} strokeWidth={1.5} />
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Button */}
                      <div className="relative z-10 pt-2">
                        <Link
                          href={`/products?categoryIds=${rootCat.categoryId}`}
                          className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-950 font-bold text-sm py-3 px-5 rounded-xl shadow-md transition-all group-hover:shadow-xl cursor-pointer"
                        >
                          <span>{t("categories.viewAllProducts")}</span>
                          <ArrowRight
                            size={16}
                            className="transition-transform duration-200 group-hover:translate-x-1"
                          />
                        </Link>
                      </div>
                    </div>

                    {/* Right Column: Subcategories Grid */}
                    <div className="lg:col-span-8 xl:col-span-8 flex flex-col justify-center">
                      {children.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4 h-full content-center">
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
                      ) : (
                        <div className="py-12 text-center text-gray-500 bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
                          <p className="text-sm">{t("categories.noSubcategories")}</p>
                          <Link
                            href={`/products?categoryIds=${rootCat.categoryId}`}
                            className="inline-flex items-center gap-1.5 text-xs text-brand font-bold hover:underline mt-2"
                          >
                            <span>{t("categories.viewAllProducts")}</span>
                            <ArrowRight size={13} />
                          </Link>
                        </div>
                      )}
                    </div>
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
