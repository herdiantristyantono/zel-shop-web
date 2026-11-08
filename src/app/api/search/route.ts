import type { NextRequest } from "next/server";
import { suggest } from "@/lib/catalog";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 60);
  const data = await suggest(q);
  return Response.json(data, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
