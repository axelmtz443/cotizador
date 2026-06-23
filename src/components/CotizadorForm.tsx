"use client";
import { useState, useEffect, useCallback } from "react";
import type { Propuesta, FilaCotizacion, CatalogoData, ClaseCliente } from "@/types";
import { calcularCotizacion, generarNumeroCotizacion } from "@/lib/pricing";
import TablaServicios from "./TablaServicios";
import ResumenPrecio from "./ResumenPrecio";

function nuevaFila(): FilaCotizacion {
  return {
    id: crypto.randomUUID(),
    servicio: null,
    cantidad: 1,
    precioUnitario: 0,
    total: 0,
  };
}

const ESTADO_COLORS: Record<string, string> = {
  "En Proceso":            "bg-green-900/40 text-green-400 border border-green-800",
  "Propuesta en Revisión": "bg-yellow-900/40 text-yellow-400 border border-yellow-800",
  "Realizar Propuesta":    "bg-blue-900/40 text-blue-400 border border-blue-800",
  "En contacto":           "bg-purple-900/40 text-purple-400 border border-purple-800",
  "Cita Agendada":         "bg-cyan-900/40 text-cyan-400 border border-cyan-800",
  "Nuevo Lead":            "bg-orange-900/40 text-orange-400 border border-orange-800",
};

interface Props {
  catalogo: CatalogoData;
}

