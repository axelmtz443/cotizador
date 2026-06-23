import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { catalogoInicial } from "@/lib/catalog-data";
import type { CatalogoData } from "@/types";

const CATALOG_PATH = path.join(process.cwd(), "data", "catalogo.json");

async function readCatalog(): Promise<CatalogoData> {
  try {
    const raw = await fs.readFile(CATALOG_PATH, "utf-8");
    return JSON.parse(raw) as CatalogoData;
  } catch {
    return catalogoInicial;
  }
}

async function writeCatalog(data: CatalogoData): Promise<void> {
  await fs.mkdir(path.dirname(CATALOG_PATH), { recursive: true });
  await fs.writeFile(CATALOG_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  const catalog = await readCatalog();
  return NextResponse.json(catalog);
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as CatalogoData;
    await writeCatalog(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error saving catalog" }, { status: 500 });
  }
}
