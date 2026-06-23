"use client";
import { useState, useRef, useEffect } from "react";
import { formatMXN } from "@/lib/pricing";
import type { ClaseCliente } from "@/types";

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
  utilidadPctReal: number;
  markupPct: number;
  precioFinal: number;
  clase: ClaseCliente;
  ovServicios: string; onOvServicios: (v: string) => void;
  ovPM: string; onOvPM: (v: string) => void;
  ovPresentacion: string; onOvPresentacion: (v: string) => void;
  ovParticipacion: string; onOvParticipacion: (v: string) => void;
  ovPrecio: string; onOvPrecio: (v: string) => void;
  ovUtilidadMonto: string; onOvUtilidadMonto: (v: string) => void;
  ovUtilidadPct: string; onOvUtilidadPct: (v: string) => void;
  ovMarkupPct: string; onOvMarkupPct: (v: string) => void;
  onResetPrecio: () => void;
}

export default function ResumenPrecio({
  subtotalServicios, costoPlazas, plazas,
  costoProjectManager, costoPresentacion, costoParticipacion,
  totalCostos, utilidadDinero, utilidadPctReal, markupPct, precioFinal, clase,
  ovServicios, onOvServicios,
  ovPM, onOvPM,
  ovPresentacion, onOvPresentacion,
  ovParticipacion, onOvParticipacion,
  ovPrecio, onOvPrecio,
  ovUtilidadMonto, onOvUtilidadMonto,
  ovUtilidadPct, onOvUtilidadPct,
  ovMarkupPct, onOvMarkupPct,
  onResetPrecio,
}: Props) {
  const hasPrecioOverride = ovPrecio !== "" || ovUtilidadMonto !== "" || ovUtilidadPct !== "" || ovMarkupPct !== "";

  return (
    <div className="card overflow-hidden">
      <div className="section-header">
        <span className="w-2 h-2 rounded-full bg-xeryus-red inline-block" />
        Resumen de precios
      </div>
      <div className="p-5 space-y-1">
        {/* ── Costos ── */}
        <ERow label="Servicios directos" calculated={subtotalServicios} override={ovServicios} onOverride={onOvServicios} onReset={() => onOvServicios("")} />
        {costoPlazas > 0 && <StaticRow label={`Plazas (${plazas})`} value={costoPlazas} />}
        <ERow label="Project Manager"    calculated={costoProjectManager} override={ovPM}            onOverride={onOvPM}            onReset={() => onOvPM("")} />
        <ERow label="Presentación"       calculated={costoPresentacion}   override={ovPresentacion}  onOverride={onOvPresentacion}  onReset={() => onOvPresentacion("")} />
        {(costoParticipacion > 0 || ovParticipacion !== "") && (
          <ERow label={`Dirección · Clase ${clase}`} calculated={costoParticipacion} override={ovParticipacion} onOverride={onOvParticipacion} onReset={() => onOvParticipacion("")} />
        )}

        <div className="border-t border-xeryus-border pt-3 mt-2">
          <StaticRow label="Total costos" value={totalCostos} bold />
        </div>

        {/* ── Utilidad / Precio ── */}
        <div className="pt-4 border-t-2 border-xeryus-red space-y-1">
          {hasPrecioOverride && (
            <div className="flex justify-end mb-1">
              <button type="button" onClick={onResetPrecio} className="text-xs text-xeryus-muted hover:text-white transition-colors">
                ↺ Restaurar precio
              </button>
            </div>
          )}
          <ERow
            label="Utilidad $"
            calculated={Math.round(utilidadDinero)}
            override={ovUtilidadMonto}
            onOverride={onOvUtilidadMonto}
            onReset={() => onOvUtilidadMonto("")}
            highlight
          />
          <ERow
            label="Utilidad %"
            calculated={parseFloat(utilidadPctReal.toFixed(1))}
            override={ovUtilidadPct}
            onOverride={onOvUtilidadPct}
            onReset={() => onOvUtilidadPct("")}
            format="pct"
            highlight
          />
          <ERow
            label="Markup sobre costo"
            calculated={parseFloat(markupPct.toFixed(1))}
            override={ovMarkupPct}
            onOverride={onOvMarkupPct}
            onReset={() => onOvMarkupPct("")}
            format="pct"
          />

          {/* Precio final */}
          <div className="flex items-center justify-between bg-xeryus-red rounded-xl px-4 py-3 mt-3">
            <span className="text-white font-bold">Precio final</span>
            <ERow
              label=""
              calculated={Math.round(precioFinal)}
              override={ovPrecio}
              onOverride={onOvPrecio}
              onReset={() => onOvPrecio("")}
              large
              inline
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StaticRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-sm ${bold ? "font-semibold text-white" : "text-white/60"}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? "font-bold text-white" : "text-white/70"}`}>
        {value > 0 ? formatMXN(value) : "—"}
      </span>
    </div>
  );
}

function ERow({
  label, calculated, override, onOverride, onReset,
  format = "mxn", highlight, large, inline,
}: {
  label: string;
  calculated: number;
  override: string;
  onOverride: (v: string) => void;
  onReset: () => void;
  format?: "mxn" | "pct";
  highlight?: boolean;
  large?: boolean;
  inline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const hasOverride = override !== "";
  const effectiveValue = hasOverride ? Number(override) : calculated;

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  function startEdit() {
    setDraft(String(hasOverride ? Number(override) : calculated));
    setEditing(true);
  }
  function commit() {
    const n = Number(draft);
    if (!isNaN(n) && draft !== "") onOverride(String(n));
    else onReset();
    setEditing(false);
  }

  function displayStr(v: number) {
    if (format === "pct") return `${v.toFixed(1)}%`;
    return large
      ? `$${Math.round(v).toLocaleString("es-MX")}`
      : formatMXN(v);
  }

  const valueEl = editing ? (
    <input
      ref={ref}
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      step={format === "pct" ? 0.1 : 1}
      min="0"
      className={
        large
          ? "w-36 text-right bg-white/10 border border-white/40 rounded px-2 py-1 text-white font-black text-xl tabular-nums outline-none"
          : "w-24 text-right bg-xeryus-card border border-xeryus-red/60 rounded px-2 py-0.5 text-sm text-white tabular-nums outline-none focus:border-xeryus-red"
      }
    />
  ) : (
    <button
      type="button"
      onClick={startEdit}
      title="Clic para editar"
      className={[
        "tabular-nums hover:underline transition-colors",
        large ? "font-black text-2xl" : "text-sm font-semibold",
        hasOverride
          ? (large ? "text-yellow-300" : "text-yellow-400")
          : highlight
          ? "text-xeryus-red"
          : large ? "text-white" : "text-white/70 hover:text-white",
      ].join(" ")}
    >
      {effectiveValue > 0 ? displayStr(effectiveValue) : "—"}
    </button>
  );

  if (inline) return (
    <div className="flex items-center gap-2">
      {hasOverride && !editing && (
        <button type="button" onClick={onReset} className="text-xs text-white/50 hover:text-white">↺</button>
      )}
      {valueEl}
    </div>
  );

  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-sm ${highlight ? "text-xeryus-red font-semibold" : "text-white/60"}`}>{label}</span>
      <div className="flex items-center gap-2">
        {hasOverride && !editing && (
          <button type="button" onClick={onReset} className="text-xs text-xeryus-muted hover:text-white transition-colors">
            ↺ Restaurar
          </button>
        )}
        {valueEl}
      </div>
    </div>
  );
}
