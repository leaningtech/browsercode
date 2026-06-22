import { createServer } from "vite";

const server = await createServer({
  configFile: false,
  root: ".",
  server: { host: "0.0.0.0", port: 3000, watch: null },
  optimizeDeps: { disabled: true },
});

await server.listen();
console.log("Vite demo listening on port 3000");
