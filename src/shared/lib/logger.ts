type LogContext = unknown;

const isDevelopment = process.env.NODE_ENV !== "production";

export const logger = {
  debug(message: string, context?: LogContext) {
    if (!isDevelopment) return;
    console.debug(message, context);
  },

  warn(message: string, context?: LogContext) {
    if (!isDevelopment) return;
    console.warn(message, context);
  },

  error(message: string, context?: LogContext) {
    if (!isDevelopment) return;
    console.error(message, context);
  },
};
