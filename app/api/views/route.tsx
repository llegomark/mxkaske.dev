import { Redis } from "@upstash/redis";
import { type NextRequest, NextResponse } from "next/server";

const redis = Redis.fromEnv();

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const hasSlug = searchParams.has("slug");
  const slug = hasSlug ? searchParams.get("slug") : undefined;

  const views =
    (await redis.get<number>(["pageviews", "posts", slug].join(":"))) ?? 0;

  return new NextResponse(views.toString(), { status: 200 });
}

export async function POST(request: NextRequest) {
  // Get IP from Cloudflare's specific header
  const ip = request.headers.get('CF-Connecting-IP') || 
             request.headers.get('X-Forwarded-For')?.split(',')[0] || 
             "unknown-ip";
             
  const searchParams = request.nextUrl.searchParams;
  const hasSlug = searchParams.has("slug");
  const slug = hasSlug ? searchParams.get("slug") : undefined;
  const ignore = request.cookies.get("ignore-pageviews")?.value;

  if (ignore === "true") {
    return new NextResponse("Ignored Counter", { status: 200 });
  }

  if (ip) {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(ip)
    );

    const hash = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const isNew = await redis.set(["deduplicate", hash, slug].join(":"), true, {
      nx: true,
      ex: 24 * 60 * 60, // 1d
    });

    if (!isNew) {
      return new NextResponse("Already Increased Counter", { status: 200 });
    }
  }

  if (!slug) {
    return new NextResponse("Slug Not Found", { status: 404 });
  }

  await redis.incr(["pageviews", "posts", slug].join(":"));
  return new NextResponse("Increased Counter", { status: 202 });
}