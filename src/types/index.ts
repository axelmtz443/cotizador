export interface Servicio {
  id: string;
  categoria: string;
  nombre: string;
  descripcion: string;
  desglose?: string;
  precio: number;
  unidad: string;
  aporte_pm: number;
}

export interface CatalogoData {
  categorias: string[];
  servicios: Servicio[];
}

export type ClaseCliente = "A" | "B" | "C" | "";

export interface FilaCotizacion {
  id: string;
  servicio: Servicio | null;
  cantidad: number;
  precioUnitario: number;
  total: number;
  ajusteManual?: number;
}

export interface CotizacionData {
  propuestaId: string;
  propuestaNombre: string;
  cliente: string;
  empresa: string;
  contacto: string;
  clase: ClaseCliente;
  filas: FilaCotizacion[];
  subtotalServicios: number;
  costoAnalisisCuantitativo: number;
  plazas: number;
  costoPlazas: number;
  costoProjectManager: number;
  costoPresentacion: number;
  costoParticipacion: number;
  totalCostos: number;
  utilidadPct: number;
  utilidadManualPct?: number;
  markupManual?: number;
  totalManual?: number;
  utilidadDinero: number;
  precioFinal: number;
  fecha: string;
  numeroCotizacion: string;
  notas?: string;
}

export interface Propuesta {
  id: string;
  titulo: string;
  empresa: string;
  contacto: string;
  estado: string;
  proyecto?: string;
  categoria?: string;
  uen?: string;
  sector?: string;
  ubicacion?: string;
  lastEdited?: string;
}

export interface RegistroCotizacion {
  id: string;
  notionPageId?: string;
  propuestaId: string;
  propuestaNombre: string;
  cliente: string;
  empresa: string;
  clase: ClaseCliente;
  totalCostos: number;
  precioFinal: number;
  utilidadDinero: number;
  fecha: string;
  numeroCotizacion: string;
  serviciosResumen: string[];
}

export interface ClasesConfig {
  A: { utilidad: number; participacion: number };
  B: { utilidad: number; participacion: number };
  C: { utilidad: number; participacion: number };
}

export const CLASES_CONFIG: ClasesConfig = {
  A: { utilidad: 0.5, participacion: 15000 },
  B: { utilidad: 0.4, participacion: 10000 },
  C: { utilidad: 0.3, participacion: 5000 },
};

export const PM_BASE = 4800;
export const PRESENTACION_COSTO = 800;
