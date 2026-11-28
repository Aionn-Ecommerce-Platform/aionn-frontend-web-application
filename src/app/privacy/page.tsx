"use client";

import LegalDocumentPage from "@/components/legal/LegalDocumentPage";
import { useTranslation } from "@/hooks";

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  const sections = [1, 2, 3, 4, 5, 6].map((index) => ({
    title: t(`legal.privacy.s${index}Title`),
    body: t(`legal.privacy.s${index}Body`),
  }));

  return (
    <LegalDocumentPage
      kind="privacy"
      homeLabel={t("legal.home")}
      badge={t("legal.badge")}
      title={t("legal.privacy.title")}
      intro={t("legal.privacy.intro")}
      updated={t("legal.privacy.updated")}
      sections={sections}
      otherHref="/terms"
      otherLabel={t("legal.readTerms")}
    />
  );
}
