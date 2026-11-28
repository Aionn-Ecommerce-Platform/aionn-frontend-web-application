import Link from "next/link";
import {
  ChevronRight,
  Clock,
  FileText,
  Shield,
  ArrowRight,
} from "lucide-react";

export interface LegalSection {
  title: string;
  body: string;
}

interface LegalDocumentPageProps {
  kind: "terms" | "privacy";
  homeLabel: string;
  badge: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
  otherHref: string;
  otherLabel: string;
}

export default function LegalDocumentPage({
  kind,
  homeLabel,
  badge,
  title,
  intro,
  updated,
  sections,
  otherHref,
  otherLabel,
}: LegalDocumentPageProps) {
  const Icon = kind === "privacy" ? Shield : FileText;

  return (
    <div className="min-h-screen bg-gray-50/60 py-6 sm:py-10">
      <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-gray-500"
        >
          <Link
            href="/"
            className="flex items-center gap-1 transition-colors hover:text-gray-900"
          >
            {homeLabel}
          </Link>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="font-semibold text-gray-900">{title}</span>
        </nav>

        <div className="relative overflow-hidden rounded-3xl border border-gray-800 bg-linear-to-br from-gray-950 via-gray-900 to-gray-800 p-6 text-white shadow-xl sm:p-10">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md">
              <Icon size={15} />
              <span>{badge}</span>
            </div>
            <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="text-sm font-normal leading-relaxed text-gray-300 sm:text-base">
              {intro}
            </p>
            <div className="flex items-center gap-1.5 pt-1 text-xs text-gray-400">
              <Clock size={14} />
              <span>{updated}</span>
            </div>
          </div>
          <Icon
            size={260}
            className="pointer-events-none absolute -right-10 -bottom-16 stroke-[1] text-white/5"
          />
        </div>

        <div className="space-y-6 rounded-3xl border border-gray-400 bg-white p-6 shadow-xs sm:p-8">
          {sections.map((section, index) => (
            <section key={section.title} className="space-y-2">
              <h2 className="flex items-start gap-2.5 text-base font-bold text-gray-950 sm:text-lg">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand">
                  {index + 1}
                </span>
                {section.title}
              </h2>
              <p className="whitespace-pre-line pl-8.5 text-sm leading-relaxed text-gray-600">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-gray-300 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <Icon size={17} />
            </div>
            <p className="text-sm font-medium text-gray-700">{badge}</p>
          </div>
          <Link
            href={otherHref}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-950 hover:bg-gray-50"
          >
            {otherLabel}
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
