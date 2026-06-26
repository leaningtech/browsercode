const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 4000;
const PUBLIC = path.join(__dirname, "public");

app.use(express.json());

// Don't cache static files, so a reload always fetches the latest edit.
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use(express.static(PUBLIC, { etag: false, lastModified: false }));

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from Express!", runtime: "Node.js on BrowserPod" });
});

app.get("/api/time", (req, res) => {
  res.json({ now: new Date().toISOString(), uptime: process.uptime() });
});

app.post("/api/echo", (req, res) => {
  res.json({ youSent: req.body ?? null });
});

// Auto-refresh: a fingerprint of public/ (name + size + mtime — no crypto). The
// page polls this and reloads when it changes.
app.get("/__version", (req, res) => {
  let v = "";
  for (const name of fs.readdirSync(PUBLIC).sort()) {
    const file = path.join(PUBLIC, name);
    const stat = fs.statSync(file);
    if (stat.isFile()) v += `${name}:${stat.size}:${stat.mtimeMs};`;
  }
  res.json({ v });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Express server listening on http://0.0.0.0:${PORT}`);
});
