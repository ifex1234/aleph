import { NextRequest, NextResponse } from "next/server";
import { and, count, countDistinct, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { analyticsEvents } from "../../../db/schema";

const ALL_EVENT_TYPES = ["visit", "download", "game_play"];

function requireAdmin(request: NextRequest): NextResponse | null {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json(
      { error: "analytics not configured (set ADMIN_KEY)" },
      { status: 503 }
    );
  }
  if (request.headers.get("x-admin-key") !== adminKey) {
    return NextResponse.json({ error: "invalid admin key" }, { status: 401 });
  }
  return null;
}

function dayStart(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * GET /api/analytics?days=7  (header: X-Admin-Key)
 *
 * Aggregated stats for the Aleph marketing site dashboard: total visitors,
 * downloads (total + per platform), game plays, and a daily series.
 */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let db;
  try {
    const got = getDb();
    db = got.db;
    await got.ready;
  } catch {
    return NextResponse.json(
      { error: "analytics not configured" },
      { status: 503 }
    );
  }

  let days = Number(request.nextUrl.searchParams.get("days") ?? 7);
  if (!Number.isFinite(days)) days = 7;
  days = Math.max(1, Math.min(days, 90));

  const now = new Date();
  const todayStart = dayStart(now);
  const daysAgo = (d: number) =>
    new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  const countFor = async (eventType: string, since?: Date) => {
    const conditions = [eq(analyticsEvents.eventType, eventType)];
    if (since) conditions.push(gte(analyticsEvents.createdAt, since));
    const [row] = await db
      .select({ n: count() })
      .from(analyticsEvents)
      .where(and(...conditions));
    return Number(row.n);
  };

  const [
    totalUniqueAllTime,
    uniqueLastWindow,
    eventsToday,
    eventsLast7d,
    eventsTotal,
    downloadsTotal,
    downloadsToday,
    downloadsLast7d,
    downloadsLast30d,
    gamePlaysTotal,
    gamePlaysToday,
    gamePlaysLast7d,
  ] = await Promise.all([
    db
      .select({ n: countDistinct(analyticsEvents.anonId) })
      .from(analyticsEvents)
      .where(eq(analyticsEvents.eventType, "visit")),
    db
      .select({ n: countDistinct(analyticsEvents.anonId) })
      .from(analyticsEvents)
      .where(
        and(
          inArray(analyticsEvents.eventType, ["visit", "game_play"]),
          gte(analyticsEvents.createdAt, daysAgo(days))
        )
      ),
    countFor("visit", todayStart),
    countFor("visit", daysAgo(7)),
    countFor("visit"),
    countFor("download"),
    countFor("download", todayStart),
    countFor("download", daysAgo(7)),
    countFor("download", daysAgo(30)),
    countFor("game_play"),
    countFor("game_play", todayStart),
    countFor("game_play", daysAgo(7)),
  ]);

  const platformRows = await db
    .select({ platform: analyticsEvents.platform, n: count() })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.eventType, "download"),
        isNotNull(analyticsEvents.platform)
      )
    )
    .groupBy(analyticsEvents.platform);
  const byPlatform: Record<string, number> = {};
  for (const row of platformRows) {
    if (row.platform) byPlatform[row.platform] = Number(row.n);
  }

  const seriesStart = new Date(todayStart.getTime() - (days - 1) * 86400000);
  const seriesRows = await db
    .select({
      day: sql<string>`date_trunc('day', ${analyticsEvents.createdAt})::date`,
      eventType: analyticsEvents.eventType,
      n: count(),
    })
    .from(analyticsEvents)
    .where(
      and(
        gte(analyticsEvents.createdAt, seriesStart),
        inArray(analyticsEvents.eventType, ALL_EVENT_TYPES)
      )
    )
    .groupBy(sql`date_trunc('day', ${analyticsEvents.createdAt})::date`, analyticsEvents.eventType);

  const lookup = new Map<string, number>(
    seriesRows.map((r) => [`${isoDay(new Date(r.day))}:${r.eventType}`, Number(r.n)])
  );
  const dailySeries = Array.from({ length: days }, (_, i) => {
    const day = isoDay(new Date(seriesStart.getTime() + i * 86400000));
    return {
      date: day,
      visit: lookup.get(`${day}:visit`) ?? 0,
      game_play: lookup.get(`${day}:game_play`) ?? 0,
      download: lookup.get(`${day}:download`) ?? 0,
    };
  });

  return NextResponse.json({
    window_days: days,
    visitors: {
      total_unique_all_time: Number(totalUniqueAllTime[0].n),
      unique_last_window: Number(uniqueLastWindow[0].n),
      events_today: eventsToday,
      events_last_7d: eventsLast7d,
      events_total: eventsTotal,
    },
    downloads: {
      total: downloadsTotal,
      today: downloadsToday,
      last_7d: downloadsLast7d,
      last_30d: downloadsLast30d,
      by_platform: byPlatform,
    },
    game_plays: {
      total: gamePlaysTotal,
      today: gamePlaysToday,
      last_7d: gamePlaysLast7d,
    },
    daily_series: dailySeries,
    generated_at: now.toISOString(),
  });
}
