import { NextRequest, NextResponse } from "next/server";
import {
  updatePropuestaPrecio,
  agregarDesgloseAPropuesta,
  crearRegistroEnCotizacionesDb,
  actualizarRegistroEnCotizacionesDb,
} from "@/lib/notion";
import type { CotizacionData, CotizacionSnapshot } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      cotizacion: CotizacionData;
      propuestaPageId: string;
      snapshot?: CotizacionSnapshot;
      cotizacionPageId?: string; // si existe → update, si no → create
    };

    const { cotizacion, propuestaPageId, snapshot, cotizacionPageId } = body;

    // Siempre actualiza precio/utilidad en la propuesta
    await updatePropuestaPrecio(
      propuestaPageId,
      cotizacion.precioFinal,
      cotizacion.utilidadDinero
    );

    let resultPageId: string | null = cotizacionPageId ?? null;

    if (cotizacionPageId) {
      // UPDATE — no agrega nuevos bloques a la propuesta para evitar duplicados
      if (process.env.NOTION_COTIZACIONES_DB_ID) {
        const snapshotConId: CotizacionSnapshot | undefined = snapshot
          ? { ...snapshot, cotizacionPageId }
          : undefined;
        await actualizarRegistroEnCotizacionesDb(cotizacionPageId, cotizacion, snapshotConId);
      }
    } else {
      // CREATE — primera vez, agrega desglose a la propuesta
      await agregarDesgloseAPropuesta(propuestaPageId, cotizacion);

      if (process.env.NOTION_COTIZACIONES_DB_ID) {
        resultPageId = await crearRegistroEnCotizacionesDb(
          cotizacion,
          propuestaPageId,
          snapshot
        );
        // Actualiza el snapshot con el ID recién creado
        if (resultPageId && snapshot) {
          const snapshotConId: CotizacionSnapshot = { ...snapshot, cotizacionPageId: resultPageId };
          await actualizarRegistroEnCotizacionesDb(resultPageId, cotizacion, snapshotConId);
        }
      }
    }

    return NextResponse.json({
      success: true,
      cotizacionPageId: resultPageId,
    });
  } catch (error) {
    console.error("Error registrando cotización:", error);
    return NextResponse.json(
      { error: "Error al registrar la cotización en Notion" },
      { status: 500 }
    );
  }
}
