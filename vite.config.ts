// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: false,
        workbox: {
          // TanStack Start's Vite 8 multi-environment build does not always
          // have the client files on disk when the PWA plugin runs closeBundle.
          // Rely on runtime caching instead of a generated precache manifest so
          // Workbox never fails with an empty glob result during production build.
          globPatterns: [],
          navigateFallback: undefined,
          navigateFallbackDenylist: [/^\/api\//, /^\/~oauth/, /^\/__/],
          runtimeCaching: [
            {
              urlPattern: ({ request, url }: { request: Request; url: URL }) =>
                request.mode === "navigate" &&
                !url.pathname.startsWith("/api/") &&
                !url.pathname.startsWith("/~oauth") &&
                !url.pathname.startsWith("/__"),
              handler: "NetworkFirst",
              options: {
                cacheName: "assirik-pages",
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
              },
            },
            {
              urlPattern: ({ request, url }: { request: Request; url: URL }) =>
                url.origin === self.location.origin &&
                ["script", "style", "worker", "font", "image"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "assirik-assets",
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
      }),
    ],
  },
});
