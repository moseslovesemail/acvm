import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addWatchlist, removeWatchlist } from "@/lib/db";

function safeReturn(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/watchlist";
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const action = String(form.get("action") || "add");
  const returnTo = safeReturn(String(form.get("returnTo") || "/watchlist"));

  if (action === "remove") {
    await removeWatchlist(Number(user.id), Number(form.get("id") || 0));
    return NextResponse.redirect(new URL(returnTo, request.url), 303);
  }

  const entityType = String(form.get("entityType") || "");
  const entityValue = String(form.get("entityValue") || "").trim();
  const label = String(form.get("label") || entityValue).trim();
  if (!["product","registrant","ingredient"].includes(entityType) || !entityValue) {
    return NextResponse.redirect(new URL("/watchlist?error=invalid", request.url), 303);
  }

  try {
    await addWatchlist(Number(user.id), entityType, entityValue, label);
    return NextResponse.redirect(new URL(returnTo, request.url), 303);
  } catch (error) {
    const code = error instanceof Error && error.message.includes("limit") ? "limit" : "save";
    return NextResponse.redirect(new URL("/watchlist?error=" + code, request.url), 303);
  }
}
