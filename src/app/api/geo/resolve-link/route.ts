import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveGoogleMapsLink } from "@/lib/geo-server";
import { parseGoogleMapsUrl } from "@/lib/geo";
import { checkRateLimit } from "@/lib/rate-limiter";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 1. Authentication check
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "STAFF" &&
      session.user.role !== "OWNER" &&
      session.user.role !== "ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit check
  const clientKey =
    session.user.id ||
    session.user.email ||
    req.headers.get("x-forwarded-for") ||
    "anonymous";

  if (!checkRateLimit(clientKey, 15, 60000)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait a minute." },
      { status: 429 }
    );
  }

  // 3. Body parsing
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || !("url" in body) || typeof body.url !== "string") {
    return NextResponse.json(
      { error: "Missing required 'url' string parameter" },
      { status: 400 }
    );
  }

  const rawUrl = body.url.trim();
  if (!rawUrl) {
    return NextResponse.json(
      { error: "URL parameter cannot be empty" },
      { status: 400 }
    );
  }

  // 4. Resolve link and return ONLY { lat, lng }
  try {
    // Fast path: direct coordinates in string
    const directCoords = parseGoogleMapsUrl(rawUrl);
    if (directCoords) {
      return NextResponse.json({
        lat: directCoords.lat,
        lng: directCoords.lng,
      });
    }

    const coords = await resolveGoogleMapsLink(rawUrl);
    return NextResponse.json({
      lat: coords.lat,
      lng: coords.lng,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to resolve link";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
