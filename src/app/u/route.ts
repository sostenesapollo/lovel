import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BuildCommit = {
  hash: string;
  short: string;
  message: string;
  authored_at?: string;
};

type BuildInfo = {
  commit: string;
  commit_short: string;
  branch?: string;
  message?: string | null;
  built_at?: string;
  commits: BuildCommit[];
};

type DayGroup = { label: string; items: Array<BuildCommit & { time_label: string }> };

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadBuildInfo(): BuildInfo | null {
  const candidates = [
    join(process.cwd(), "build-info.json"),
    join(process.cwd(), "public", "build-info.json"),
    join(__dirname, "build-info.json"),
    join(__dirname, "..", "build-info.json"),
    join(__dirname, "..", "public", "build-info.json"),
  ];
  for (const path of candidates) {
    try {
      if (!existsSync(path)) continue;
      const raw = JSON.parse(readFileSync(path, "utf8")) as BuildInfo;
      if (raw?.commit) {
        return {
          commit: String(raw.commit),
          commit_short: String(raw.commit_short || raw.commit.slice(0, 7)),
          branch: raw.branch ? String(raw.branch) : undefined,
          message: raw.message ?? null,
          built_at: raw.built_at ? String(raw.built_at) : undefined,
          commits: Array.isArray(raw.commits) ? raw.commits : [],
        };
      }
    } catch {
      /* try next */
    }
  }
  const sha =
    process.env.GIT_COMMIT ||
    process.env.GIT_SHA ||
    process.env.POSTHOG_RELEASE_VERSION ||
    process.env.SOURCE_VERSION ||
    "";
  if (sha) {
    return {
      commit: sha,
      commit_short: sha.slice(0, 7),
      message: process.env.GIT_COMMIT_MESSAGE || null,
      commits: [],
    };
  }
  return null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayGroupLabel(when: Date, now: Date): string {
  const diffDays = Math.round(
    (startOfDay(now).getTime() - startOfDay(when).getTime()) / 86400000,
  );
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays >= 2 && diffDays < 7) {
    return when.toLocaleDateString("pt-BR", { weekday: "long" });
  }
  if (diffDays >= 7 && diffDays < 14) return "Semana passada";
  if (diffDays >= 14 && diffDays < 45) return "Mês passado";
  return when.toLocaleDateString("pt-BR", {
    month: "short",
    day: "numeric",
    year: when.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatCommitTime(when: Date, now: Date, group: string): string {
  const diffMs = Math.max(0, now.getTime() - when.getTime());
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  if (group === "Today") {
    if (diffMin < 1) return "agora";
    if (diffMin < 60) return `${diffMin} min atrás`;
    return `${diffH}h atrás`;
  }
  return when.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function groupCommits(commits: BuildCommit[], now = new Date()): DayGroup[] {
  const groups: DayGroup[] = [];
  const index = new Map<string, DayGroup>();
  for (const c of commits) {
    const when = c.authored_at ? new Date(c.authored_at) : null;
    const label = when && !Number.isNaN(when.getTime()) ? dayGroupLabel(when, now) : "Unknown";
    const time_label =
      when && !Number.isNaN(when.getTime()) ? formatCommitTime(when, now, label) : "—";
    let g = index.get(label);
    if (!g) {
      g = { label, items: [] };
      index.set(label, g);
      groups.push(g);
    }
    g.items.push({ ...c, time_label });
  }
  return groups;
}

function payload(uptimeSeconds: number, build: BuildInfo | null) {
  const commits = build?.commits ?? [];
  return {
    ok: true as const,
    uptime: formatUptime(uptimeSeconds),
    uptime_seconds: Math.floor(uptimeSeconds),
    started_at: new Date(Date.now() - uptimeSeconds * 1000).toISOString(),
    commit: build?.commit ?? null,
    commit_short: build?.commit_short ?? null,
    branch: build?.branch ?? null,
    message: build?.message ?? null,
    built_at: build?.built_at ?? null,
    commits,
    commit_groups: groupCommits(commits),
  };
}

function renderHtml(data: ReturnType<typeof payload>, appName: string) {
  const parts = uptimeParts(data.uptime_seconds);
  const started = data.started_at;
  const groups = data.commit_groups || [];
  const commitSection =
    groups.length > 0
      ? groups
          .map((g) => {
            const rows = g.items
              .map(
                (c) =>
                  `<li><span class="when">${escapeHtml(c.time_label)}</span><code>${escapeHtml(c.short || c.hash.slice(0, 7))}</code><span class="msg">${escapeHtml(c.message || "")}</span></li>`,
              )
              .join("");
            return `<div class="day"><h3>${escapeHtml(g.label)}</h3><ul>${rows}</ul></div>`;
          })
          .join("")
      : data.commit_short
        ? `<div class="day"><ul><li><span class="when">—</span><code>${escapeHtml(data.commit_short)}</code><span class="msg">${escapeHtml(data.message || "")}</span></li></ul></div>`
        : `<p class="empty">Sem build-info.json nesta imagem</p>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Uptime · ${escapeHtml(appName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --ink: #0f1c1a;
      --muted: #5a6f6a;
      --line: rgba(15, 28, 26, 0.08);
      --ok: #1f8a5b;
      --ok-soft: rgba(31, 138, 91, 0.14);
      --card: rgba(255, 255, 255, 0.72);
      --glow: rgba(45, 168, 138, 0.22);
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
        linear-gradient(160deg, #f3f7f5 0%, #e8efec 45%, #f7f3ea 100%);
      display: grid;
      place-items: center;
      padding: 24px;
    }
    main {
      width: min(720px, 100%);
      background: var(--card);
      backdrop-filter: blur(14px);
      border: 1px solid var(--line);
      border-radius: 28px;
      padding: 36px 32px 28px;
      box-shadow: 0 24px 60px rgba(15, 28, 26, 0.08);
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 28px;
    }
    .brand { font-size: 0.95rem; font-weight: 600; letter-spacing: 0.02em; }
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
      box-shadow: 0 0 0 0 rgba(31, 138, 91, 0.55);
      animation: pulse 1.8s ease-out infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(31, 138, 91, 0.45); }
      70% { box-shadow: 0 0 0 10px rgba(31, 138, 91, 0); }
      100% { box-shadow: 0 0 0 0 rgba(31, 138, 91, 0); }
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
      background: rgba(255,255,255,0.55);
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
    .deploy {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid var(--line);
    }
    .deploy h2 {
      margin: 0 0 12px;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--muted);
    }
    .deploy .head {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 14px;
      margin-bottom: 16px;
      font-size: 0.84rem;
      color: var(--muted);
    }
    .deploy .head code {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 0.8rem;
      color: var(--ink);
    }
    .day { margin-bottom: 16px; }
    .day h3 {
      margin: 0 0 8px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .day ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .day li {
      display: grid;
      grid-template-columns: 5.5rem 4.6rem 1fr;
      gap: 10px;
      align-items: baseline;
      font-size: 0.84rem;
      line-height: 1.35;
    }
    .day .when {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 0.72rem;
      color: var(--muted);
      white-space: nowrap;
    }
    .day code {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 0.78rem;
      color: var(--ok);
    }
    .day .msg {
      color: var(--ink);
      word-break: break-word;
    }
    .empty { color: var(--muted); font-size: 0.82rem; margin: 0; }
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
    @media (max-width: 520px) {
      main { padding: 28px 18px 22px; border-radius: 22px; }
      .grid { grid-template-columns: repeat(2, 1fr); }
      .day li { grid-template-columns: 1fr; gap: 2px; }
    }
  </style>
</head>
<body>
  <main>
    <div class="top">
      <div class="brand">${escapeHtml(appName)}</div>
      <div class="live">Online</div>
    </div>
    <h1>Process uptime</h1>
    <p class="human" id="human">${escapeHtml(data.uptime)}</p>
    <div class="grid" aria-live="polite">
      <div class="cell"><strong id="d">${parts.days}</strong><span>dias</span></div>
      <div class="cell"><strong id="h">${String(parts.hours).padStart(2, "0")}</strong><span>horas</span></div>
      <div class="cell"><strong id="m">${String(parts.minutes).padStart(2, "0")}</strong><span>mins</span></div>
      <div class="cell"><strong id="s">${String(parts.seconds).padStart(2, "0")}</strong><span>segs</span></div>
    </div>
    <section class="deploy">
      <h2>Deploy</h2>
      <div class="head">
        ${
          data.commit_short
            ? `<div>Commit <code title="${escapeHtml(data.commit || "")}">${escapeHtml(data.commit_short)}</code></div>`
            : `<div>Commit <code>—</code></div>`
        }
        ${data.branch ? `<div>Branch <code>${escapeHtml(data.branch)}</code></div>` : ""}
        ${data.built_at ? `<div>Built <code>${escapeHtml(data.built_at)}</code></div>` : ""}
      </div>
      ${commitSection}
    </section>
    <div class="meta">
      <div>Iniciado em <code id="started">${escapeHtml(started)}</code></div>
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
  const build = loadBuildInfo();
  const data = payload(uptimeSeconds, build);

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
