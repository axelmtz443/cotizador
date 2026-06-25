import CatalogoManager from "@/components/CatalogoManager";
import { catalogoInicial } from "@/lib/catalog-data";
import { getCatalogoFromNotion } from "@/lib/notion";
import { promises as fs } from "fs";
import path from "path";
import type { CatalogoData } from "@/types";

export const dynamic = "force-dynamic";

async function getCatalogo(): Promise<CatalogoData> {
  const fromNotion = await getCatalogoFromNotion();
  if (fromNotion) return fromNotion;
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "data", "catalogo.json"),
      "utf-8"
    );
    return JSON.parse(raw) as CatalogoData;
  } catch {
    return catalogoInicial;
  }
}

export default async function CatalogoPage() {
  const catalogo = await getCatalogo();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          Catálogo de servicios
        </h1>
        <p className="text-sm text-xeryus-muted mt-1">
          {catalogo.servicios.length} servicios en {catalogo.categorias.length} categorías
        </p>
      </div>
      <CatalogoManager initialCatalogo={catalogo} />
    </div>
  );
}
