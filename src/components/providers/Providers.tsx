"use client";

import { Toaster } from "react-hot-toast";
import NextTopLoader from "nextjs-toploader";
import { QueryClientProvider } from "@tanstack/react-query";
import AuthInitializer from "./AuthInitializer";
import CartSyncBoundary from "./CartSyncBoundary";
import GlobalFetchProgress from "./GlobalFetchProgress";
import LocaleInitializer from "./LocaleInitializer";
import { queryClient } from "@/lib/query-client";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      <CartSyncBoundary />
      <GlobalFetchProgress />
      <LocaleInitializer />
      <NextTopLoader
        color="#2563eb"
        initialPosition={0.08}
        crawlSpeed={200}
        height={3}
        crawl={true}
        showSpinner={false}
        easing="ease"
        speed={200}
        shadow="0 0 10px #2563eb,0 0 5px #2563eb"
      />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#fff",
            color: "#1f2937",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            padding: "12px 16px",
            fontSize: "14px",
            boxShadow:
              "0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)",
          },
          success: {
            iconTheme: { primary: "#2563eb", secondary: "#fff" },
          },
          error: {
            iconTheme: { primary: "#dc2626", secondary: "#fff" },
          },
        }}
      />
      {children}
    </QueryClientProvider>
  );
}
