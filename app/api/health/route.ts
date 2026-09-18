import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok:true, service:"acvm-signal", time:new Date().toISOString() });
}
