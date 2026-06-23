"use client";
import { formatMXN } from "@/lib/pricing";
import type { FilaCotizacion, CatalogoData } from "@/types";

interface Props {
  filas: FilaCotizacion[];
  catalogo: CatalogoData;
  onUpdate: (id: string, changes: Partial<FilaCotizacion>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

export default function TablaServicios({ filas, catalogo, onUpdate, onRemove, onAdd }: Props) {
  const categorias = catalogo.categorias;

  function handleCategoriaChange(fila: FilaCotizacion, categoria: string) {
    onUpdate(fila.id, {
      servicio: null,
      // @ts-expect-error temp marker
      _categoria: categoria,
    });
  }

  function handleServicioChange(fila: FilaCotizacion, servicioId: string) {
    const servicio = catalogo.servicios.find((s) => s.id === servicioId) ?? null;
    onUpdate(fila.id, {
      servicio,
      precioUnitario: servicio?.precio ?? 0,
      total: servicio ? servicio.precio * fila.cantidad : 0,
    });
  }

  function handleCantidadChange(fila: FilaCotizacion, cantidad: number) {
    const precio = fila.ajusteManual ?? fila.servicio?.precio ?? 0;
    onUpdate(fila.id, { cantidad, total: precio * cantidad });
  }

  function handlePrecioManual(fila: FilaCotizacion, precio: number) {
    onUpdate(fila.id, {
      ajusteManual: precio || undefined,
      precioUnitario: precio || fila.servicio?.precio || 0,
      total: (precio || fila.servicio?.precio || 0) * fila.cantidad,
    });
  }

  return (
    <div className="card overflow-hidden">
      <div className="section-header justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-xeryus-red inline-block" />
          Servicios cotizados
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="text-xs bg-white/10 hover:bg-xeryus-red text-white px-3 py-1 rounded-full transition-colors font-normal"
        >
          + Agregar servicio
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-xeryus-border">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider w-40">
                Categoría
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider">
                Servicio
              </th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider w-20">
                Cant.
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider w-30">
                Precio unit.
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-xeryus-muted uppercase tracking-wider w-28">
                Total
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => {
              // @ts-expect-error temp
              const categoriaActiva: string = fila._categoria || fila.servicio?.categoria || "";
              const serviciosDeCategoria = categoriaActiva
                ? catalogo.servicios.filter((s) => s.categoria === categoriaActiva)
                : [];

              return (
                <tr
                  key={fila.id}
                  className="border-b border-xeryus-border hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <select
                      value={categoriaActiva}
                      onChange={(e) => handleCategoriaChange(fila, e.target.value)}
                      className="input-field text-xs py-1.5"
                    >
                      <option value="">Seleccionar...</option>
                      {categorias.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-2.5">
                    <select
                      value={fila.servicio?.id ?? ""}
                      onChange={(e) => handleServicioChange(fila, e.target.value)}
                      disabled={!categoriaActiva}
                      className="input-field text-xs py-1.5"
                    >
                      <option value="">
                        {categoriaActiva ? "Seleccionar servicio..." : "— Primero elige categoría —"}
                      </option>
                      {serviciosDeCategoria.map((s) => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                    {fila.servicio?.descripcion && (
                      <p className="text-xs text-xeryus-muted mt-0.5 truncate max-w-xs">
                        {fila.servicio.descripcion}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      value={fila.cantidad}
                      min={1}
                      onChange={(e) => handleCantidadChange(fila, Number(e.target.value))}
                      className="input-field text-xs py-1.5 text-center w-16"
                    />
                    {fila.servicio?.unidad && (
                      <p className="text-xs text-xeryus-muted text-center mt-0.5">{fila.servicio.unidad}</p>
                    )}
                  </td>

                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      value={fila.ajusteManual ?? fila.servicio?.precio ?? ""}
                      placeholder={fila.servicio ? String(fila.servicio.precio) : "0"}
                      onChange={(e) => handlePrecioManual(fila, Number(e.target.value))}
                      disabled={!fila.servicio}
                      className="input-field text-xs py-1.5 text-right"
                    />
                  </td>

                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-white">
                    {fila.total > 0 ? formatMXN(fila.total) : "—"}
                  </td>

                  <td className="px-2 py-2.5">
                    <button
                      type="button"
                      onClick={() => onRemove(fila.id)}
                      className="text-xeryus-border hover:text-xeryus-red transition-colors text-lg leading-none"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filas.length === 0 && (
          <div className="text-center py-8 text-xeryus-muted text-sm">
            Sin servicios.{" "}
            <button type="button" onClick={onAdd} className="text-xeryus-red hover:underline">
              + Agregar servicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
