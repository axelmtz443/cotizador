import { NextResponse } from "next/server";
import { getPropuestas } from "@/lib/notion";

export async function GET() {
  try {
    const propuestas = await getPropuestas();
    return NextResponse.json(propuestas);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error fetching propuestas:", msg);
    return NextResponse.json(
      { error: `Notion error: ${msg}` },
      { status: 500 }
    );
  }
}
