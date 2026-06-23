import { Client, isFullPage } from "@notionhq/client";
import type { Propuesta, CotizacionData } from "@/types";

export const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

export async function getPropuestas(): Promise<Propuesta[]> {
  const dbId = process.env.NOTION_PROPUESTAS_DB_ID;
  if (!dbId) throw new Error("NOTION_PROPUESTAS_DB_ID no configurado");

  const response = await notion.databases.query({
    database_id: dbId,
    sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
    page_size: 100,
  });

  const pages = response.results.filter(isFullPage);

  // Contacto es una Relación → recoger IDs únicos y resolverlos en paralelo
  const contactIds = new Set<string>();
  for (const page of pages) {
    const rel = (page.properties["Contacto"] as Record<string, unknown> | undefined);
    if (rel?.type === "relation" && Array.isArray(rel.relation)) {
      (rel.relation as Array<{ id: string }>).forEach((r) => contactIds.add(r.id));
    }
  }

  const contactMap = new Map<string, string>();
  if (contactIds.size > 0) {
    const fetched = await Promise.all(
      [...contactIds].map(async (id) => {
        try {
          const page = await notion.pages.retrieve({ page_id: id });
          return { id, page };
        } catch (err) {
          console.error(`[Notion] No se pudo obtener contacto ${id}:`, err);
          return { id, page: null };
        }
      })
    );
    for (const { id, page } of fetched) {
      if (!page) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = (page as any).properties as Record<string, any> | undefined;
      if (!props) continue;
      // Buscar la propiedad de tipo title (el nombre del contacto)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const titleProp = Object.values(props).find((p: any) => p?.type === "title") as any;
      if (titleProp?.title) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const name = (titleProp.title as any[]).map((t: any) => t?.plain_text ?? "").join("").trim();
        console.log(`[Notion] Contacto ${id} → "${name}"`);
        if (name) contactMap.set(id, name);
      } else {
        console.warn(`[Notion] Contacto ${id}: no se encontró propiedad title. Props:`, Object.keys(props));
      }
    }
  }

  return pages.map((page) => {
    const props = page.properties as Record<string, unknown>;

    // Resolver Contacto desde la relación
    const relProp = props["Contacto"] as Record<string, unknown> | undefined;
    let contacto = "";
    if (relProp?.type === "relation" && Array.isArray(relProp.relation)) {
      contacto = (relProp.relation as Array<{ id: string }>)
        .map((r) => contactMap.get(r.id) ?? "")
        .filter(Boolean)
        .join(", ");
    } else {
      contacto = getTextProp(props, "Contacto");
    }

    return {
      id: page.id,
      titulo: getTextProp(props, "Título de Propuesta") || "Sin título",
      empresa: getTextProp(props, "Empresa") || "",
      contacto,
      estado: getStatusOrSelectProp(props, "Estado"),
      proyecto: getTextProp(props, "Proyecto") || "",
      categoria: getStatusOrSelectProp(props, "Categoría"),
      uen: getStatusOrSelectProp(props, "UEN"),
      sector: getStatusOrSelectProp(props, "Sector"),
      ubicacion: getTextProp(props, "Ubicación") || "",
      lastEdited: page.last_edited_time,
    };
  });
}

export async function updatePropuestaPrecio(
  pageId: string,
  precioFinal: number,
  utilidadDinero: number
): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      "Precio": { number: precioFinal },
      "Utilidad $": { number: utilidadDinero },
    },
  });
}

export async function agregarDesgloseAPropuesta(
  propuestaPageId: string,
  cotizacion: CotizacionData
): Promise<void> {
  const filas = cotizacion.filas.filter((f) => f.servicio !== null);
  const markupPct = cotizacion.totalCostos > 0
    ? ((cotizacion.utilidadDinero / cotizacion.totalCostos) * 100).toFixed(1)
    : "0.0";

  const txt = (s: string) => [{ type: "text" as const, text: { content: s } }];

  const costoLines = [
    `Servicios:     $${cotizacion.subtotalServicios.toLocaleString("es-MX")}`,
    cotizacion.costoPlazas > 0 ? `Plazas (${cotizacion.plazas}):   $${cotizacion.costoPlazas.toLocaleString("es-MX")}` : null,
    `Project Mgr:   $${cotizacion.costoProjectManager.toLocaleString("es-MX")}`,
    `Presentación:  $${cotizacion.costoPresentacion.toLocaleString("es-MX")}`,
    `Dirección:     $${cotizacion.costoParticipacion.toLocaleString("es-MX")}`,
    `─────────────────────`,
    `Total costos:  $${cotizacion.totalCostos.toLocaleString("es-MX")}`,
  ].filter(Boolean).join("\n");

  const precioLines = [
    `Utilidad (${(cotizacion.utilidadPct * 100).toFixed(1)}%): $${cotizacion.utilidadDinero.toLocaleString("es-MX")}`,
    `Markup: ${markupPct}%`,
    `PRECIO FINAL: $${cotizacion.precioFinal.toLocaleString("es-MX")}`,
  ].join("\n");

  await notion.blocks.children.append({
    block_id: propuestaPageId,
    children: [
      { object: "block", type: "divider", divider: {} },
      {
        object: "block", type: "heading_2",
        heading_2: { rich_text: txt(`Cotización ${cotizacion.numeroCotizacion} · ${cotizacion.fecha}`) },
      },
      {
        object: "block", type: "paragraph",
        paragraph: { rich_text: txt(`Cliente: ${cotizacion.cliente} | Empresa: ${cotizacion.empresa} | Clase: ${cotizacion.clase}`) },
      },
      {
        object: "block", type: "heading_3",
        heading_3: { rich_text: txt("Servicios") },
      },
      ...filas.map((f) => ({
        object: "block" as const, type: "bulleted_list_item" as const,
        bulleted_list_item: { rich_text: txt(`${f.servicio!.nombre} × ${f.cantidad} = $${f.total.toLocaleString("es-MX")}`) },
      })),
      {
        object: "block", type: "heading_3",
        heading_3: { rich_text: txt("Costos") },
      },
      { object: "block", type: "paragraph", paragraph: { rich_text: txt(costoLines) } },
      { object: "block", type: "paragraph", paragraph: { rich_text: txt(precioLines) } },
      ...(cotizacion.notas ? [{
        object: "block" as const, type: "paragraph" as const,
        paragraph: { rich_text: txt(`Notas: ${cotizacion.notas}`) },
      }] : []),
    ],
  });
}

