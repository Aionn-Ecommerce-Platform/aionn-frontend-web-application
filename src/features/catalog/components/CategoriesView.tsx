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
    <div className="bg-transparent min-h-screen">
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
                <div className="mb-4 h-4 w-32 rounded-md bg-gray-100" />
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-y-8 gap-x-2">
                  {Array.from({ length: 7 }).map((__, cIdx) => (
                    <div
                      key={`card-skel-${cIdx}`}
                      className="flex flex-col items-center gap-2.5"
                    >
                      <div className="h-14 w-14 rounded-full bg-gray-100 sm:h-16 sm:w-16 md:h-20 md:w-20" />
                      <div className="h-3 w-14 rounded-full bg-gray-100" />
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

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-y-8 gap-x-2 select-none">

                    {/* Subcategories: borderless icon shelf, matching the home page */}
                    {children.map((child) => {
                      const childCat = child.category;

                      return (
                        <div
                          key={childCat.categoryId}
                          className="flex justify-center"
                        >
                          <Link
                            href={`/products?categoryIds=${childCat.categoryId}`}
                            className="group flex w-full max-w-[110px] flex-col items-center text-center transition-transform duration-200"
                          >
                            <div className="relative mb-2.5 flex h-14 w-14 items-center justify-center transition-transform duration-300 ease-out group-hover:scale-105 sm:h-16 sm:w-16 md:h-20 md:w-20">
                              {childCat.iconUrl ? (
                                <div className="relative h-full w-full">
                                  <Image
                                    src={childCat.iconUrl}
                                    alt={childCat.name}
                                    fill
                                    sizes="(max-width: 640px) 56px, (max-width: 768px) 64px, 80px"
                                    className="object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="flex h-13 w-13 items-center justify-center rounded-full bg-gray-50 text-gray-600 transition-colors group-hover:bg-gray-100 sm:h-15 sm:w-15">
                                  <Layers size={24} strokeWidth={1.75} />
                                </div>
                              )}
                            </div>

                            <span className="line-clamp-2 px-1 text-xs font-semibold leading-snug tracking-tight text-gray-900 transition-colors group-hover:text-black sm:text-[13px] md:text-sm">
                              {childCat.name}
                            </span>
                          </Link>
                        </div>
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
