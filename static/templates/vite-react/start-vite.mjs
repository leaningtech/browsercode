import { createServer } from "vite";
import react from "@vitejs/plugin-react";

const server = await createServer({
  configFile: false,
  root: ".",
  plugins: [react()],
  server: { host: "0.0.0.0", port: 3000, watch: null },
  optimizeDeps: { disabled: true },
});

await server.listen();
console.log("Vite + React demo listening on port 3000");
