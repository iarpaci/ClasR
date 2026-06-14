import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "./components/CookieBanner";
import PosthogProvider from "./components/PosthogProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://clasr.ai"),
  title: "CLASR — Academic Manuscript Signal Reader",
  description: "A non-decisional signal layer for academic manuscripts. No summaries. No verdicts. Just visibility.",
  keywords: "academic manuscript review, peer review checker, research paper analysis, methodology review, signal mapping",
  openGraph: {
    title: "CLASR — Academic Manuscript Signal Reader",
    description: "Read your manuscript the way a reviewer does. AI-powered signal mapping for academic manuscripts.",
    type: "website",
    url: "https://clasr.ai",
    siteName: "CLASR",
  },
  twitter: {
    card: "summary_large_image",
    title: "CLASR — Academic Manuscript Signal Reader",
    description: "Read your manuscript the way a reviewer does. AI-powered signal mapping for academic manuscripts.",
    site: "@clasr_ai",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://use.typekit.net/krb7yow.css" />
      </head>
      <body className="min-h-full bg-cream text-teal antialiased" suppressHydrationWarning>
        <PosthogProvider>
          {children}
        </PosthogProvider>
        <CookieBanner />
      </body>
    </html>
  );
}
