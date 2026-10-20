"use client";

import Link from "next/link";
import Image from "next/image";
import { Layers, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { categoryService } from "@/lib/services";
import { qk } from "@/lib/query-keys";

export default function CategoriesPage() {
  const { t } = useTranslation();
  const {
    data: tree,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: qk.categoriesTree,
    queryFn: () => categoryService.tree(),
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight mb-2">
          {t("categories.title")}
        </h1>
        <p className="text-gray-500 mb-8">{t("categories.subtitle")}</p>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : error ? (
          <EmptyState
            icon={Layers}
            title={t("categories.failedToLoad")}
            description={t("products.failedToLoadDesc")}
          />
        ) : !tree || tree.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={t("categories.noCategories")}
            description={t("categories.noCategoriesDesc")}
          />
        ) : (
          <div className="space-y-10">
            {tree.map((root) => (
              <section key={root.category.categoryId}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {root.category.name}
                  </h2>
                </div>
                {root.children.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {root.children.map((child) => (
                      <Link
                        key={child.category.categoryId}
                        href={`/products?categoryIds=${child.category.categoryId}`}
                        className="group bg-white rounded-2xl border border-gray-100/90 p-4 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 text-center flex flex-col justify-center items-center h-[145px]"
                      >
                        <div className="relative w-14 h-14 mx-auto mb-2 rounded-2xl bg-gradient-to-b from-gray-50 to-gray-100/70 p-2 border border-gray-100/80 group-hover:scale-105 group-hover:border-blue-200 transition-all duration-300 flex items-center justify-center">
                          {child.category.iconUrl ? (
                            <div className="relative w-full h-full">
                              <Image
                                src={child.category.iconUrl}
                                alt={child.category.name}
                                fill
                                sizes="48px"
                                className="object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-300"
                              />
                            </div>
                          ) : (
                            <Layers size={22} className="text-blue-500 group-hover:scale-110 transition-transform" />
                          )}
                        </div>
                        <h3 className="text-[13px] font-semibold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2 px-1">
                          {child.category.name}
                        </h3>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {t("categories.noSubcategories")}
                  </p>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
