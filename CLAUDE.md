# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server (suele usar puerto 3001 si 3000 está ocupado)
npm run build    # build de producción
npm run lint     # eslint
```

No hay tests automatizados.

## Stack

Next.js 14 App Router · TypeScript · Tailwind CSS v3 · `@notionhq/client` v2.2.15

## Architecture

**Data flow**: Notion BD → API routes (Server) → Client components

- `src/types/index.ts` — todas las interfaces y constantes (`CLASES_CONFIG`, `PM_BASE`, `PRESENTACION_COSTO`)
- `src/lib/pricing.ts` — `calcularCotizacion()` (lógica de precios) y `formatMXN()`
- `src/lib/notion.ts` — todas las llamadas a Notion API (`getPropuestas`, `crearPaginaDesglose`, etc.)
- `src/lib/catalog-data.ts` — catálogo inicial de servicios; en runtime se sobrescribe con `data/catalogo.json` (gitignored)

**API routes** (`src/app/api/`):
- `GET /api/propuestas` — lista propuestas desde Notion BD (sin filtro, orden `last_edited_time` desc)
- `POST /api/cotizaciones` — crea Desglose en Notion, actualiza Propuesta, guarda en BD Cotizaciones
- `GET|PUT /api/catalogo` — lee/escribe `data/catalogo.json`

**Pages** (Server Components):
- `/` — renderiza `<CotizadorForm>` con el catálogo cargado server-side
- `/historial` — tabla de cotizaciones desde Notion BD Cotizaciones
- `/catalogo` — CRUD de servicios vía `<CatalogoManager>`

**Client components clave**:
- `CotizadorForm` — estado central de la cotización; maneja overrides por línea y calcula valores efectivos
- `ResumenPrecio` — muestra breakdown con filas editables inline; recibe valores efectivos + callbacks de override
- `TablaServicios` — filas dinámicas de servicios con cascada categoría → servicio

## Pricing model

`totalCostos = servicios + plazas + PM + presentación + participación`

`precioFinal = totalCostos / (1 - utilidad%)` donde utilidad% depende de Clase (A=50%, B=40%, C=30%)

PM = max(suma de `aporte_pm` de servicios, `PM_BASE` = $4,800)

Participación por clase: A=$15,000, B=$10,000, C=$5,000

## Notion field types (propuestas BD)

- `Contacto` → tipo **relation** (se resuelven las páginas relacionadas con `pages.retrieve`)
- `Empresa` → tipo **rollup** de Contacto
- `Estado` → tipo **status** (no `select` — el filtro por status causó errores de validación, por eso se trae todo sin filtro)

## .env.local required

```
NOTION_TOKEN=
NOTION_PROPUESTAS_DB_ID=
NOTION_COTIZACIONES_DB_ID=
```

## Rules (user-defined)

1. Think before acting. Read existing files before writing code.
2. Be concise in output but thorough in reasoning.
3. Prefer editing over rewriting whole files.
4. Do not re-read files you have already read unless the file may have changed.
5. Test your code before declaring done.
6. No sycophantic openers or closing fluff.
7. Keep solutions simple and direct.
8. User instructions always override this file.
