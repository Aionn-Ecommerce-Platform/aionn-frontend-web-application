"use client";

import LegalDocumentPage from "@/components/legal/LegalDocumentPage";
import { useTranslation } from "@/hooks";

export default function TermsPage() {
  const { t } = useTranslation();
  const sections = [1, 2, 3, 4, 5, 6].map((index) => ({
    title: t(`legal.terms.s${index}Title`),
    body: t(`legal.terms.s${index}Body`),
  }));

  return (
    <LegalDocumentPage
      kind="terms"
      homeLabel={t("legal.home")}
      badge={t("legal.badge")}
      title={t("legal.terms.title")}
      intro={t("legal.terms.intro")}
      updated={t("legal.terms.updated")}
      sections={sections}
      otherHref="/privacy"
      otherLabel={t("legal.readPrivacy")}
    />
  );
}
