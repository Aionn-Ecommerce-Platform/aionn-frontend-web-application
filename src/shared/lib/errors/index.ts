import { t } from "@/i18n/translate";
import { ApiError } from "@/shared/api";
import { getMessageKeyForErrorCode } from "./codes";

export class NotImplementedError extends Error {
  readonly operation: string;

  constructor(operation: string) {
    super(`Not implemented on the backend: ${operation}`);
    this.name = "NotImplementedError";
    this.operation = operation;
  }
}

export function isNotImplemented(err: unknown): err is NotImplementedError {
  return err instanceof NotImplementedError;
}

export function getErrorMessage(err: unknown, fallback?: string): string {
  const defaultMessage = fallback ?? t("common.errorBoundaryTitle");

  if (err instanceof NotImplementedError) {
    return t("common.featureUnavailable");
  }

  if (err instanceof ApiError) {
    const messageKey = getMessageKeyForErrorCode(err.errorCode);
    if (messageKey) return t(messageKey);
    return err.firstFieldError ?? err.message ?? defaultMessage;
  }

  if (err instanceof Error && err.message) return err.message;

  return defaultMessage;
}

export function getFieldErrors(err: unknown): Record<string, string> {
  if (err instanceof ApiError && err.fieldErrors) return err.fieldErrors;
  return {};
}
