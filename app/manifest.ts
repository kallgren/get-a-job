import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Get a Job",
    short_name: "Get a Job",
    description: "Simple Kanban for your job search",
    start_url: "/",
    display: "standalone",
    // Matches the header's `bg-card` in light mode, so the window chrome
    // blends into the app instead of framing it.
    theme_color: "#ffffff",
    background_color: "#ffffff",
    icons: [
      {
        src: "/icon/32",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
