"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Propuesta, FilaCotizacion, CatalogoData, ClaseCliente, CotizacionSnapshot } from "@/types";
import { calcularCotizacion, generarNumeroCotizacion } from "@/lib/pricing";
import TablaServicios from "./TablaServicios";
import ResumenPrecio from "./ResumenPrecio";

const DRAFT_KEY = "xeryus_cotizacion_draft";

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
  initialData?: CotizacionSnapshot;
  cotizacionId?: string;
}

export default function CotizadorForm({ catalogo, initialData, cotizacionId }: Props) {
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [loadingPropuestas, setLoadingPropuestas] = useState(true);
  const [errorPropuestas, setErrorPropuestas] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);

  const [propuestaId, setPropuestaId] = useState("");
  const [clase, setClase] = useState<ClaseCliente>("");
  const [plazas, setPlazas] = useState(0);
  const [precioPorPlaza, setPrecioPorPlaza] = useState(5000);
  const [filas, setFilas] = useState<FilaCotizacion[]>([nuevaFila()]);
  const [numeroCotizacion, setNumeroCotizacion] = useState("");

  // Overrides por línea de costo
  const [ovServicios, setOvServicios] = useState("");
  const [ovPM, setOvPM] = useState("");
  const [ovPresentacion, setOvPresentacion] = useState("");
  const [ovParticipacion, setOvParticipacion] = useState("");
  // Overrides de precio final (solo uno activo a la vez)
  const [ovPrecio, setOvPrecio] = useState("");
  const [ovUtilidadMonto, setOvUtilidadMonto] = useState("");
  const [ovUtilidadPct, setOvUtilidadPct] = useState("");
  const [ovMarkupPct, setOvMarkupPct] = useState("");

  const [notas, setNotas] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const mountedRef = useRef(false);

  // Restaurar borrador desde localStorage (solo en modo nuevo, no al editar desde historial)
  useEffect(() => {
    if (initialData) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.propuestaId) setPropuestaId(draft.propuestaId);
      if (draft.clase) setClase(draft.clase);
      if (typeof draft.plazas === "number") setPlazas(draft.plazas);
      if (typeof draft.precioPorPlaza === "number") setPrecioPorPlaza(draft.precioPorPlaza);
      if (Array.isArray(draft.filas) && draft.filas.length > 0) setFilas(draft.filas);
      if (draft.ovServicios !== undefined) setOvServicios(draft.ovServicios);
      if (draft.ovPM !== undefined) setOvPM(draft.ovPM);
      if (draft.ovPresentacion !== undefined) setOvPresentacion(draft.ovPresentacion);
      if (draft.ovParticipacion !== undefined) setOvParticipacion(draft.ovParticipacion);
      if (draft.ovPrecio !== undefined) setOvPrecio(draft.ovPrecio);
      if (draft.ovUtilidadMonto !== undefined) setOvUtilidadMonto(draft.ovUtilidadMonto);
      if (draft.ovUtilidadPct !== undefined) setOvUtilidadPct(draft.ovUtilidadPct);
      if (draft.ovMarkupPct !== undefined) setOvMarkupPct(draft.ovMarkupPct);
      if (draft.notas !== undefined) setNotas(draft.notas);
      if (draft.numeroCotizacion) setNumeroCotizacion(draft.numeroCotizacion);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialData) setNumeroCotizacion((prev) => prev || generarNumeroCotizacion());
  }, [initialData]);

  useEffect(() => {
    if (!initialData) return;
    setPropuestaId(initialData.propuestaId);
    setClase(initialData.clase);
    setPlazas(initialData.plazas);
    setPrecioPorPlaza(initialData.precioPorPlaza);
    setFilas(initialData.filas);
    setOvServicios(initialData.ovServicios);
    setOvPM(initialData.ovPM);
    setOvPresentacion(initialData.ovPresentacion);
    setOvParticipacion(initialData.ovParticipacion);
    setOvPrecio(initialData.ovPrecio);
    setOvUtilidadMonto(initialData.ovUtilidadMonto);
    setOvUtilidadPct(initialData.ovUtilidadPct);
    setOvMarkupPct(initialData.ovMarkupPct);
    setNotas(initialData.notas);
    setNumeroCotizacion(initialData.numeroCotizacion);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar borrador en localStorage (solo en modo nuevo, no desde historial)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    if (cotizacionId) return; // no sobrescribir al editar desde historial
    const tieneContenido = propuestaId !== "" || filas.some((f) => f.servicio !== null);
    if (!tieneContenido) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        propuestaId, clase, plazas, precioPorPlaza, filas,
        ovServicios, ovPM, ovPresentacion, ovParticipacion,
        ovPrecio, ovUtilidadMonto, ovUtilidadPct, ovMarkupPct,
        notas, numeroCotizacion,
      }));
      setDraftSaved(true);
    } catch {}
  }, [propuestaId, clase, plazas, precioPorPlaza, filas, ovServicios, ovPM, ovPresentacion,
      ovParticipacion, ovPrecio, ovUtilidadMonto, ovUtilidadPct, ovMarkupPct, notas, numeroCotizacion, cotizacionId]);

  function limpiarBorrador() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setPropuestaId(""); setClase(""); setPlazas(0); setPrecioPorPlaza(5000);
    setFilas([nuevaFila()]); setOvServicios(""); setOvPM(""); setOvPresentacion("");
    setOvParticipacion(""); setOvPrecio(""); setOvUtilidadMonto(""); setOvUtilidadPct("");
    setOvMarkupPct(""); setNotas(""); setNumeroCotizacion(generarNumeroCotizacion());
    setResultado(null); setDraftSaved(false);
  }

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

  const handlePropuestaChange = useCallback((id: string) => {
    setPropuestaId(id);
    setResultado(null);
  }, []);

  const propuestasFiltradas = propuestas.filter((p) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      p.titulo.toLowerCase().includes(q) ||
      p.empresa.toLowerCase().includes(q) ||
      p.contacto.toLowerCase().includes(q)
    );
  });
  const propuestasVisibles = propuestasFiltradas.slice(0, visibleCount);

  const propuestaSeleccionada = propuestas.find((p) => p.id === propuestaId);

  const tieneEncuestas = filas.some((f) => f.servicio?.categoria === "Encuestas");

  const calc = calcularCotizacion(filas, clase, plazas, precioPorPlaza);

  // Valores efectivos con overrides aplicados
  const effServicios = ovServicios !== "" ? Number(ovServicios) : calc.subtotalServicios;
  const effPM = ovPM !== "" ? Number(ovPM) : calc.costoProjectManager;
  const effPresentacion = ovPresentacion !== "" ? Number(ovPresentacion) : calc.costoPresentacion;
  const effParticipacion = ovParticipacion !== "" ? Number(ovParticipacion) : calc.costoParticipacion;
  const effTotalCostos = effServicios + calc.costoPlazas + effPM + effPresentacion + effParticipacion;
  const utilPct = clase ? (clase === "A" ? 0.5 : clase === "B" ? 0.4 : 0.3) : 0;
  const effPrecioFinal =
    ovPrecio !== "" ? Number(ovPrecio) :
    ovUtilidadMonto !== "" ? effTotalCostos + Number(ovUtilidadMonto) :
    ovUtilidadPct !== "" ? effTotalCostos / (1 - Number(ovUtilidadPct) / 100) :
    ovMarkupPct !== "" ? effTotalCostos * (1 + Number(ovMarkupPct) / 100) :
    clase ? effTotalCostos / (1 - utilPct) : 0;
  const effUtilidadDinero = effPrecioFinal - effTotalCostos;
  const effMarkupPct = effTotalCostos > 0 ? (effUtilidadDinero / effTotalCostos) * 100 : 0;
  const effUtilidadPctReal = effPrecioFinal > 0 ? (effUtilidadDinero / effPrecioFinal) * 100 : 0;

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

  function copiarDesglose() {
    const lineas = [
      `Cotización: ${numeroCotizacion}`,
      `Propuesta: ${propuestaSeleccionada?.titulo ?? ""}`,
      `Proyecto: ${propuestaSeleccionada?.proyecto ?? ""}`,
      `Cliente: ${propuestaSeleccionada?.contacto ?? ""}`,
      `Empresa: ${propuestaSeleccionada?.empresa ?? ""}`,
      `Clase: ${clase}`,
      `Fecha: ${new Date().toLocaleDateString("es-MX")}`,
      ``,
      `SERVICIOS`,
      ...filas.filter(f => f.servicio).map(f => `  ${f.servicio!.nombre} × ${f.cantidad} = $${f.total.toLocaleString("es-MX")}`),
      ``,
      `COSTOS`,
      `  Servicios:     $${effServicios.toLocaleString("es-MX")}`,
      calc.costoPlazas > 0 ? `  Plazas (${plazas}): $${calc.costoPlazas.toLocaleString("es-MX")}` : "",
      `  Project Mgr:   $${effPM.toLocaleString("es-MX")}`,
      `  Presentación:  $${effPresentacion.toLocaleString("es-MX")}`,
      `  Dirección:     $${effParticipacion.toLocaleString("es-MX")}`,
      `  ─────────────────────`,
      `  Total costos:  $${effTotalCostos.toLocaleString("es-MX")}`,
      ``,
      `PRECIO`,
      `  Utilidad (${effUtilidadPctReal.toFixed(1)}%): $${effUtilidadDinero.toLocaleString("es-MX")}`,
      `  Markup: ${effMarkupPct.toFixed(1)}%`,
      `  PRECIO FINAL: $${effPrecioFinal.toLocaleString("es-MX")}`,
      notas ? `\nNotas: ${notas}` : "",
    ].filter(l => l !== "").join("\n");

    navigator.clipboard.writeText(lineas).then(() => {
      setResultado({ ok: true, msg: "✓ Desglose copiado al portapapeles." });
    });
  }

  async function handleRegistrar() {
    if (!propuestaId) {
      setResultado({ ok: false, msg: "Selecciona una propuesta antes de registrar." });
      return;
    }
    if (effPrecioFinal === 0) {
      setResultado({ ok: false, msg: "Agrega servicios y selecciona una clase para calcular el precio." });
      return;
    }

    setRegistrando(true);
    setResultado(null);

    const cotizacion = {
      ...calc,
      subtotalServicios: effServicios,
      costoProjectManager: effPM,
      costoPresentacion: effPresentacion,
      costoParticipacion: effParticipacion,
      totalCostos: effTotalCostos,
      precioFinal: effPrecioFinal,
      utilidadDinero: effUtilidadDinero,
      utilidadPct: utilPct,
      propuestaId,
      propuestaNombre: propuestaSeleccionada?.titulo ?? "",
      cliente: propuestaSeleccionada?.contacto ?? "",
      empresa: propuestaSeleccionada?.empresa ?? "",
      contacto: propuestaSeleccionada?.contacto ?? "",
      fecha: new Date().toISOString().split("T")[0],
      numeroCotizacion,
      notas,
    };

    // Si venimos de historial, usamos el ID guardado en el snapshot (puede sobrescribir el prop)
    const existingId = initialData?.cotizacionPageId ?? cotizacionId;

    const snapshot: CotizacionSnapshot = {
      propuestaId,
      clase,
      plazas,
      precioPorPlaza,
      filas,
      ovServicios,
      ovPM,
      ovPresentacion,
      ovParticipacion,
      ovPrecio,
      ovUtilidadMonto,
      ovUtilidadPct,
      ovMarkupPct,
      notas,
      numeroCotizacion,
      ...(existingId ? { cotizacionPageId: existingId } : {}),
    };

    try {
      const res = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cotizacion,
          propuestaPageId: propuestaId,
          snapshot,
          ...(existingId ? { cotizacionPageId: existingId } : {}),
        }),
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
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Buscar propuesta..."
                  value={busqueda}
                  onChange={(e) => { setBusqueda(e.target.value); setVisibleCount(50); }}
                  className="input-field text-sm"
                />
                <div className="border border-xeryus-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  {propuestasVisibles.length === 0 ? (
                    <p className="text-sm text-xeryus-muted px-3 py-2">Sin resultados</p>
                  ) : (
                    propuestasVisibles.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePropuestaChange(p.id)}
                        className={`w-full text-left px-3 py-2 text-sm border-b border-xeryus-border last:border-0 transition-colors ${
                          propuestaId === p.id
                            ? "bg-xeryus-red/20 text-white"
                            : "hover:bg-white/5 text-white/80"
                        }`}
                      >
                        <span className="font-medium">{p.titulo}</span>
                        {p.empresa && <span className="text-xeryus-muted ml-2 text-xs">{p.empresa}</span>}
                      </button>
                    ))
                  )}
                  {propuestasFiltradas.length > visibleCount && (
                    <button
                      type="button"
                      onClick={() => setVisibleCount((v) => v + 50)}
                      className="w-full px-3 py-2 text-xs text-xeryus-muted hover:text-white hover:bg-white/5 transition-colors border-t border-xeryus-border"
                    >
                      Cargar más ({propuestasFiltradas.length - visibleCount} restantes)
                    </button>
                  )}
                </div>
                <p className="text-xs text-xeryus-muted">{propuestasFiltradas.length} propuesta{propuestasFiltradas.length !== 1 ? "s" : ""}</p>
              </div>
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
          <div className="flex items-center gap-4 pt-1 border-t border-xeryus-border flex-wrap">
            <span className="text-xs text-xeryus-muted">
              No.&nbsp;<span className="font-mono text-white/70">{numeroCotizacion || "generando..."}</span>
            </span>
            <span className="text-xs text-xeryus-muted">
              Fecha&nbsp;<span className="text-white/70">{new Date().toLocaleDateString("es-MX")}</span>
            </span>
            <div className="ml-auto flex items-center gap-3">
              {draftSaved && !cotizacionId && (
                <span className="text-xs text-xeryus-muted">borrador guardado</span>
              )}
              {!cotizacionId && (
                <button
                  type="button"
                  onClick={limpiarBorrador}
                  className="text-xs text-xeryus-muted hover:text-white transition-colors underline underline-offset-2"
                >
                  Nueva cotización
                </button>
              )}
            </div>
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
            subtotalServicios={effServicios}
            costoPlazas={calc.costoPlazas}
            plazas={plazas}
            costoProjectManager={effPM}
            costoPresentacion={effPresentacion}
            costoParticipacion={effParticipacion}
            totalCostos={effTotalCostos}
            utilidadPct={utilPct}
            utilidadDinero={effUtilidadDinero}
            utilidadPctReal={effUtilidadPctReal}
            markupPct={effMarkupPct}
            precioFinal={effPrecioFinal}
            clase={clase}
            ovServicios={ovServicios} onOvServicios={setOvServicios}
            ovPM={ovPM} onOvPM={setOvPM}
            ovPresentacion={ovPresentacion} onOvPresentacion={setOvPresentacion}
            ovParticipacion={ovParticipacion} onOvParticipacion={setOvParticipacion}
            ovPrecio={ovPrecio} onOvPrecio={(v) => { setOvPrecio(v); setOvUtilidadMonto(""); setOvUtilidadPct(""); setOvMarkupPct(""); }}
            ovUtilidadMonto={ovUtilidadMonto} onOvUtilidadMonto={(v) => { setOvUtilidadMonto(v); setOvPrecio(""); setOvUtilidadPct(""); setOvMarkupPct(""); }}
            ovUtilidadPct={ovUtilidadPct} onOvUtilidadPct={(v) => { setOvUtilidadPct(v); setOvPrecio(""); setOvUtilidadMonto(""); setOvMarkupPct(""); }}
            ovMarkupPct={ovMarkupPct} onOvMarkupPct={(v) => { setOvMarkupPct(v); setOvPrecio(""); setOvUtilidadMonto(""); setOvUtilidadPct(""); }}
            onResetPrecio={() => { setOvPrecio(""); setOvUtilidadMonto(""); setOvUtilidadPct(""); setOvMarkupPct(""); }}
          />
        </div>

        <div>
          <div className="card p-5 space-y-4">
            <p className="text-xs font-semibold text-xeryus-muted uppercase tracking-widest">
              Al registrar
            </p>

            <div>
              <label className="text-xs font-semibold text-xeryus-muted uppercase tracking-widest block mb-2">
                Proyecto
              </label>
              <div className="input-mapped text-sm">
                {propuestaSeleccionada?.proyecto || <span className="text-xeryus-muted/50">— desde Notion —</span>}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-xeryus-muted uppercase tracking-widest block mb-2">
                Notas
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones internas..."
                rows={3}
                className="input-field text-sm resize-none"
              />
            </div>

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
              disabled={registrando || (resultado?.ok === true && !cotizacionId && !initialData?.cotizacionPageId)}
              className="btn-primary w-full py-3 text-base"
            >
              {registrando
                ? "Guardando..."
                : resultado?.ok
                  ? cotizacionId || initialData?.cotizacionPageId ? "✓ Actualizada" : "✓ Registrada"
                  : cotizacionId || initialData?.cotizacionPageId ? "Actualizar cotización" : "Registrar cotización"}
            </button>

            <div className="border-t border-xeryus-border pt-3">
              <p className="text-xs text-xeryus-muted mb-2">Si Notion falla:</p>
              <button
                type="button"
                onClick={copiarDesglose}
                className="w-full py-2.5 text-sm font-semibold text-white border-2 border-xeryus-border rounded-xl hover:border-xeryus-red hover:bg-xeryus-red/10 transition-all"
              >
                📋 Copiar desglose completo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
