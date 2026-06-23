"use client";
import { formatMXN } from "@/lib/pricing";
import type { ClaseCliente } from "@/types";
import { CLASES_CONFIG } from "@/types";

interface Props {
  subtotalServicios: number;
  costoPlazas: number;
  plazas: number;
  costoProjectManager: number;
  costoPresentacion: number;
  costoParticipacion: number;
  totalCostos: number;
  utilidadPct: number;
  utilidadDinero: number;
  precioFinal: number;
  clase: ClaseCliente;
  utilidadManualPct: string;
  markupManual: string;
  totalManual: string;
  onUtilidadManualPct: (v: string) => void;
  onMarkupManual: (v: string) => void;
  onTotalManual: (v: string) => void;
}

export default function ResumenPrecio({
  subtotalServicios,
  costoPlazas,
  plazas,
  costoProjectManager,
  costoPresentacion,
  costoParticipacion,
  totalCostos,
  utilidadPct,
  utilidadDinero,
  precioFinal,
  clase,
  utilidadManualPct,
  markupManual,
  totalManual,
  onUtilidadManualPct,
  onMarkupManual,
  onTotalManual,
}: Props) {
  const hasManualOverride = utilidadManualPct !== "" || markupManual !== "" || totalManual !== "";

  return (
    <div className="card overflow-hidden">
      <div className="section-header">
        <span className="w-2 h-2 rounded-full bg-xeryus-red inline-block" />
        Resumen de precios
      </div>
      <div className="p-5 space-y-1.5">
        <Row label="Servicios directos" value={subtotalServicios} />
        {costoPlazas > 0 && <Row label={`Plazas (${plazas})`} value={costoPlazas} />}
        <Row label="Project Manager" value={costoProjectManager} />
        <Row label="Presentación" value={costoPresentacion} />
        {costoParticipacion > 0 && (
          <Row label={`Dirección · Clase ${clase}`} value={costoParticipacion} />
        )}

        <div className="border-t border-xeryus-border my-3 pt-3">
          <Row label="Total costos" value={totalCostos} bold />
        </div>

        {/* Ajustes manuales */}
        <div className="pt-3 border-t border-dashed border-xeryus-border space-y-2">
          <p className="text-xs font-semibold text-xeryus-muted uppercase tracking-widest">
            Ajuste manual — opcional
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-xeryus-muted block mb-1">Utilidad %</label>
              <input
                type="number"
                placeholder={clase ? `${(CLASES_CONFIG[clase].utilidad * 100).toFixed(0)}` : "0"}
                value={utilidadManualPct}
                onChange={(e) => { onUtilidadManualPct(e.target.value); onMarkupManual(""); onTotalManual(""); }}
                className="input-field text-xs py-1.5"
                min="0" max="99"
              />
            </div>
            <div>
              <label className="text-xs text-xeryus-muted block mb-1">Markup %</label>
              <input
                type="number"
                placeholder="0"
                value={markupManual}
                onChange={(e) => { onMarkupManual(e.target.value); onUtilidadManualPct(""); onTotalManual(""); }}
                className="input-field text-xs py-1.5"
                min="0"
              />
            </div>
            <div>
              <label className="text-xs text-xeryus-muted block mb-1">Total fijo $</label>
              <input
                type="number"
                placeholder="0"
                value={totalManual}
                onChange={(e) => { onTotalManual(e.target.value); onUtilidadManualPct(""); onMarkupManual(""); }}
                className="input-field text-xs py-1.5"
                min="0" step="1000"
              />
            </div>
          </div>
          {hasManualOverride && (
            <button
              type="button"
              onClick={() => { onUtilidadManualPct(""); onMarkupManual(""); onTotalManual(""); }}
              className="text-xs text-xeryus-muted hover:text-xeryus-red transition-colors"
            >
              × Limpiar ajustes
            </button>
          )}
        </div>

        {/* Resultado final */}
        <div className="mt-4 pt-4 border-t-2 border-xeryus-red space-y-2">
          <Row
            label={`Utilidad (${(utilidadPct * 100).toFixed(0)}%)`}
            value={utilidadDinero}
            highlight
          />
          <div className="flex items-center justify-between bg-xeryus-red rounded-xl px-4 py-3 mt-2">
            <span className="text-white font-bold">Precio final</span>
            <span className="text-white font-black text-2xl tabular-nums">
              {precioFinal > 0 ? formatMXN(precioFinal) : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: number;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-sm ${bold ? "font-semibold text-white" : highlight ? "text-xeryus-red font-semibold" : "text-white/60"}`}>
        {label}
      </span>
      <span className={`text-sm tabular-nums ${bold ? "font-bold text-white" : highlight ? "text-xeryus-red font-bold" : "text-white/70"}`}>
        {value > 0 ? formatMXN(value) : "—"}
      </span>
    </div>
  );
}
