import CotizadorForm from "@/components/CotizadorForm";
import { catalogoInicial } from "@/lib/catalog-data";
import { getCotizacionDatos, getCatalogoFromNotion, saveCatalogoToNotion } from "@/lib/notion";
import { promises as fs } from "fs";
import path from "path";
import type { CatalogoData, CotizacionSnapshot } from "@/types";

export const dynamic = "force-dynamic";

async function getCatalogo(): Promise<CatalogoData> {
  if (process.env.NOTION_CATALOGO_PAGE_ID) {
    const fromNotion = await getCatalogoFromNotion();
    if (fromNotion) return fromNotion;
    // Auto-seed: primera carga con Notion vacío
    try { await saveCatalogoToNotion(catalogoInicial); } catch {}
    return catalogoInicial;
  }
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "catalogo.json"), "utf-8");
    return JSON.parse(raw) as CatalogoData;
  } catch {
    return catalogoInicial;
  }
}

export default async function CotizadorPage({
  searchParams,
}: {
  searchParams: { cot?: string };
}) {
  const catalogo = await getCatalogo();

  let initialData: CotizacionSnapshot | undefined;
  if (searchParams.cot) {
    const snapshot = await getCotizacionDatos(searchParams.cot);
    if (snapshot) initialData = snapshot;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Cotizador de proyectos</h1>
        <p className="text-sm text-xeryus-muted mt-1">Investigación de Mercado · XERYUS</p>
      </div>
      <CotizadorForm
        catalogo={catalogo}
        initialData={initialData}
        cotizacionId={searchParams.cot}
      />
    </div>
  );
}
