import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db";
import { setSessionCookie, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const user = await getUserByEmail(email);

  if (!user || !verifyPassword(password, String(user.password_hash))) {
    return NextResponse.redirect(new URL("/login?error=credentials", request.url), 303);
  }

  await setSessionCookie(Number(user.id), String(user.email));
  return NextResponse.redirect(new URL("/watchlist", request.url), 303);
}
