import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const name = String(form.get("name") || "").trim();
  const password = String(form.get("password") || "");

  if (!email.includes("@") || password.length < 8) {
    return NextResponse.redirect(new URL("/register?error=invalid", request.url), 303);
  }

  const user = await createUser(email, name, hashPassword(password));
  if (!user) return NextResponse.redirect(new URL("/login?error=exists", request.url), 303);

  await setSessionCookie(Number(user.id), String(user.email));
  return NextResponse.redirect(new URL("/watchlist", request.url), 303);
}
