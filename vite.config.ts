import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "pwa-icon.svg"],
      manifest: {
        name: "oslife — Life OS",
        short_name: "oslife",
        description: "Personal life dashboard: schedule, budget, investments, chat.",
        theme_color: "#0B0D24",
        background_color: "#0B0D24",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "he",
        dir: "rtl",
        icons: [
          { src: "pwa-icon.svg", sizes: "192x192",  type: "image/svg+xml", purpose: "any" },
          { src: "pwa-icon.svg", sizes: "512x512",  type: "image/svg+xml", purpose: "any" },
          { src: "pwa-icon.svg", sizes: "512x512",  type: "image/svg+xml", purpose: "maskable" },
        ],
        shortcuts: [
          {
            name: "הוספת הוצאה",
            short_name: "הוצאה",
            description: "פתח טופס הוצאה חדשה",
            url: "/budget?quick=expense",
            icons: [{ src: "pwa-icon.svg", sizes: "192x192", type: "image/svg+xml" }],
          },
          {
            name: "הוספת הכנסה",
            short_name: "הכנסה",
            description: "פתח טופס הכנסה חדשה",
            url: "/budget?quick=income",
            icons: [{ src: "pwa-icon.svg", sizes: "192x192", type: "image/svg+xml" }],
          },
          {
            name: "AI שיחה",
            short_name: "שיחה",
            description: "פתח את ה-AI",
            url: "/chat",
            icons: [{ src: "pwa-icon.svg", sizes: "192x192", type: "image/svg+xml" }],
          },
          {
            name: "תיק השקעות",
            short_name: "תיק",
            description: "עבור לתיק ההשקעות",
            url: "/investments",
            icons: [{ src: "pwa-icon.svg", sizes: "192x192", type: "image/svg+xml" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        navigateFallback: "/index.html",
        // Let the SPA router handle /api/* requests — do NOT serve the
        // app shell for those paths, they must hit the serverless
        // functions.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // /api/notion POST, /api/chat SSE, etc. — NetworkOnly so
            // we never serve stale financial / Notion data from cache.
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
          },
          {
            // Fonts / static assets.
            urlPattern: /\.(?:woff2?|ttf|otf)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "font-cache",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
