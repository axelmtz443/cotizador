import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { catalogoInicial } from "@/lib/catalog-data";
import { getCatalogoFromNotion, saveCatalogoToNotion } from "@/lib/notion";
import type { CatalogoData } from "@/types";

export const dynamic = "force-dynamic";

const CATALOG_PATH = path.join(process.cwd(), "data", "catalogo.json");

async function readCatalogFromFs(): Promise<CatalogoData | null> {
  try {
    const raw = await fs.readFile(CATALOG_PATH, "utf-8");
    return JSON.parse(raw) as CatalogoData;
  } catch {
    return null;
  }
}

async function writeCatalogToFs(data: CatalogoData): Promise<void> {
  await fs.mkdir(path.dirname(CATALOG_PATH), { recursive: true });
  await fs.writeFile(CATALOG_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  // Notion tiene prioridad; fallback a filesystem y luego al inicial
  const fromNotion = await getCatalogoFromNotion();
  if (fromNotion) return NextResponse.json(fromNotion);

  const fromFs = await readCatalogFromFs();
  return NextResponse.json(fromFs ?? catalogoInicial);
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as CatalogoData;

    if (process.env.NOTION_CATALOGO_PAGE_ID) {
      await saveCatalogoToNotion(body);
    } else {
      await writeCatalogToFs(body);
    }

    revalidatePath("/");
    revalidatePath("/catalogo");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PUT /api/catalogo]", error);
    return NextResponse.json({ error: "Error saving catalog" }, { status: 500 });
  }
}
