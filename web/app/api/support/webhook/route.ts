import { getSupportDeps } from "@/lib/support/deps";
import { errorResponse, json } from "@/lib/support/http";
import { processBachsWebhook } from "@/lib/support/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const result = await processBachsWebhook(
      rawBody,
      request.headers,
      getSupportDeps()
    );
    return json(result.status, result.body);
  } catch (error) {
    return errorResponse(error);
  }
}
