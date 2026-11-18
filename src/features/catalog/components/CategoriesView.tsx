"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Layers, PackageSearch } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button, EmptyState } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { categoryService } from "@/lib/services";
import { qk } from "@/lib/query-keys";

export default function CategoriesView() {
  const { t } = useTranslation();
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

  const filteredTree = useMemo(() => {
    return rawTree.filter((root) => {
      if (
        selectedDeptId !== "all" &&
        root.category.categoryId !== selectedDeptId
      ) {
        return false;
      }
      return true;
    });
  }, [rawTree, selectedDeptId]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            {t("categories.title")}
          </h1>
        </div>

        {/* Department Quick Filter Tabs (Voucher style) */}
        {!loading && !error && rawTree.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 pb-2 pt-1">
            <button
              type="button"
              onClick={() => setSelectedDeptId("all")}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-150 cursor-pointer ${
                selectedDeptId === "all"
                  ? "bg-gray-950 text-white border border-gray-950 shadow-xs"
                  : "bg-white text-gray-800 border border-gray-950 hover:bg-gray-100 hover:text-black"
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
                      ? "bg-gray-950 text-white border border-gray-950 shadow-xs"
                      : "bg-white text-gray-800 border border-gray-950 hover:bg-gray-100 hover:text-black"
                  }`}
                >
                  {root.category.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Main Content Area */}
        {loading ? (
          <div className="space-y-10 sm:space-y-12">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div key={`dept-skel-${idx}`} className="animate-pulse">
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
                {t("common.retry")}
              </Button>
            }
          />
        ) : filteredTree.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={t("categories.noCategories")}
            description={t("categories.noCategoriesDesc")}
          />
        ) : (
          <div className="space-y-10 sm:space-y-12">
            {filteredTree.map((root) => {
              const rootCat = root.category;
              const children = root.children;

              return (
                <section key={rootCat.categoryId} className="transition-all">
                  <div className="mb-4">
                    <Link
                      href={`/products?categoryIds=${rootCat.categoryId}`}
                      className="inline-flex items-center gap-2 text-lg sm:text-xl font-extrabold text-gray-950 tracking-tight hover:text-brand transition-colors"
                    >
                      {rootCat.name}
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 items-stretch">

                    {/* Subcategories Cards: Same height on the same row */}
                    {children.map((child) => {
                      const childCat = child.category;

                      return (
                        <Link
                          key={childCat.categoryId}
                          href={`/products?categoryIds=${childCat.categoryId}`}
                          className="group relative bg-white hover:bg-white rounded-2xl border border-gray-400 hover:border-gray-950 p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-xs hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[160px] sm:min-h-[175px]"
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
