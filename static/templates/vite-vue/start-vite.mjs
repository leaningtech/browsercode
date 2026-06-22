import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";

const server = await createServer({
  configFile: false,
  root: ".",
  plugins: [vue()],
  server: { host: "0.0.0.0", port: 3000, watch: null },
  optimizeDeps: { disabled: true },
});

await server.listen();
console.log("Vite + Vue demo listening on port 3000");
