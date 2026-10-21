import { getSupportDeps } from "@/lib/support/deps";
import { errorResponse, json, readJsonObject } from "@/lib/support/http";
import { resumeSupportCheckout } from "@/lib/support/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const result = await resumeSupportCheckout(body.token, getSupportDeps());
    return json(result.pending ? 202 : 200, result);
  } catch (error) {
    return errorResponse(error);
  }
}
