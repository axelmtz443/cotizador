import { Client, isFullPage } from "@notionhq/client";
import type { Propuesta, CotizacionData } from "@/types";

export const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const ESTADOS_ACTIVOS = [
  "En Proceso",
  "Propuesta en Revisión",
  "Realizar Propuesta",
  "En Contacto",
  "Cita Agendada",
  "Nuevo Lead",
];

async function queryPropuestasDB(dbId: string, useFilter: boolean) {
  const base = {
    database_id: dbId,
    sorts: [{ timestamp: "last_edited_time" as const, direction: "descending" as const }],
    page_size: 100,
  };

  if (!useFilter) return notion.databases.query(base);

  // Notion acepta "status" o "select" según el tipo del campo.
  // Intentamos status primero (tipo más común en DBs modernas de Notion).
  return notion.databases.query({
    ...base,
    filter: {
      or: ESTADOS_ACTIVOS.map((estado) => ({
        property: "Estado",
        status: { equals: estado },
      })),
    },
  });
}

export async function getPropuestas(): Promise<Propuesta[]> {
  const dbId = process.env.NOTION_PROPUESTAS_DB_ID;
  if (!dbId) throw new Error("NOTION_PROPUESTAS_DB_ID no configurado");

  // Intenta con filtro status → si falla, intenta select → si falla, trae todo
  let response;
  for (const [useFilter, filterType] of [[true, "status"], [true, "select"], [false, "none"]] as const) {
    try {
      if (filterType === "select" && useFilter) {
        response = await notion.databases.query({
          database_id: dbId,
          sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
          page_size: 100,
          filter: {
            or: ESTADOS_ACTIVOS.map((estado) => ({
              property: "Estado",
              select: { equals: estado },
            })),
          },
        });
      } else {
        response = await queryPropuestasDB(dbId, useFilter);
      }
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // Solo continúa al siguiente intento si el error es por filtro inválido
      if (!msg.includes("validation") && !msg.includes("filter") && !msg.includes("invalid")) {
        throw err;
      }
      console.warn(`Propuestas filter (${filterType}) failed, trying fallback:`, msg);
      if (!useFilter) throw err; // ya en el último intento, relanzar
    }
  }

  if (!response) throw new Error("No se pudo obtener respuesta de Notion");

  const results = response.results
    .filter(isFullPage)
    .map((page) => {
      const props = page.properties as Record<string, unknown>;
      const estado = getStatusOrSelectProp(props, "Estado");
      return {
        id: page.id,
        titulo: getTextProp(props, "Título de Propuesta") || "Sin título",
        empresa: getTextProp(props, "Empresa") || "",
        contacto: getTextProp(props, "Contacto") || "",
        estado,
        proyecto: getTextProp(props, "Proyecto") || "",
        categoria: getStatusOrSelectProp(props, "Categoría"),
        uen: getStatusOrSelectProp(props, "UEN"),
        sector: getStatusOrSelectProp(props, "Sector"),
        ubicacion: getTextProp(props, "Ubicación") || "",
        lastEdited: page.last_edited_time,
      };
    })
    // Si obtuvimos todo sin filtro, filtramos aquí en JS
    .filter((p) => ESTADOS_ACTIVOS.includes(p.estado));

  return results.sort((a, b) => {
    const ia = ESTADOS_ACTIVOS.indexOf(a.estado);
    const ib = ESTADOS_ACTIVOS.indexOf(b.estado);
    if (ia !== ib) return ia - ib;
    return b.lastEdited!.localeCompare(a.lastEdited!);
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

export async function crearPaginaDesglose(
  propuestaPageId: string,
  cotizacion: CotizacionData
): Promise<string> {
  const serviciosBlocks = cotizacion.filas
    .filter((f) => f.servicio !== null)
    .map((f) => ({
      object: "block" as const,
      type: "bulleted_list_item" as const,
      bulleted_list_item: {
        rich_text: [
          {
            type: "text" as const,
            text: {
              content: `${f.servicio!.nombre} × ${f.cantidad} = $${f.total.toLocaleString("es-MX")}`,
            },
          },
        ],
      },
    }));

  const page = await notion.pages.create({
    parent: { page_id: propuestaPageId },
    properties: {
      title: {
        title: [
          {
            text: {
              content: `Desglose · ${cotizacion.numeroCotizacion}`,
            },
          },
        ],
      },
    },
    children: [
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: "Información de la cotización" } }],
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: {
                content: `Cliente: ${cotizacion.cliente} | Empresa: ${cotizacion.empresa} | Clase: ${cotizacion.clase} | Fecha: ${cotizacion.fecha}`,
              },
            },
          ],
        },
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: "Servicios cotizados" } }],
        },
      },
      ...serviciosBlocks,
      {
        object: "block",
        type: "divider",
        divider: {},
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: "Resumen de precios" } }],
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: {
                content: [
                  `Subtotal servicios: $${cotizacion.subtotalServicios.toLocaleString("es-MX")}`,
                  cotizacion.costoPlazas > 0 ? `Plazas (${cotizacion.plazas}): $${cotizacion.costoPlazas.toLocaleString("es-MX")}` : null,
                  `Project Manager: $${cotizacion.costoProjectManager.toLocaleString("es-MX")}`,
                  `Presentación: $${cotizacion.costoPresentacion.toLocaleString("es-MX")}`,
                  `Dirección / Participación: $${cotizacion.costoParticipacion.toLocaleString("es-MX")}`,
                  `───────────────────`,
                  `Total costos: $${cotizacion.totalCostos.toLocaleString("es-MX")}`,
                  `Utilidad (${(cotizacion.utilidadPct * 100).toFixed(0)}%): $${cotizacion.utilidadDinero.toLocaleString("es-MX")}`,
                  `PRECIO FINAL: $${cotizacion.precioFinal.toLocaleString("es-MX")}`,
                ]
                  .filter(Boolean)
                  .join("\n"),
              },
            },
          ],
        },
      },
    ],
  });

  return page.id;
}

export async function getCotizacionesDb(): Promise<string | null> {
  return process.env.NOTION_COTIZACIONES_DB_ID || null;
}

export async function crearRegistroEnCotizacionesDb(
  cotizacion: CotizacionData,
  propuestaPageId: string,
  desglosePaginaId: string
): Promise<string> {
  const dbId = process.env.NOTION_COTIZACIONES_DB_ID;
  if (!dbId) throw new Error("NOTION_COTIZACIONES_DB_ID no configurado");

  // Solo se escriben los campos editables directamente.
  // Cliente, Empresa y Clase son rollup/fórmula calculados desde la relación Propuesta.
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
      "Desglose": {
        relation: [{ id: desglosePaginaId }],
      },
    },
  });

  return page.id;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function getTextProp(props: Record<string, unknown>, key: string): string {
  const prop = props[key] as Record<string, unknown> | undefined;
  if (!prop) return "";
  if (prop.type === "title" && Array.isArray(prop.title)) {
    return (prop.title as Array<{ plain_text: string }>)
      .map((t) => t.plain_text)
      .join("");
  }
  if (prop.type === "rich_text" && Array.isArray(prop.rich_text)) {
    return (prop.rich_text as Array<{ plain_text: string }>)
      .map((t) => t.plain_text)
      .join("");
  }
  if (prop.type === "people" && Array.isArray(prop.people)) {
    return (prop.people as Array<{ name?: string }>)
      .map((p) => p.name ?? "")
      .join(", ");
  }
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
