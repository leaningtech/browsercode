export const dynamic = "force-dynamic";

const UTM = "utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app";

const RESOURCES = [
  { k: "Docs", d: "In-depth guides for the App Router and APIs.", href: `https://nextjs.org/docs?${UTM}` },
  { k: "Learn", d: "An interactive course, with quizzes.", href: `https://nextjs.org/learn?${UTM}` },
  { k: "Templates", d: "Production-ready starters to build on.", href: `https://vercel.com/templates?framework=next.js&${UTM}` },
  { k: "Deploy", d: "Ship to a shareable URL on Vercel.", href: `https://vercel.com/new?${UTM}` },
];

export default function Home() {
  const time = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <main className="wrap">
      <div className="readout" role="status">
        <span className="dot" aria-hidden="true"></span>
        <span className="ok">ready</span>
        <span className="sep">/</span>
        <span>next.js</span>
        <span className="sep">/</span>
        <span>node {process.version}</span>
        <span className="sep">/</span>
        <span>webassembly</span>
        <span className="sep">/</span>
        <span>rendered {time}</span>
      </div>

      <section className="hero">
        <h1>
          The server
          <br />
          is this tab.
        </h1>
        <p className="lede">
          This page is a React Server Component, rendered by Node.js — compiled to
          WebAssembly and running inside your browser.
        </p>
        <p className="hint">
          Edit <code>app/page.jsx</code> and refresh to re-render.
        </p>
      </section>

      <nav className="links" aria-label="Resources">
        {RESOURCES.map((r) => (
          <a key={r.k} className="row" href={r.href} target="_blank" rel="noopener noreferrer">
            <span className="k">{r.k}</span>
            <span className="d">{r.d}</span>
            <span className="arrow" aria-hidden="true">→</span>
          </a>
        ))}
      </nav>

      <footer className="foot">
        <span>next.js on browserpod</span>
        <a className="by" href={`https://vercel.com?${UTM}`} target="_blank" rel="noopener noreferrer">
          by
          <svg viewBox="0 0 24 22" aria-hidden="true">
            <path d="M12 1 23 21H1z" fill="currentColor" />
          </svg>
          vercel
        </a>
      </footer>
    </main>
  );
}
