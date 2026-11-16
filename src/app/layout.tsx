import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Hungry Bar — Fresh, Hot, Hand-tossed Halal Pizza · Dehiwala", template: "%s · Hungry Bar" },
  description:
    "Build your own pizza and watch it come alive. 100% halal, hand-tossed pizzas, Detroit squares, paninis, fresh juices & mojitos at Hill Food Square, Dehiwala. Order online for delivery or pickup.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://hungrybar.lk"),
  icons: { icon: "/brand/logo.png", apple: "/brand/logo.png" },
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
