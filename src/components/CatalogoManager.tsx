"use client";
import { useState } from "react";
import { formatMXN } from "@/lib/pricing";
import type { CatalogoData, Servicio } from "@/types";

interface Props {
  initialCatalogo: CatalogoData;
}

function emptyServicio(categoria: string): Servicio {
  return {
    id: crypto.randomUUID(),
    categoria,
    nombre: "",
    descripcion: "",
    desglose: "",
    precio: 0,
    unidad: "proyecto",
    aporte_pm: 0,
  };
}

export default function CatalogoManager({ initialCatalogo }: Props) {
  const [catalogo, setCatalogo] = useState<CatalogoData>(initialCatalogo);
  const [activeTab, setActiveTab] = useState(initialCatalogo.categorias[0] ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Servicio | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [newServicio, setNewServicio] = useState<Servicio | null>(null);
  const [newCategoria, setNewCategoria] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);

  const serviciosActivos = catalogo.servicios.filter((s) => s.categoria === activeTab);

  async function saveCatalog(data: CatalogoData) {
    setSaving(true);
    setSavedMsg("");
    try {
      const res = await fetch("/api/catalogo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSavedMsg("Guardado");
        setTimeout(() => setSavedMsg(""), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(s: Servicio) {
    setEditingId(s.id);
    setEditData({ ...s });
  }

  function handleSaveEdit() {
    if (!editData) return;
    const updated = { ...catalogo, servicios: catalogo.servicios.map((s) => (s.id === editData.id ? editData : s)) };
    setCatalogo(updated);
    setEditingId(null);
    setEditData(null);
    saveCatalog(updated);
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este servicio?")) return;
    const updated = { ...catalogo, servicios: catalogo.servicios.filter((s) => s.id !== id) };
    setCatalogo(updated);
    saveCatalog(updated);
  }

  function handleSaveNew() {
    if (!newServicio || !newServicio.nombre) return;
    const updated = { ...catalogo, servicios: [...catalogo.servicios, newServicio] };
    setCatalogo(updated);
    setNewServicio(null);
    saveCatalog(updated);
  }

  function handleAddCategoria() {
    if (!newCategoria.trim()) return;
    const updated = { ...catalogo, categorias: [...catalogo.categorias, newCategoria.trim()] };
    setCatalogo(updated);
    setActiveTab(newCategoria.trim());
    setNewCategoria("");
    setShowNewCat(false);
    saveCatalog(updated);
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 items-center">
        {catalogo.categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveTab(cat); setNewServicio(null); setEditingId(null); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
              activeTab === cat
                ? "bg-xeryus-red text-white shadow-lg shadow-xeryus-red/20"
                : "bg-xeryus-card text-xeryus-muted border border-xeryus-border hover:border-xeryus-red/50 hover:text-white"
            }`}
          >
            {cat}
            <span className="ml-1.5 text-xs opacity-60">
              ({catalogo.servicios.filter((s) => s.categoria === cat).length})
            </span>
          </button>
        ))}

        {showNewCat ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newCategoria}
              onChange={(e) => setNewCategoria(e.target.value)}
              placeholder="Nombre de categoría"
              className="input-field text-sm w-48 py-1.5"
              onKeyDown={(e) => e.key === "Enter" && handleAddCategoria()}
            />
            <button onClick={handleAddCategoria} className="btn-primary text-xs py-1.5 px-3">Agregar</button>
            <button onClick={() => setShowNewCat(false)} className="text-xeryus-muted hover:text-white text-sm transition-colors">×</button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewCat(true)}
            className="px-3 py-1.5 rounded-full text-sm text-xeryus-red border border-dashed border-xeryus-red/40 hover:border-xeryus-red hover:bg-xeryus-red/10 transition-colors"
          >
            + Categoría
          </button>
        )}

        {savedMsg && <span className="text-xs text-green-400 font-medium ml-2">✓ {savedMsg}</span>}
        {saving && <span className="text-xs text-xeryus-muted ml-2">Guardando...</span>}
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="section-header justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-xeryus-red" />
            {activeTab}
          </div>
          <button
            onClick={() => setNewServicio(emptyServicio(activeTab))}
            className="text-xs bg-white/10 hover:bg-xeryus-red text-white px-3 py-1 rounded-full transition-colors font-normal"
          >
            + Nuevo servicio
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-xeryus-border">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider">Servicio</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider hidden md:table-cell">Descripción</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider w-24">Unidad</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider w-28">Precio</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider w-24">Aporte PM</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {newServicio && (
                <NewRow
                  servicio={newServicio}
                  onChange={setNewServicio}
                  onSave={handleSaveNew}
                  onCancel={() => setNewServicio(null)}
                />
              )}
              {serviciosActivos.map((s) =>
                editingId === s.id && editData ? (
                  <EditRow
                    key={s.id}
                    servicio={editData}
                    onChange={setEditData}
                    onSave={handleSaveEdit}
                    onCancel={() => { setEditingId(null); setEditData(null); }}
                  />
                ) : (
                  <tr key={s.id} className="border-b border-xeryus-border hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{s.nombre}</p>
                      {s.desglose && <p className="text-xs text-xeryus-muted">{s.desglose}</p>}
                    </td>
                    <td className="px-4 py-3 text-xeryus-muted text-xs hidden md:table-cell max-w-xs">{s.descripcion}</td>
                    <td className="px-4 py-3 text-center text-xeryus-muted text-xs">{s.unidad}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white tabular-nums">{formatMXN(s.precio)}</td>
                    <td className="px-4 py-3 text-right text-xeryus-muted tabular-nums text-xs">
                      {s.aporte_pm > 0 ? formatMXN(s.aporte_pm) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 justify-end">
                        <button onClick={() => handleEdit(s)} className="text-xs text-xeryus-muted hover:text-xeryus-red transition-colors font-medium">Editar</button>
                        <button onClick={() => handleDelete(s.id)} className="text-xs text-xeryus-muted hover:text-xeryus-red transition-colors font-medium">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>

          {serviciosActivos.length === 0 && !newServicio && (
            <div className="text-center py-10 text-xeryus-muted text-sm">
              Sin servicios en esta categoría.{" "}
              <button onClick={() => setNewServicio(emptyServicio(activeTab))} className="text-xeryus-red hover:underline">
                Agregar uno
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Fila de edición ────────────────────────────────────────────────────────

function EditRow({ servicio, onChange, onSave, onCancel }: {
  servicio: Servicio; onChange: (s: Servicio) => void; onSave: () => void; onCancel: () => void;
}) {
  return (
    <tr className="bg-xeryus-redDark/10 border-b border-xeryus-redDark/30">
      <td className="px-4 py-2" colSpan={2}>
        <input className="input-field text-xs py-1.5 mb-1.5" value={servicio.nombre}
          onChange={(e) => onChange({ ...servicio, nombre: e.target.value })} placeholder="Nombre del servicio" />
        <input className="input-field text-xs py-1.5" value={servicio.descripcion}
          onChange={(e) => onChange({ ...servicio, descripcion: e.target.value })} placeholder="Descripción" />
      </td>
      <td className="px-4 py-2">
        <input className="input-field text-xs py-1.5 text-center" value={servicio.unidad}
          onChange={(e) => onChange({ ...servicio, unidad: e.target.value })} placeholder="unidad" />
      </td>
      <td className="px-4 py-2">
        <input type="number" className="input-field text-xs py-1.5 text-right" value={servicio.precio}
          onChange={(e) => onChange({ ...servicio, precio: Number(e.target.value) })} min={0} />
      </td>
      <td className="px-4 py-2">
        <input type="number" className="input-field text-xs py-1.5 text-right" value={servicio.aporte_pm}
          onChange={(e) => onChange({ ...servicio, aporte_pm: Number(e.target.value) })} min={0} />
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-1.5 justify-end">
          <button onClick={onSave} className="btn-primary text-xs py-1 px-2">Guardar</button>
          <button onClick={onCancel} className="btn-ghost text-xs py-1 px-2">Cancelar</button>
        </div>
      </td>
    </tr>
  );
}

function NewRow({ servicio, onChange, onSave, onCancel }: {
  servicio: Servicio; onChange: (s: Servicio | null) => void; onSave: () => void; onCancel: () => void;
}) {
  return (
    <tr className="bg-green-950/20 border-b border-green-900/30">
      <td className="px-4 py-2" colSpan={2}>
        <input autoFocus className="input-field text-xs py-1.5 mb-1.5" value={servicio.nombre}
          onChange={(e) => onChange({ ...servicio, nombre: e.target.value })} placeholder="Nombre del servicio *" />
        <input className="input-field text-xs py-1.5" value={servicio.descripcion}
          onChange={(e) => onChange({ ...servicio, descripcion: e.target.value })} placeholder="Descripción" />
      </td>
      <td className="px-4 py-2">
        <input className="input-field text-xs py-1.5 text-center" value={servicio.unidad}
          onChange={(e) => onChange({ ...servicio, unidad: e.target.value })} placeholder="unidad" />
      </td>
      <td className="px-4 py-2">
        <input type="number" className="input-field text-xs py-1.5 text-right" value={servicio.precio}
          onChange={(e) => onChange({ ...servicio, precio: Number(e.target.value) })} min={0} />
      </td>
      <td className="px-4 py-2">
        <input type="number" className="input-field text-xs py-1.5 text-right" value={servicio.aporte_pm}
          onChange={(e) => onChange({ ...servicio, aporte_pm: Number(e.target.value) })} min={0} />
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-1.5 justify-end">
          <button onClick={onSave} className="btn-primary text-xs py-1 px-2 bg-green-700 hover:bg-green-600">Agregar</button>
          <button onClick={onCancel} className="btn-ghost text-xs py-1 px-2">×</button>
        </div>
      </td>
    </tr>
  );
}
