import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
      supported: {
        destructuring: true,
      },
    },
  },
  build: {
    target: "esnext",
  },
});
