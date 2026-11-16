import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Backend (Express) the dev server forwards API calls to.
const backend = process.env.BACKEND_URL || "http://localhost:4949";

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs so the app works under any URL base. In production the
  // backend injects <base href="/your-base/"> into index.html (see app.js).
  base: "./",
  build: {
    // app.js and the Dockerfile serve the build from frontend/production
    outDir: "production",
    emptyOutDir: true,
    sourcemap: false,
    // Single-page app served locally; one large bundle is fine
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 3000,
    proxy: {
      "/backend": backend,
      "/webhook": backend,
      "/feed": backend,
      // Live updates WebSocket (the app connects to the page's host root)
      "^/$": { target: backend, ws: true, bypass: (req) => (req.headers.upgrade ? undefined : req.url) },
    },
  },
});