export async function getCotizacionesDb(): Promise<string | null> {
  return process.env.NOTION_COTIZACIONES_DB_ID || null;
}

export async function crearRegistroEnCotizacionesDb(
  cotizacion: CotizacionData,
  propuestaPageId: string
): Promise<string> {
  const dbId = process.env.NOTION_COTIZACIONES_DB_ID;
  if (!dbId) throw new Error("NOTION_COTIZACIONES_DB_ID no configurado");

  const desgloseTexto = cotizacion.filas
    .filter((f) => f.servicio !== null)
    .map((f) => `${f.servicio!.nombre} × ${f.cantidad} = $${f.total.toLocaleString("es-MX")}`)
    .join("\n");

  const page = await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      "Nombre": {
        title: [{ text: { content: cotizacion.numeroCotizacion } }],
      },
      "Total Costos": {
        number: cotizacion.totalCostos,
      },
      "Precio Final": {
        number: cotizacion.precioFinal,
      },
      "Utilidad $": {
        number: cotizacion.utilidadDinero,
      },
      "Fecha": {
        date: { start: cotizacion.fecha },
      },
      "Propuesta": {
        relation: [{ id: propuestaPageId }],
      },
      // "Desglose": cambiar tipo a Texto en Notion para activar esta línea
      // "Desglose": { rich_text: [{ text: { content: desgloseTexto.slice(0, 2000) } }] },
      ...(cotizacion.notas ? {
        "Notas": {
          rich_text: [{ text: { content: cotizacion.notas } }],
        },
      } : {}),
    },
  });

  return page.id;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function getTextProp(props: Record<string, unknown>, key: string): string {
  const prop = props[key] as Record<string, unknown> | undefined;
  if (!prop) return "";
  if (prop.type === "title" && Array.isArray(prop.title)) {
    return (prop.title as Array<{ plain_text: string }>).map((t) => t.plain_text).join("");
  }
  if (prop.type === "rich_text" && Array.isArray(prop.rich_text)) {
    return (prop.rich_text as Array<{ plain_text: string }>).map((t) => t.plain_text).join("");
  }
  if (prop.type === "people" && Array.isArray(prop.people)) {
    return (prop.people as Array<{ name?: string }>).map((p) => p.name ?? "").join(", ");
  }
  if (prop.type === "formula") {
    const f = prop.formula as Record<string, unknown> | undefined;
    if (typeof f?.string === "string") return f.string;
    if (typeof f?.number === "number") return String(f.number);
  }
  if (prop.type === "rollup") {
    const r = prop.rollup as Record<string, unknown> | undefined;
    if (typeof r?.string === "string") return r.string;
    if (Array.isArray(r?.array)) {
      return (r!.array as Array<Record<string, unknown>>)
        .map((item) => {
          if (Array.isArray(item.title)) return (item.title as Array<{ plain_text: string }>).map((t) => t.plain_text).join("");
          if (Array.isArray(item.rich_text)) return (item.rich_text as Array<{ plain_text: string }>).map((t) => t.plain_text).join("");
          if (item.type === "people" && Array.isArray(item.people)) return (item.people as Array<{ name?: string }>).map((p) => p.name ?? "").join(", ");
          return "";
        })
        .filter(Boolean)
        .join(", ");
    }
  }
  if (prop.type === "email" && typeof prop.email === "string") return prop.email;
  if (prop.type === "phone_number" && typeof prop.phone_number === "string") return prop.phone_number;
  if (prop.type === "url" && typeof prop.url === "string") return prop.url;
  return "";
}

function getSelectProp(props: Record<string, unknown>, key: string): string {
  const prop = props[key] as Record<string, unknown> | undefined;
  if (!prop) return "";
  if (prop.type === "select" && prop.select) {
    return (prop.select as { name: string }).name;
  }
  if (prop.type === "multi_select" && Array.isArray(prop.multi_select)) {
    return (prop.multi_select as Array<{ name: string }>)
      .map((s) => s.name)
      .join(", ");
  }
  return "";
}

// Lee un campo que puede ser select, status o multi_select
function getStatusOrSelectProp(props: Record<string, unknown>, key: string): string {
  const prop = props[key] as Record<string, unknown> | undefined;
  if (!prop) return "";
  // status type (nombre está en prop.status.name)
  if (prop.type === "status" && prop.status) {
    return (prop.status as { name: string }).name ?? "";
  }
  return getSelectProp(props, key);
}
