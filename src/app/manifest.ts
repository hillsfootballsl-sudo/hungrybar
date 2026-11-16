import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hungry Bar",
    short_name: "Hungry Bar",
    description: "Fresh, hot, hand-tossed halal pizza — Dehiwala",
    start_url: "/",
    display: "standalone",
    background_color: "#FCF6E9",
    theme_color: "#EE4224",
    icons: [{ src: "/brand/logo.png", sizes: "1563x1563", type: "image/png", purpose: "any" }],
  };
}
