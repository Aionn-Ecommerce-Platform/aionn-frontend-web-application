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
          <p className="text-sm text-gray-500 mt-1">
            {loading
              ? t("categories.loading")
              : stats.departments > 0
                ? t("categories.subtitle")
                : ""}
          </p>
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
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`dept-skel-${idx}`}
                className="bg-white rounded-2xl border border-gray-300 p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-5 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-200" />
                    <div className="space-y-2">
                      <div className="h-5 w-40 bg-gray-200 rounded-md" />
                      <div className="h-3 w-24 bg-gray-100 rounded-md" />
                    </div>
                  </div>
                  <div className="h-8 w-28 bg-gray-200 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                  {Array.from({ length: 6 }).map((__, cIdx) => (
                    <div
                      key={`card-skel-${cIdx}`}
                      className="p-3 sm:p-4 flex flex-col items-center gap-2.5 rounded-2xl"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-gray-100" />
                      <div className="h-3 w-16 bg-gray-100 rounded-md" />
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
          <div className="space-y-8">
            {filteredTree.map((root) => {
              const rootCat = root.category;
              const children = root.children;

              return (
                <section
                  key={rootCat.categoryId}
                  className="bg-white rounded-2xl border border-gray-300 p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all"
                >
                  {/* Department Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-3.5">
                      <div className="relative w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center p-2 shadow-2xs shrink-0 overflow-hidden">
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
                          <Layers size={22} className="text-gray-400" />
                        )}
                      </div>

                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-950 tracking-tight">
                          {rootCat.name}
                        </h2>
                      </div>
                    </div>

                    <Link
                      href={`/products?categoryIds=${rootCat.categoryId}`}
                      className="group inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition-all rounded-xl px-4 py-2 border-none cursor-pointer"
                    >
                      <span>{t("categories.viewAllProducts")}</span>
                      <ArrowRight
                        size={14}
                        className="transition-transform duration-200 group-hover:translate-x-1"
                      />
                    </Link>
                  </div>

                  {/* Subcategories Grid */}
                  {children.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 pt-5">
                      {children.map((child) => {
                        const childCat = child.category;

                        return (
                          <Link
                            key={childCat.categoryId}
                            href={`/products?categoryIds=${childCat.categoryId}`}
                            className="group flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl hover:bg-gray-50/80 transition-all duration-200 cursor-pointer"
                          >
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-50 flex items-center justify-center p-2 mb-2.5 transition-transform duration-300 ease-out group-hover:scale-105">
                              {childCat.iconUrl ? (
                                <div className="relative w-full h-full">
                                  <Image
                                    src={childCat.iconUrl}
                                    alt={childCat.name}
                                    fill
                                    sizes="(max-width: 640px) 64px, 80px"
                                    className="object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-gray-500 group-hover:bg-gray-100 transition-colors">
                                  <Layers size={22} strokeWidth={1.75} />
                                </div>
                              )}
                            </div>

                            <h3 className="text-xs sm:text-[13px] font-semibold text-gray-800 group-hover:text-brand line-clamp-2 transition-colors px-1 leading-snug">
                              {childCat.name}
                            </h3>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="pt-6 pb-2 text-center text-sm text-gray-500">
                      <p>{t("categories.noSubcategories")}</p>
                      <Link
                        href={`/products?categoryIds=${rootCat.categoryId}`}
                        className="inline-flex items-center gap-1 text-xs text-brand font-semibold hover:underline mt-2"
                      >
                        <span>{t("categories.viewAllProducts")}</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
