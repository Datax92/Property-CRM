import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { EARLY_APPLY_SCRIPT } from "../lib/appearance";

export const metadata: Metadata = {
  title: "A & Sons Tradeway — Property Management",
  description: "Real Estate Management System - property, sales, invoice and finance management.",
  // The company mark, traced to vectors (src/app/icon.svg is served as the tab icon).
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="signature" data-icons="classic" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700&family=Poppins:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Noto+Nastaliq+Urdu:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        {/* Puts the saved theme and icon pack on the page before it is drawn, so a reload
            never flashes the default colours first. */}
        <Script id="saved-look" strategy="beforeInteractive">
          {EARLY_APPLY_SCRIPT}
        </Script>
      </body>
    </html>
  );
}
