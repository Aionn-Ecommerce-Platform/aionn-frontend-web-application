"use client";

import Link from "next/link";
import { Home, PackageSearch, Search } from "lucide-react";
import { Button, StateView } from "@/shared/ui";
import { useTranslation } from "@/hooks";

export default function NotFoundContent() {
  const { t } = useTranslation();

  return (
    <StateView
      eyebrow="404"
      icon={PackageSearch}
      title={t("notFound.title")}
      description={t("notFound.description")}
      className="min-h-[60vh]"
      action={
        <>
          <Link href="/">
            <Button>
              <Home size={16} className="mr-1.5" />
              {t("notFound.home")}
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="outline">
              <Search size={16} className="mr-1.5" />
              {t("notFound.products")}
            </Button>
          </Link>
        </>
      }
    />
  );
}
