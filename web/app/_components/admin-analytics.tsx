"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

const KEY_STORAGE = "aleph_admin_key";

interface DailySeriesPoint {
  date: string;
  visit: number;
  game_play: number;
  download: number;
}

interface AnalyticsPayload {
  window_days: number;
  visitors: {
    total_unique_all_time: number;
    unique_last_window: number;
    events_today: number;
    events_last_7d: number;
    events_total: number;
  };
  downloads: {
    total: number;
    today: number;
    last_7d: number;
    last_30d: number;
    by_platform: Record<string, number>;
  };
  game_plays: {
    total: number;
    today: number;
    last_7d: number;
  };
  daily_series: DailySeriesPoint[];
  generated_at: string;
}

function num(n: number | undefined): string {
  return (n ?? 0).toLocaleString();
}

function platformSummary(by: Record<string, number> | undefined): string {
  if (!by) return "";
  const parts = Object.entries(by).map(([p, n]) => `${p} ${num(n)}`);
  return parts.length ? parts.join(" · ") : "no downloads yet";
}

function Card({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--secondary)] p-5">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        {title}
      </h2>
      <div className="text-3xl font-bold leading-none">{value}</div>
      <div className="mt-2 text-xs leading-snug text-[var(--muted-foreground)]">
        {detail}
      </div>
    </div>
  );
}

function DailyChart({ series }: { series: DailySeriesPoint[] }) {
  const W = 700;
  const H = 220;
  const padTop = 10;
  const padBottom = 22;
  const innerH = H - padTop - padBottom;
  const slot = W / Math.max(1, series.length);
  const barW = Math.min(22, slot / 4.2);
  const max = Math.max(
    1,
    ...series.flatMap((s) => [s.visit, s.game_play, s.download])
  );
  const y = (v: number) => padTop + innerH - (v / max) * (innerH - 4);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--secondary)] p-5">
      <h3 className="mb-3 text-base font-semibold">Daily Activity</h3>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-[var(--muted-foreground)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-blue-500" />
          Visits
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-orange-500" />
          Game Plays
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-emerald-500" />
          Downloads
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-56 w-full"
        preserveAspectRatio="none"
      >
        {series.map((s) => {
          const cx = series.indexOf(s) * slot + slot / 2;
          const bar = (offset: number, v: number, color: string) => (
            <rect
              key={`${s.date}-${offset}`}
              x={cx + offset - barW / 2}
              y={y(v)}
              width={barW}
              height={padTop + innerH - y(v)}
              rx={3}
              fill={color}
            />
          );
          return (
            <g key={s.date}>
              {bar(-barW * 1.05, s.visit, "#3b82f6")}
              {bar(0, s.game_play, "#f97316")}
              {bar(barW * 1.05, s.download, "#10b981")}
              <text
                x={cx}
                y={H - 6}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
                opacity={0.4}
              >
                {s.date.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function AdminAnalytics() {
  const [key, setKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void (async () => {
      const stored = sessionStorage.getItem(KEY_STORAGE);
      if (stored) setKey(stored);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!key) return;
    try {
      const res = await fetch("/api/analytics?days=7", {
        headers: { "X-Admin-Key": key },
        cache: "no-store",
      });
      if (res.status === 401) {
        sessionStorage.removeItem(KEY_STORAGE);
        setKey(null);
        setError("Admin key rejected. Enter it again.");
        return;
      }
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch {
      setError("Failed to load analytics. Try again.");
    }
  }, [key]);

  useEffect(() => {
    if (!key) return;
    void (async () => {
      await load();
      intervalRef.current = setInterval(load, 30000);
    })();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [key, load]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setBusy(true);
    sessionStorage.setItem(KEY_STORAGE, trimmed);
    setKey(trimmed);
    setBusy(false);
  };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Aleph Analytics</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Auto-refreshes every 30s
          {data
            ? ` · generated ${new Date(data.generated_at).toLocaleString()}`
            : ""}
        </p>
      </header>

      {!key && (
        <form
          onSubmit={submit}
          className="mx-auto max-w-md rounded-2xl border border-[var(--border)] bg-[var(--secondary)] p-6"
        >
          <h2 className="mb-2 text-lg font-semibold">Admin Access</h2>
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            Enter the admin key (ADMIN_KEY env var). It is kept in this tab
            only and never stored on any server.
          </p>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
            placeholder="Admin key"
          />
          <button
            type="submit"
            disabled={busy || !keyInput.trim()}
            className="mt-4 w-full cursor-pointer rounded-full bg-[var(--primary)] px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Open dashboard
          </button>
        </form>
      )}

      {key && error && (
        <div className="rounded-2xl border border-red-500/40 p-6 text-red-500">
          {error}
        </div>
      )}

      {key && !error && !data && <p className="opacity-50">Loading…</p>}

      {key && data && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card
              title="Total Visitors"
              value={num(data.visitors.total_unique_all_time)}
              detail={`${num(
                data.visitors.unique_last_window
              )} unique in ${data.window_days}d · ${num(
                data.visitors.events_today
              )} visits today`}
            />
            <Card
              title="Downloads"
              value={num(data.downloads.total)}
              detail={`${num(data.downloads.today)} today · ${num(
                data.downloads.last_7d
              )} last 7d · ${platformSummary(data.downloads.by_platform)}`}
            />
            <Card
              title="Game Plays"
              value={num(data.game_plays.total)}
              detail={`${num(data.game_plays.today)} today · ${num(
                data.game_plays.last_7d
              )} last 7d`}
            />
          </div>
          <DailyChart series={data.daily_series} />
        </div>
      )}
    </main>
  );
}
