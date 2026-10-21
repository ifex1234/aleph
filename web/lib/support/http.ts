import { NextResponse } from "next/server";
import { SupportError } from "./errors";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(status: number, body: unknown) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export function errorResponse(error: unknown) {
  if (error instanceof SupportError) {
    return json(error.status, { error: error.message });
  }
  console.error(
    "support: unhandled error:",
    error instanceof Error ? error.message : String(error)
  );
  return json(500, { error: "Something went wrong. Please try again." });
}

export async function readJsonObject(
  request: Request
): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new SupportError(400, "Invalid request body");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new SupportError(400, "Invalid request body");
  }
  return body as Record<string, unknown>;
}
