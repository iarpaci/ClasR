import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "./components/CookieBanner";
import PosthogProvider from "./components/PosthogProvider";

export const metadata: Metadata = {
  title: "CLASR — Academic Manuscript Signal Reader",
  description: "AI-powered academic signal reader for English quantitative manuscripts. Structural review, methodological visibility, reference check, inconsistency detection, red flags, and final integrated Q1-style report.",
  keywords: "academic manuscript review, peer review checker, research paper analysis, methodology review, citation checker",
  openGraph: {
    title: "CLASR — Academic Manuscript Signal Reader",
    description: "Read your manuscript the way a reviewer does. 6 AI-powered review functions for academic manuscripts.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full bg-gray-950 text-gray-100 antialiased" suppressHydrationWarning>
        <PosthogProvider>
          {children}
        </PosthogProvider>
        <CookieBanner />
      </body>
    </html>
  );
}
