import { clsx, type ClassValue } from "clsx";

type AppLocale = "vi" | "en";

export function getIntlLocale(locale: AppLocale | string = "vi") {
  if (locale === "vi") return "vi-VN";
  if (locale === "en") return "en-US";
  return locale;
}

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(
  amount: number,
  currency: string = "VND",
  locale: AppLocale | string = "vi",
): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatNumber(
  value: number,
  locale: AppLocale | string = "vi",
): string {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(value);
}

export function formatDate(
  date: string | Date,
  locale: AppLocale | string = "vi",
): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatMonthYear(
  date: string | Date,
  locale: AppLocale | string = "vi",
): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    year: "numeric",
    month: "long",
  }).format(new Date(date));
}

export function formatDateTime(
  date: string | Date,
  locale: AppLocale | string = "vi",
): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatTime(
  date: string | Date,
  locale: AppLocale | string = "vi",
): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}
