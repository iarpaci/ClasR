import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClasR — Academic Signal Reader",
  description: "AI-powered academic manuscript reading reports calibrated to peer review standards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full bg-gray-950 text-gray-100 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
