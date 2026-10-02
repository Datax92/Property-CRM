import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Property CRM — Real Estate Management System",
  description: "Real Estate Management System - property, sales, invoice and finance management.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='10' fill='%23714B67'/%3E%3Ctext x='20' y='27' text-anchor='middle' font-family='Arial,sans-serif' font-size='19' font-weight='700' fill='%23FFFFFF'%3EM%3C/text%3E%3C/svg%3E",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700&family=Poppins:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Noto+Nastaliq+Urdu:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
