// Front-end for the request console.
const routes = [...document.querySelectorAll(".route")];
const response = document.getElementById("response");
const rMethod = document.getElementById("r-method");
const rPath = document.getElementById("r-path");
const rStatus = document.getElementById("r-status");
const rBody = document.getElementById("r-body");

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
}

// Light syntax coloring.
function highlight(value) {
  return escapeHtml(JSON.stringify(value, null, 2))
    .replace(/"([^"]+)":/g, '<span class="k">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="s">"$1"</span>');
}

async function send(btn) {
  const { method, path, body, m } = btn.dataset;
  routes.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));

  response.dataset.m = m;
  rMethod.textContent = method;
  rPath.textContent = path;
  rStatus.textContent = "sending…";

  const started = performance.now();
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body,
  });
  const data = await res.json();
  const ms = Math.max(1, Math.round(performance.now() - started));

  rStatus.innerHTML = `<span class="code">${res.status} ${res.statusText}</span> · ${ms} ms`;
  rBody.innerHTML = highlight(data);
}

routes.forEach((b) => b.addEventListener("click", () => send(b)));
// Open with a live response so the panel is never empty.
send(routes[0]);

// Dev auto-refresh: poll a content hash of public/ and reload when it changes.
// If the request fails (e.g. server restarting), ignore it and keep polling.
let lastVersion = null;
setInterval(async () => {
  try {
    const res = await fetch("/__version", { cache: "no-store" });
    const { v } = await res.json();
    if (lastVersion === null) lastVersion = v;
    else if (v !== lastVersion) location.reload();
  } catch {
    /* keep polling */
  }
}, 1000);
