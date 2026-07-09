<template>
  <div class="stage">
    <div class="glow" aria-hidden="true"></div>
    <main class="hero">
      <p class="badge">
        <span class="badge-dot" aria-hidden="true"></span>Served By BrowserPod
      </p>

      <h1>The server<br />is this tab.</h1>

      <p class="lede">
        Nuxt renders this page on Node — compiled to WebAssembly and running in
        your browser. Nothing to deploy, nothing to host.
      </p>

      <div class="readout" role="status" aria-label="Runtime">
        <span class="rd on">nuxt 3</span>
        <span class="rd-sep" aria-hidden="true">/</span>
        <span class="rd">node</span>
        <span class="rd-sep" aria-hidden="true">/</span>
        <span class="rd">wasm32</span>
        <span class="rd-sep" aria-hidden="true">/</span>
        <span class="rd">in-browser</span>
      </div>

      <p class="hint">
        Edit <code>app/app.vue</code> and save to see it update.
      </p>

      <nav class="links" aria-label="Resources">
        <a href="https://nuxt.com/docs" target="_blank" rel="noreferrer">
          Documentation<span aria-hidden="true">→</span>
        </a>
        <a href="https://nuxt.com/modules" target="_blank" rel="noreferrer">
          Modules<span aria-hidden="true">→</span>
        </a>
      </nav>
    </main>
  </div>
</template>

<style>
:root {
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

html,
body,
#__nuxt {
  margin: 0;
  min-height: 100%;
}

body {
  background: #020420;
}
</style>

<style scoped>
.stage {
  --navy: #020420;
  --mint: #00dc82;
  --ink: #f2f6f4;
  --muted: #8b93a7;
  --line: rgba(255, 255, 255, 0.1);

  position: relative;
  display: flex;
  align-items: center;
  min-height: 100vh;
  overflow: hidden;
  background: var(--navy);
  color: var(--muted);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  line-height: 1.5;
}

.glow {
  position: absolute;
  top: -22%;
  left: -8%;
  width: min(70vw, 760px);
  height: min(70vw, 760px);
  background: radial-gradient(circle, rgba(0, 220, 130, 0.22), transparent 68%);
  filter: blur(30px);
  pointer-events: none;
}

.hero {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: clamp(32px, 6vw, 72px);
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 34px;
  padding: 5px 12px;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px;
  letter-spacing: 0.2px;
  color: var(--mint);
  background: color-mix(in srgb, var(--mint) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--mint) 40%, transparent);
  border-radius: 999px;
}

.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--mint);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--mint) 18%, transparent);
  animation: badge-pulse 2.4s ease-in-out infinite;
}

h1 {
  margin: 0;
  font-size: clamp(48px, 9.5vw, 104px);
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: -0.045em;
  color: var(--ink);
}

.lede {
  max-width: 44ch;
  margin: 1.6rem 0 0;
  font-size: clamp(15px, 2.2vw, 18px);
}

.readout {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 9px;
  margin-top: 2.2rem;
  padding: 11px 16px;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--line);
  border-left: 2px solid var(--mint);
  border-radius: 10px;
}

.readout .rd {
  color: var(--ink);
}

.readout .rd.on {
  color: var(--mint);
}

.readout .rd-sep {
  opacity: 0.35;
}

.hint {
  margin: 1.4rem 0 0;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.8rem;
  color: var(--muted);
}

.hint code {
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.07);
  color: var(--ink);
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 2.4rem;
}

.links a {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 15px;
  font-size: 14px;
  color: var(--ink);
  text-decoration: none;
  border: 1px solid var(--line);
  border-radius: 8px;
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s;
}

.links a:hover {
  color: var(--mint);
  border-color: color-mix(in srgb, var(--mint) 55%, transparent);
  background: color-mix(in srgb, var(--mint) 7%, transparent);
}

.links a:focus-visible {
  outline: 2px solid var(--mint);
  outline-offset: 2px;
}

@keyframes badge-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .badge-dot {
    animation: none;
  }
}
</style>
