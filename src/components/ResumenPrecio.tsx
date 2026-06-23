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
  totalCostos, utilidadPct, utilidadDinero, utilidadPctReal, markupPct, precioFinal, clase,
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
        <EditableRow label="Servicios directos" calculated={subtotalServicios} override={ovServicios} onOverride={onOvServicios} onReset={() => onOvServicios("")} />
        {costoPlazas > 0 && <Row label={`Plazas (${plazas})`} value={costoPlazas} />}
        <EditableRow label="Project Manager" calculated={costoProjectManager} override={ovPM} onOverride={onOvPM} onReset={() => onOvPM("")} />
        <EditableRow label="Presentación" calculated={costoPresentacion} override={ovPresentacion} onOverride={onOvPresentacion} onReset={() => onOvPresentacion("")} />
        {(costoParticipacion > 0 || ovParticipacion !== "") && (
          <EditableRow label={`Dirección · Clase ${clase}`} calculated={costoParticipacion} override={ovParticipacion} onOverride={onOvParticipacion} onReset={() => onOvParticipacion("")} />
        )}

        <div className="border-t border-xeryus-border pt-3 mt-2">
          <Row label="Total costos" value={totalCostos} bold />
        </div>

        {/* Utilidad y precio */}
        <div className="mt-4 pt-4 border-t-2 border-xeryus-red space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-xeryus-red font-semibold">Utilidad</span>
            <div className="flex items-center gap-3">
              {hasPrecioOverride && (
                <button type="button" onClick={onResetPrecio} className="text-xs text-xeryus-muted hover:text-white transition-colors">
                  ↺ Restaurar
                </button>
              )}
              <div className="flex items-center gap-1.5 text-sm tabular-nums text-xeryus-red font-bold">
                <InlineEdit
                  value={Math.round(utilidadDinero)}
                  draft={ovUtilidadMonto}
                  onCommit={onOvUtilidadMonto}
                  prefix="$"
                  title="Editar utilidad $"
                />
                <span className="text-xeryus-muted font-normal">/</span>
                <InlineEdit
                  value={parseFloat(utilidadPctReal.toFixed(1))}
                  draft={ovUtilidadPct}
                  onCommit={onOvUtilidadPct}
                  suffix="%"
                  decimals={1}
                  title="Editar utilidad %"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-xeryus-muted">
            <span>Markup sobre costo</span>
            <InlineEdit
              value={parseFloat(markupPct.toFixed(1))}
              draft={ovMarkupPct}
              onCommit={onOvMarkupPct}
              suffix="%"
              decimals={1}
              title="Editar markup %"
              small
            />
          </div>

          <div className="flex items-center justify-between bg-xeryus-red rounded-xl px-4 py-3">
            <span className="text-white font-bold">Precio final</span>
            <div className="flex items-center gap-2">
              {ovPrecio !== "" && (
                <button type="button" onClick={() => onOvPrecio("")} className="text-xs text-white/50 hover:text-white">↺</button>
              )}
              <InlineEdit
                value={Math.round(precioFinal)}
                draft={ovPrecio}
                onCommit={onOvPrecio}
                prefix="$"
                title="Fijar precio final"
                large
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-sm ${bold ? "font-semibold text-white" : "text-white/60"}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? "font-bold text-white" : "text-white/70"}`}>
        {value > 0 ? formatMXN(value) : "—"}
      </span>
    </div>
  );
}

function EditableRow({ label, calculated, override, onOverride, onReset }: {
  label: string; calculated: number; override: string;
  onOverride: (v: string) => void; onReset: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const hasOverride = override !== "";
  const displayValue = hasOverride ? Number(override) : calculated;

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  function startEdit() { setDraft(String(Math.round(hasOverride ? Number(override) : calculated))); setEditing(true); }
  function commit() {
    const n = Number(draft);
    if (!isNaN(n) && draft !== "") onOverride(String(n)); else onReset();
    setEditing(false);
  }

  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-sm text-white/60">{label}</span>
      <div className="flex items-center gap-2">
        {hasOverride && !editing && (
          <button type="button" onClick={onReset} className="text-xs text-xeryus-muted hover:text-white transition-colors">↺ Restaurar</button>
        )}
        {editing ? (
          <input ref={ref} type="number" value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            className="w-28 text-right bg-xeryus-card border border-xeryus-red/60 rounded px-2 py-0.5 text-sm text-white tabular-nums outline-none focus:border-xeryus-red"
            min="0"
          />
        ) : (
          <button type="button" onClick={startEdit}
            className={`text-sm tabular-nums hover:underline ${hasOverride ? "text-yellow-400 font-semibold" : "text-white/70 hover:text-white"}`}
            title="Clic para editar"
          >
            {displayValue > 0 ? formatMXN(displayValue) : "—"}
          </button>
        )}
      </div>
    </div>
  );
}

function InlineEdit({ value, draft, onCommit, prefix, suffix, decimals = 0, title, small, large }: {
  value: number; draft: string; onCommit: (v: string) => void;
  prefix?: string; suffix?: string; decimals?: number;
  title?: string; small?: boolean; large?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [localDraft, setLocalDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const hasOverride = draft !== "";
  const displayValue = hasOverride ? Number(draft) : value;

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  function startEdit() { setLocalDraft(String(hasOverride ? Number(draft) : value)); setEditing(true); }
  function commit() {
    const n = Number(localDraft);
    if (!isNaN(n) && localDraft !== "") onCommit(String(n)); else onCommit("");
    setEditing(false);
  }

  const textClass = large
    ? `font-black text-2xl text-white tabular-nums ${hasOverride ? "text-yellow-300" : ""}`
    : small
    ? `tabular-nums ${hasOverride ? "text-yellow-400" : ""}`
    : `font-bold tabular-nums ${hasOverride ? "text-yellow-400" : ""}`;

  const inputClass = large
    ? "w-32 text-right bg-white/10 border border-white/30 rounded px-2 py-1 text-white font-black text-xl tabular-nums outline-none"
    : "w-20 text-right bg-xeryus-card border border-xeryus-red/60 rounded px-1.5 py-0.5 text-sm tabular-nums outline-none text-white focus:border-xeryus-red";

  if (editing) {
    return (
      <input ref={ref} type="number" value={localDraft}
        onChange={(e) => setLocalDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        className={inputClass}
        step={decimals > 0 ? 0.1 : 1}
      />
    );
  }

  return (
    <button type="button" onClick={startEdit} title={title}
      className={`${textClass} hover:underline transition-colors`}
    >
      {prefix}{decimals > 0 ? displayValue.toFixed(decimals) : formatMXN(displayValue).replace("MX$", "$")}{suffix}
    </button>
  );
}
