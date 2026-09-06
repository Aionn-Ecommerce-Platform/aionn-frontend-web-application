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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
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
                        className="group bg-gray-50 rounded-md border border-gray-400 p-5 hover:border-blue-500 hover:bg-blue-50 hover:shadow-lg hover:shadow-blue-500/15 transition-all duration-300 text-center flex flex-col justify-center items-center"
                      >
                        {child.category.iconUrl ? (
                          <div className="relative w-12 h-12 mx-auto mb-2">
                            <Image
                              src={child.category.iconUrl}
                              alt={child.category.name}
                              fill
                              sizes="48px"
                              className="object-contain group-hover:scale-110 transition-transform"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 mx-auto mb-2 bg-blue-50 border border-gray-400 rounded-xl flex items-center justify-center">
                            <Layers size={20} className="text-blue-600" />
                          </div>
                        )}
                        <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2">
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
