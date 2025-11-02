import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

export default defineConfig(async ({ mode }) => {
  const plugins = [react()];
  if (mode === "development") {
    const { componentTagger } = await import("lovable-tagger");
    plugins.push(componentTagger());
  }
  return ({
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: "http://localhost:8000",
          changeOrigin: true,
          // No rewrite needed because backend Router removes /api prefix itself
        },
      },
    },
    preview: {
      host: true,
      port: 5173,
      strictPort: true,
    },
    plugins,
    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()]
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  });
});
