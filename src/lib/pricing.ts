import type { FilaCotizacion, ClaseCliente, CotizacionData } from "@/types";
import { CLASES_CONFIG, PM_BASE, PRESENTACION_COSTO } from "@/types";

export function calcularCotizacion(
  filas: FilaCotizacion[],
  clase: ClaseCliente,
  plazas: number,
  precioPorPlaza: number,
  utilidadManualPct?: number,
  markupManual?: number,
  totalManual?: number
): Omit<CotizacionData, "propuestaId" | "propuestaNombre" | "cliente" | "empresa" | "contacto" | "fecha" | "numeroCotizacion"> {
  const filasConServicio = filas.filter((f) => f.servicio !== null);

  const subtotalServicios = filasConServicio.reduce((acc, f) => acc + f.total, 0);

  const tieneEncuestas = filasConServicio.some(
    (f) => f.servicio?.categoria === "Encuestas"
  );

  const costoPlazas = tieneEncuestas && plazas > 0 ? plazas * precioPorPlaza : 0;

  const sumaAportesPM = filasConServicio.reduce(
    (acc, f) => acc + (f.servicio?.aporte_pm ?? 0),
    0
  );
  const costoProjectManager = Math.max(sumaAportesPM, filasConServicio.length > 0 ? PM_BASE : 0);

  const costoPresentacion = filasConServicio.length > 0 ? PRESENTACION_COSTO : 0;

  const costoParticipacion = clase ? CLASES_CONFIG[clase].participacion : 0;

  const totalCostos =
    subtotalServicios + costoPlazas + costoProjectManager + costoPresentacion + costoParticipacion;

  const utilidadPct = clase ? CLASES_CONFIG[clase].utilidad : 0;

  let precioFinal = 0;
  let utilidadDinero = 0;

  if (totalManual && totalManual > 0) {
    precioFinal = totalManual;
    utilidadDinero = precioFinal - totalCostos;
  } else if (markupManual && markupManual > 0) {
    precioFinal = totalCostos * (1 + markupManual);
    utilidadDinero = precioFinal - totalCostos;
  } else if (utilidadManualPct && utilidadManualPct > 0) {
    precioFinal = totalCostos / (1 - utilidadManualPct);
    utilidadDinero = precioFinal - totalCostos;
  } else if (clase) {
    precioFinal = totalCostos / (1 - utilidadPct);
    utilidadDinero = precioFinal - totalCostos;
  }

  return {
    filas,
    clase,
    subtotalServicios,
    costoAnalisisCuantitativo: 0,
    plazas,
    costoPlazas,
    costoProjectManager,
    costoPresentacion,
    costoParticipacion,
    totalCostos,
    utilidadPct,
    utilidadManualPct,
    markupManual,
    totalManual,
    utilidadDinero,
    precioFinal,
  };
}

export function formatMXN(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function generarNumeroCotizacion(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900) + 100;
  return `XRY-${year}${month}-${rand}`;
}
