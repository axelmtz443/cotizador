import { NextRequest, NextResponse } from "next/server";
import { getCotizacionDatos } from "@/lib/notion";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const snapshot = await getCotizacionDatos(params.id);
    if (!snapshot) {
      return NextResponse.json({ error: "No se encontró snapshot para esta cotización" }, { status: 404 });
    }
    return NextResponse.json(snapshot);
  } catch (err) {
    console.error("[GET /api/cotizaciones/[id]]", err);
    return NextResponse.json({ error: "Error al obtener los datos" }, { status: 500 });
  }
}
