import { NextRequest, NextResponse } from "next/server";
import {
  updatePropuestaPrecio,
  agregarDesgloseAPropuesta,
  crearRegistroEnCotizacionesDb,
} from "@/lib/notion";
import type { CotizacionData, CotizacionSnapshot } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      cotizacion: CotizacionData;
      propuestaPageId: string;
      snapshot?: CotizacionSnapshot;
    };

    const { cotizacion, propuestaPageId, snapshot } = body;

    // 1. Agregar desglose como contenido de la página de la propuesta
    await agregarDesgloseAPropuesta(propuestaPageId, cotizacion);

    // 2. Actualizar Precio y Utilidad $ en la propuesta
    await updatePropuestaPrecio(
      propuestaPageId,
      cotizacion.precioFinal,
      cotizacion.utilidadDinero
    );

    // 3. Crear registro en la BD de Cotizaciones
    let cotizacionPageId: string | null = null;
    if (process.env.NOTION_COTIZACIONES_DB_ID) {
      cotizacionPageId = await crearRegistroEnCotizacionesDb(
        cotizacion,
        propuestaPageId,
        snapshot
      );
    }

    return NextResponse.json({
      success: true,
      cotizacionPageId,
    });
  } catch (error) {
    console.error("Error registrando cotización:", error);
    return NextResponse.json(
      { error: "Error al registrar la cotización en Notion" },
      { status: 500 }
    );
  }
}
