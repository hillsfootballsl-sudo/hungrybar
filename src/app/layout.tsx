import type { Metadata, Viewport } from "next";
import { siteUrl } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Hungry Bar — Pizza, Subs & Fresh Juices · Dehiwala", template: "%s · Hungry Bar" },
  description:
    "Order 100% halal, hand-tossed pizzas, Detroit squares, mini subs, sandwiches, fresh juices & mojitos from Hungry Bar, Hill Food Square, Dehiwala. Open 4pm–midnight. Earn Hungry Points on every order.",
  metadataBase: new URL(siteUrl()),
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Hungry Bar", statusBarStyle: "default" },
  manifest: "/manifest.webmanifest",
  openGraph: { images: ["/brand/logo.png"], siteName: "Hungry Bar", locale: "en_LK", type: "website" },
};

export const viewport: Viewport = { themeColor: "#EE4224", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Bowlby+One&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
