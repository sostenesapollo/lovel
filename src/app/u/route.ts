import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatUptime(seconds: number): string {
  const total = Math.floor(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  return parts.join(" ");
}

function uptimeParts(seconds: number) {
  const total = Math.floor(seconds);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function payload(uptimeSeconds: number) {
  return {
    ok: true as const,
    uptime: formatUptime(uptimeSeconds),
    uptime_seconds: Math.floor(uptimeSeconds),
    started_at: new Date(Date.now() - uptimeSeconds * 1000).toISOString(),
  };
}

function renderHtml(data: ReturnType<typeof payload>, appName: string) {
  const parts = uptimeParts(data.uptime_seconds);
  const started = data.started_at;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Uptime · ${appName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --ink: #1a120b;
      --muted: #6b5744;
      --line: rgba(26, 18, 11, 0.08);
      --ok: #a07840;
      --ok-soft: rgba(160, 120, 64, 0.12);
      --card: rgba(255, 252, 248, 0.78);
      --glow: rgba(192, 152, 96, 0.2);
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }
    body {
      min-height: 100%;
      color: var(--ink);
      font-family: Outfit, system-ui, sans-serif;
      background:
        radial-gradient(1200px 700px at 12% -10%, var(--glow), transparent 55%),
        radial-gradient(900px 600px at 100% 0%, rgba(232, 196, 120, 0.18), transparent 50%),
        linear-gradient(160deg, #faf7f2 0%, #f2ebe0 45%, #faf7f2 100%);
      display: grid;
      place-items: center;
      padding: 24px;
    }
    main {
      width: min(560px, 100%);
      background: var(--card);
      backdrop-filter: blur(14px);
      border: 1px solid var(--line);
      border-radius: 28px;
      padding: 36px 32px 28px;
      box-shadow: 0 24px 60px rgba(26, 18, 11, 0.08);
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 28px;
    }
    .brand {
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .live {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--ok-soft);
      color: var(--ok);
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .live::before {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ok);
      box-shadow: 0 0 0 0 rgba(160, 120, 64, 0.55);
      animation: pulse 1.8s ease-out infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(160, 120, 64, 0.45); }
      70% { box-shadow: 0 0 0 10px rgba(160, 120, 64, 0); }
      100% { box-shadow: 0 0 0 0 rgba(160, 120, 64, 0); }
    }
    h1 {
      margin: 0 0 8px;
      font-size: clamp(1.05rem, 2.4vw, 1.2rem);
      font-weight: 600;
      color: var(--muted);
    }
    .human {
      margin: 0 0 28px;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: clamp(1.7rem, 5vw, 2.35rem);
      font-weight: 600;
      letter-spacing: -0.03em;
      line-height: 1.15;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .cell {
      border: 1px solid var(--line);
      background: rgba(255, 252, 248, 0.6);
      border-radius: 18px;
      padding: 14px 10px;
      text-align: center;
    }
    .cell strong {
      display: block;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: clamp(1.35rem, 4vw, 1.85rem);
      font-weight: 600;
      letter-spacing: -0.04em;
    }
    .cell span {
      display: block;
      margin-top: 4px;
      font-size: 0.72rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
    }
    .meta {
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid var(--line);
      display: flex;
      flex-wrap: wrap;
      gap: 10px 18px;
      justify-content: space-between;
      color: var(--muted);
      font-size: 0.82rem;
    }
    .meta code {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 0.78rem;
      color: var(--ink);
    }
    a.json {
      color: var(--ok);
      text-decoration: none;
      font-weight: 600;
    }
    a.json:hover { text-decoration: underline; }
    @media (max-width: 420px) {
      main { padding: 28px 18px 22px; border-radius: 22px; }
      .grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <main>
    <div class="top">
      <div class="brand">${appName}</div>
      <div class="live">Online</div>
    </div>
    <h1>Process uptime</h1>
    <p class="human" id="human">${data.uptime}</p>
    <div class="grid" aria-live="polite">
      <div class="cell"><strong id="d">${parts.days}</strong><span>dias</span></div>
      <div class="cell"><strong id="h">${String(parts.hours).padStart(2, "0")}</strong><span>horas</span></div>
      <div class="cell"><strong id="m">${String(parts.minutes).padStart(2, "0")}</strong><span>mins</span></div>
      <div class="cell"><strong id="s">${String(parts.seconds).padStart(2, "0")}</strong><span>segs</span></div>
    </div>
    <div class="meta">
      <div>Iniciado em <code id="started">${started}</code></div>
      <a class="json" href="?json=1">JSON</a>
    </div>
  </main>
  <script>
    const startedAt = new Date(${JSON.stringify(started)}).getTime();
    function pad(n) { return String(n).padStart(2, "0"); }
    function tick() {
      const total = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      const days = Math.floor(total / 86400);
      const hours = Math.floor((total % 86400) / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const secs = total % 60;
      const parts = [];
      if (days > 0) parts.push(days + "d");
      if (hours > 0 || days > 0) parts.push(hours + "h");
      if (minutes > 0 || hours > 0 || days > 0) parts.push(minutes + "m");
      parts.push(secs + "s");
      document.getElementById("human").textContent = parts.join(" ");
      document.getElementById("d").textContent = String(days);
      document.getElementById("h").textContent = pad(hours);
      document.getElementById("m").textContent = pad(minutes);
      document.getElementById("s").textContent = pad(secs);
    }
    tick();
    setInterval(tick, 1000);
  </script>
</body>
</html>`;
}

function wantsJson(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("json") === "1") return true;
  if (url.searchParams.get("format") === "json") return true;
  const accept = request.headers.get("accept") || "";
  return accept.includes("application/json") && !accept.includes("text/html");
}

const APP_NAME = process.env.UPTIME_APP_NAME || "LOVEL";

export async function GET(request: Request) {
  const uptimeSeconds = process.uptime();
  const data = payload(uptimeSeconds);

  if (wantsJson(request)) {
    return NextResponse.json(data);
  }

  return new NextResponse(renderHtml(data, APP_NAME), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
