import { notion } from "@/lib/notion";
import { isFullPage } from "@notionhq/client";
import { formatMXN } from "@/lib/pricing";

export const dynamic = "force-dynamic";

interface CotizacionRow {
  id: string;
  nombre: string;
  cliente: string;
  empresa: string;
  clase: string;
  totalCostos: number;
  precioFinal: number;
  utilidad: number;
  fecha: string;
  notionUrl: string;
}

async function getCotizaciones(): Promise<CotizacionRow[]> {
  const dbId = process.env.NOTION_COTIZACIONES_DB_ID;
  if (!dbId) return [];

  try {
    const response = await notion.databases.query({
      database_id: dbId,
      sorts: [{ property: "Fecha", direction: "descending" }],
      page_size: 50,
    });

    return response.results
      .filter(isFullPage)
      .map((page) => {
        const props = page.properties as Record<string, unknown>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getTitle = (k: string): string => {
          const p = props[k] as any;
          if (!p || !Array.isArray(p.title)) return "";
          return (p.title as Array<{ plain_text: string }>).map((t) => t.plain_text).join("");
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getAny = (k: string): any => props[k];

        const getNum = (k: string): number => {
          const p = getAny(k);
          // Campo directo de tipo number
          if (typeof p?.number === "number") return p.number;
          // Rollup que agrega números
          if (p?.type === "rollup" && typeof p?.rollup?.number === "number") return p.rollup.number;
          return 0;
        };
        const getDate = (k: string): string => {
          const p = getAny(k);
          return p?.date?.start ?? "";
        };
        // Lee texto desde rich_text, fórmula string o rollup array
        const getTextFlexible = (k: string): string => {
          const p = getAny(k);
          if (!p) return "";
          if (Array.isArray(p.rich_text)) return p.rich_text.map((t: any) => t.plain_text).join("");
          if (p.type === "formula" && typeof p.formula?.string === "string") return p.formula.string;
          if (p.type === "rollup" && Array.isArray(p.rollup?.array)) {
            return p.rollup.array
              .flatMap((item: any) => item.rich_text ?? item.title ?? [])
              .map((t: any) => t.plain_text ?? "")
              .join(", ");
          }
          return "";
        };
        // Lee clase desde rollup select o select directo
        const getClase = (): string => {
          const p = getAny("Clase");
          if (!p) return "";
          if (p.type === "select") return p.select?.name ?? "";
          if (p.type === "rollup" && Array.isArray(p.rollup?.array)) {
            return p.rollup.array.map((item: any) => item.select?.name ?? "").filter(Boolean).join(", ");
          }
          return "";
        };

        return {
          id: page.id,
          nombre: getTitle("Nombre"),
          cliente: getTextFlexible("Cliente"),
          empresa: getTextFlexible("Empresa"),
          clase: getClase(),
          totalCostos: getNum("Total Costos"),
          precioFinal: getNum("Precio Final"),
          utilidad: getNum("Utilidad $"),
          fecha: getDate("Fecha"),
          notionUrl: `https://www.notion.so/${page.id.replace(/-/g, "")}`,
        };
      });
  } catch {
    return [];
  }
}

export default async function HistorialPage() {
  const cotizaciones = await getCotizaciones();
  const dbId = process.env.NOTION_COTIZACIONES_DB_ID;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          Historial de cotizaciones
        </h1>
        <p className="text-sm text-xeryus-muted mt-1">
          {cotizaciones.length} cotización{cotizaciones.length !== 1 ? "es" : ""} registrada
          {cotizaciones.length !== 1 ? "s" : ""}
        </p>
      </div>

      {!dbId && (
        <div className="bg-yellow-950/30 border border-yellow-800/50 text-yellow-400 rounded-xl p-4 text-sm mb-6">
          <strong>Configura NOTION_COTIZACIONES_DB_ID</strong> en tu archivo{" "}
          <code className="font-mono bg-yellow-900/30 px-1 rounded">.env.local</code> para ver el historial.
        </div>
      )}

      {cotizaciones.length === 0 && dbId && (
        <div className="card p-8 text-center text-xeryus-muted">
          No hay cotizaciones registradas aún.
        </div>
      )}

      {cotizaciones.length > 0 && (
        <div className="card overflow-hidden">
          <div className="section-header">
            <span className="w-2 h-2 rounded-full bg-xeryus-red" />
            Cotizaciones
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-xeryus-border">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider">
                    No. Cotización
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider">
                    Cliente / Empresa
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider">
                    Clase
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider">
                    Costo total
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider">
                    Precio final
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider">
                    Utilidad
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {cotizaciones.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-xeryus-border hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-xeryus-red">
                      {c.nombre}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{c.cliente}</p>
                      <p className="text-xs text-xeryus-muted">{c.empresa}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        c.clase.includes("A") ? "bg-xeryus-red/20 text-xeryus-red border border-xeryus-redDark"
                        : c.clase.includes("B") ? "bg-orange-900/30 text-orange-400 border border-orange-800"
                        : "bg-white/10 text-white/60 border border-white/20"
                      }`}>
                        {c.clase || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xeryus-muted tabular-nums">{formatMXN(c.totalCostos)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white tabular-nums">{formatMXN(c.precioFinal)}</td>
                    <td className="px-4 py-3 text-right text-green-400 font-semibold tabular-nums">{formatMXN(c.utilidad)}</td>
                    <td className="px-4 py-3 text-center text-xeryus-muted text-xs">
                      {c.fecha ? new Date(c.fecha).toLocaleDateString("es-MX") : "—"}
                    </td>
                    <td className="px-4 py-3 flex flex-col gap-1.5 items-start">
                      <a
                        href={`/?cot=${c.id}`}
                        className="text-xeryus-red hover:text-white text-xs font-semibold hover:underline transition-colors"
                      >
                        Abrir →
                      </a>
                      <a href={c.notionUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xeryus-muted hover:text-xeryus-red text-xs font-medium hover:underline transition-colors">
                        Notion ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