export default function CotizadorForm({ catalogo }: Props) {
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [loadingPropuestas, setLoadingPropuestas] = useState(true);
  const [errorPropuestas, setErrorPropuestas] = useState("");

  const [propuestaId, setPropuestaId] = useState("");
  const [clase, setClase] = useState<ClaseCliente>("");
  const [plazas, setPlazas] = useState(0);
  const [precioPorPlaza, setPrecioPorPlaza] = useState(5000);
  const [filas, setFilas] = useState<FilaCotizacion[]>([nuevaFila()]);
  const [numeroCotizacion, setNumeroCotizacion] = useState("");

  const [utilidadManualPct, setUtilidadManualPct] = useState("");
  const [markupManual, setMarkupManual] = useState("");
  const [totalManual, setTotalManual] = useState("");

  const [registrando, setRegistrando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setNumeroCotizacion(generarNumeroCotizacion());
  }, []);

  useEffect(() => {
    fetch("/api/propuestas")
      .then((r) => r.json())
      .then((data: Propuesta[] | { error: string }) => {
        if (Array.isArray(data)) setPropuestas(data);
        else setErrorPropuestas(data.error);
      })
      .catch(() => setErrorPropuestas("No se pudo conectar con Notion"))
      .finally(() => setLoadingPropuestas(false));
  }, []);

  const handlePropuestaChange = useCallback(
    (id: string) => {
      setPropuestaId(id);
      setResultado(null);
    },
    []
  );

  const propuestaSeleccionada = propuestas.find((p) => p.id === propuestaId);

  const tieneEncuestas = filas.some((f) => f.servicio?.categoria === "Encuestas");

  const calc = calcularCotizacion(
    filas,
    clase,
    plazas,
    precioPorPlaza,
    utilidadManualPct ? Number(utilidadManualPct) / 100 : undefined,
    markupManual ? Number(markupManual) / 100 : undefined,
    totalManual ? Number(totalManual) : undefined
  );

  function handleUpdateFila(id: string, changes: Partial<FilaCotizacion>) {
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, ...changes } : f)));
  }

  function handleRemoveFila(id: string) {
    setFilas((prev) => {
      const next = prev.filter((f) => f.id !== id);
      return next.length === 0 ? [nuevaFila()] : next;
    });
  }

  function handleAddFila() {
    setFilas((prev) => [...prev, nuevaFila()]);
  }

  async function handleRegistrar() {
    if (!propuestaId) {
      setResultado({ ok: false, msg: "Selecciona una propuesta antes de registrar." });
      return;
    }
    if (calc.precioFinal === 0) {
      setResultado({ ok: false, msg: "Agrega servicios y selecciona una clase para calcular el precio." });
      return;
    }

    setRegistrando(true);
    setResultado(null);

    const cotizacion = {
      ...calc,
      propuestaId,
      propuestaNombre: propuestaSeleccionada?.titulo ?? "",
      cliente: propuestaSeleccionada?.contacto ?? "",
      empresa: propuestaSeleccionada?.empresa ?? "",
      contacto: propuestaSeleccionada?.contacto ?? "",
      fecha: new Date().toISOString().split("T")[0],
      numeroCotizacion,
    };

    try {
      const res = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cotizacion, propuestaPageId: propuestaId }),
      });
      const data = await res.json();
      if (data.success) {
        setResultado({ ok: true, msg: `✓ Cotización ${numeroCotizacion} registrada en Notion.` });
      } else {
        setResultado({ ok: false, msg: data.error ?? "Error desconocido" });
      }
    } catch {
      setResultado({ ok: false, msg: "Error de conexión al registrar." });
    } finally {
      setRegistrando(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Propuesta + datos del cliente ───────────────────── */}
      <div className="card overflow-hidden">
        <div className="section-header">
          <span className="w-2 h-2 rounded-full bg-xeryus-red inline-block" />
          Datos de la cotización
        </div>
        <div className="p-5 space-y-5">

          {/* Selector de propuesta */}
          <div>
            <label className="text-xs font-semibold text-xeryus-muted uppercase tracking-widest block mb-2">
              Propuesta · Notion
            </label>
            {loadingPropuestas ? (
              <div className="input-field opacity-50 animate-pulse">Cargando propuestas...</div>
            ) : errorPropuestas ? (
              <div className="text-xeryus-red text-sm bg-xeryus-red/10 border border-xeryus-redDark rounded-lg px-3 py-2">
                {errorPropuestas} — Verifica tu NOTION_TOKEN y NOTION_PROPUESTAS_DB_ID en .env.local
              </div>
            ) : (
              <select
                value={propuestaId}
                onChange={(e) => handlePropuestaChange(e.target.value)}
                className="input-field"
              >
                <option value="">— Seleccionar propuesta —</option>
                {propuestas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titulo}{p.empresa ? ` · ${p.empresa}` : ""}
                  </option>
                ))}
              </select>
            )}

            {/* Info de la propuesta seleccionada */}
            {propuestaSeleccionada && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`tag-estado ${ESTADO_COLORS[propuestaSeleccionada.estado] ?? "bg-white/10 text-white/70"}`}>
                  {propuestaSeleccionada.estado}
                </span>
                {propuestaSeleccionada.categoria && (
                  <span className="tag-estado bg-white/10 text-white/60">
                    {propuestaSeleccionada.categoria}
                  </span>
                )}
                {propuestaSeleccionada.proyecto && (
                  <p className="text-xs text-xeryus-muted italic w-full mt-1">
                    {propuestaSeleccionada.proyecto}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Datos auto-mapeados + Clase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-xeryus-muted uppercase tracking-widest block mb-2">
                Contacto
              </label>
              <div className="input-mapped">
                {propuestaSeleccionada?.contacto || <span className="text-xeryus-muted/50">— desde Notion —</span>}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-xeryus-muted uppercase tracking-widest block mb-2">
                Empresa
              </label>
              <div className="input-mapped">
                {propuestaSeleccionada?.empresa || <span className="text-xeryus-muted/50">— desde Notion —</span>}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-xeryus-muted uppercase tracking-widest block mb-2">
                Sector / UEN
              </label>
              <div className="input-mapped text-xeryus-muted/70">
                {[propuestaSeleccionada?.sector, propuestaSeleccionada?.uen].filter(Boolean).join(" · ") || <span className="opacity-40">—</span>}
              </div>
            </div>
          </div>

          {/* Clase de cliente */}
          <div>
            <label className="text-xs font-semibold text-xeryus-muted uppercase tracking-widest block mb-2">
              Clase de cliente
            </label>
            <div className="flex gap-3">
              {(["A", "B", "C"] as ClaseCliente[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClase(c)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all duration-150 ${
                    clase === c
                      ? "bg-xeryus-red border-xeryus-red text-white shadow-lg shadow-xeryus-red/20"
                      : "bg-transparent border-xeryus-border text-xeryus-muted hover:border-xeryus-red/50 hover:text-white"
                  }`}
                >
                  Clase {c}
                  <span className="block text-xs font-normal mt-0.5 opacity-80">
                    {c === "A" ? "50%" : c === "B" ? "40%" : "30%"} utilidad
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 pt-1 border-t border-xeryus-border">
            <span className="text-xs text-xeryus-muted">
              No.&nbsp;<span className="font-mono text-white/70">{numeroCotizacion || "generando..."}</span>
            </span>
            <span className="text-xs text-xeryus-muted">
              Fecha&nbsp;<span className="text-white/70">{new Date().toLocaleDateString("es-MX")}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Tabla de servicios ──────────────────────────────── */}
      <TablaServicios
        filas={filas}
        catalogo={catalogo}
        onUpdate={handleUpdateFila}
        onRemove={handleRemoveFila}
        onAdd={handleAddFila}
      />

      {/* ── Plazas (solo si hay encuestas) ─────────────────── */}
      {tieneEncuestas && (
        <div className="card overflow-hidden">
          <div className="section-header-red">
            <span className="w-2 h-2 rounded-full bg-white/50 inline-block" />
            Análisis cuantitativo · Plazas
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-end gap-5">
              <div>
                <label className="text-xs font-semibold text-xeryus-muted uppercase tracking-widest block mb-2">
                  Número de plazas
                </label>
                <input
                  type="number"
                  value={plazas}
                  min={0}
                  onChange={(e) => setPlazas(Number(e.target.value))}
                  className="input-field w-32 text-center"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-xeryus-muted uppercase tracking-widest block mb-2">
                  Precio por plaza
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xeryus-muted text-sm">$</span>
                  <input
                    type="number"
                    value={precioPorPlaza}
                    min={0}
                    step={500}
                    onChange={(e) => setPrecioPorPlaza(Number(e.target.value))}
                    className="input-field w-32"
                  />
                  <button
                    type="button"
                    onClick={() => setPrecioPorPlaza(5000)}
                    className="text-xs text-xeryus-muted hover:text-white transition-colors"
                    title="Restablecer a $5,000"
                  >
                    Reset
                  </button>
                </div>
              </div>
              {plazas > 0 && (
                <div className="pb-0.5">
                  <p className="text-xs text-xeryus-muted mb-1">Subtotal plazas</p>
                  <p className="text-xl font-bold text-xeryus-red">
                    ${(plazas * precioPorPlaza).toLocaleString("es-MX")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Resumen + Registro ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ResumenPrecio
            {...calc}
            clase={clase}
            utilidadManualPct={utilidadManualPct}
            markupManual={markupManual}
            totalManual={totalManual}
            onUtilidadManualPct={setUtilidadManualPct}
            onMarkupManual={setMarkupManual}
            onTotalManual={setTotalManual}
          />
        </div>

        <div>
          <div className="card p-5 space-y-4">
            <p className="text-xs font-semibold text-xeryus-muted uppercase tracking-widest">
              Al registrar
            </p>
            <ul className="text-sm text-white/70 space-y-2">
              {[
                'Crear página "Desglose" en el proyecto de Notion',
                "Actualizar Precio y Utilidad en la propuesta",
                "Guardar en BD de Cotizaciones",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-xeryus-red mt-0.5 font-bold">→</span>
                  {item}
                </li>
              ))}
            </ul>

            {resultado && (
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  resultado.ok
                    ? "bg-green-900/30 text-green-400 border border-green-800"
                    : "bg-xeryus-red/10 text-xeryus-redMid border border-xeryus-redDark"
                }`}
              >
                {resultado.msg}
              </div>
            )}

            <button
              type="button"
              onClick={handleRegistrar}
              disabled={registrando || resultado?.ok === true}
              className="btn-primary w-full py-3 text-base"
            >
              {registrando ? "Registrando..." : resultado?.ok ? "✓ Registrada" : "Registrar cotización"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
