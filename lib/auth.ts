import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getUserById } from "./db";

const COOKIE = "acvm_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  return process.env.AUTH_SECRET || "";
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function sign(payload: string) {
  const key = secret();
  if (!key) throw new Error("AUTH_SECRET is not configured");
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function makeSession(userId: number, email: string) {
  const payload = Buffer.from(JSON.stringify({
    userId,
    email,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSession(token?: string | null) {
  if (!token || !secret()) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.userId || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data as { userId: number; email: string; exp: number };
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: number, email: string) {
  const jar = await cookies();
  jar.set(COOKIE, makeSession(userId, email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getCurrentUser() {
  const jar = await cookies();
  const session = readSession(jar.get(COOKIE)?.value);
  if (!session) return null;
  return getUserById(session.userId);
}
