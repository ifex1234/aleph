import { getSupportDeps } from "@/lib/support/deps";
import { errorResponse, json, readJsonObject } from "@/lib/support/http";
import { getSupportOrderStatus } from "@/lib/support/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const order = await getSupportOrderStatus(body.token, getSupportDeps());
    return json(200, { order });
  } catch (error) {
    return errorResponse(error);
  }
}
