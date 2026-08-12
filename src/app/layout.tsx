import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/providers/Providers";
import ConditionalLayout from "@/components/layout/ConditionalLayout";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Aionn - Intelligent Commerce",
    template: "%s | Aionn",
  },
  description:
    "AI-powered commerce for products, merchants, payments, and delivery.",
  keywords: ["ecommerce", "online shopping", "AI", "commerce"],
  authors: [{ name: "Aionn" }],
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Aionn",
    title: "Aionn - Intelligent Commerce",
    description: "AI-powered online commerce with Aionn",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Aionn",
    description: "AI-powered intelligent commerce platform",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className="scroll-smooth"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col antialiased font-sans">
        <Providers>
          <ConditionalLayout>{children}</ConditionalLayout>
        </Providers>
      </body>
    </html>
  );
}
