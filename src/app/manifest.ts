import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Hungry Bar — Pizza, Subs & Juices",
    short_name: "Hungry Bar",
    description: "Order fresh, hot, hand-tossed halal pizza from Hungry Bar, Dehiwala. Earn Hungry Points on every order.",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#EE4224",
    categories: ["food", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Order pizza", url: "/menu?c=pizzas", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Hungry Deals", url: "/menu?c=deals", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My orders", url: "/account?tab=orders", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
