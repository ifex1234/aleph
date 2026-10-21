import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../db";
import { analyticsEvents } from "../../../db/schema";

const ALLOWED_EVENT_TYPES = new Set(["visit", "download", "game_play"]);

function hourBucket(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  return `${y}${m}${d}${h}`;
}

/**
 * POST /api/track?event_type=visit|download|game_play&anon_id=<uuid>&platform=<str>
 *
 * Public, anonymous, fire-and-forget. Dedupe via unique dedupe_key:
 *   - visit:    visit:<yyyymmddhh>:<anon_id>   (1 per visitor per hour)
 *   - download: download:<platform>:<anon_id>  (1 per device per platform)
 *   - game_play: no dedupe
 */
export async function POST(request: NextRequest) {
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

  const params = request.nextUrl.searchParams;
  const eventType = params.get("event_type") ?? "";
  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    return NextResponse.json(
      { error: "event_type must be one of: download, game_play, visit" },
      { status: 422 }
    );
  }
  const anonId = params.get("anon_id")?.slice(0, 64) || null;
  const platform = params.get("platform")?.slice(0, 16) || null;

  let dedupeKey: string | null = null;
  if (anonId) {
    if (eventType === "visit") {
      dedupeKey = `visit:${hourBucket(new Date())}:${anonId}`;
    } else if (eventType === "download") {
      dedupeKey = `download:${platform ?? "any"}:${anonId}`;
    }
  }

  const inserted = await db
    .insert(analyticsEvents)
    .values({ eventType, anonId, platform, dedupeKey })
    .onConflictDoNothing({ target: analyticsEvents.dedupeKey })
    .returning({ id: analyticsEvents.id });

  return NextResponse.json(
    { status: inserted.length > 0 ? "recorded" : "already_counted" },
    { status: 202 }
  );
}
