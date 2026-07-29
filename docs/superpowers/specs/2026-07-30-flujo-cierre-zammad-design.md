# Ajustes app MDA — flujo de cierre de caso, tarjeta PDV ampliada (demo Zammad)

**Fecha:** 30/07/2026
**Origen:** Brief "Ajustes a la app MDA (mda-seac.vercel.app)" del 30/07/2026
**Alcance:** Solo cambios visuales/UX para la demo de hoy. No se conecta ningún webhook nuevo de creación de tickets — eso queda para una etapa posterior.

## Contexto

La app ya funciona embebida en Tawk.to (URL Tab) y crea "casos" contra un webhook viejo (`guardar-caso`, mesadb). Este spec cubre los ajustes puntuales pedidos para mostrar hoy el flujo pensado para Zammad, sin todavía conectar la creación real de tickets (excepto lo que ya funcionaba antes, que no se toca).

## 1. Flujo "¿Qué hacemos con este caso?"

Reemplaza los dos selectores actuales (`resuelto` + `derivado_a`) por un único selector secuencial.

**Paso 1 — selector único**, nombre de campo `accion_caso`, 3 opciones:
- `Ya se resolvió`
- `Necesita seguimiento`
- `Derivar a otro sector`

**Paso 2 — contenido condicional según `accion_caso`:**

| Valor | Qué se muestra | Qué pasaría al guardar (simulado) |
|---|---|---|
| Ya se resolvió | Nada más | Mesa de Ayuda, estado cerrado |
| Necesita seguimiento | Nada más | Mesa de Ayuda, estado abierto, asignado al agente logueado |
| Derivar a otro sector | Selector `Sector destino` | Ver tabla siguiente |

**Selector `Sector destino`** (solo visible si `accion_caso === "Derivar a otro sector"`):
- `Servicio Técnico` — activo, sí "crea" ticket (simulado, toast normal)
- `Comercial (próxima etapa)` — próxima etapa
- `Administración de Ventas (próxima etapa)` — próxima etapa
- `Logística (próxima etapa)` — próxima etapa

**Caso especial — Comercial:** si `sector_destino === "Comercial"`, se muestra automáticamente un campo de solo lectura:
```
Se va a notificar a: {nombre_vendedor}
```
Usa el mismo dato que ya trae la tarjeta del PDV (campo que hoy se llama EECC, ver sección 3).

## 2. Comportamiento del botón "Guardar caso" (solo simulado, no llama webhook nuevo)

No se integra ningún webhook nuevo hoy. Al hacer click en "Guardar caso":

- Si `accion_caso` es "Ya se resolvió" o "Necesita seguimiento", o `sector_destino` es "Servicio Técnico" → toast de éxito genérico (mismo toast que ya existe hoy), sin llamar a ningún endpoint todavía.
- Si `sector_destino` es uno de los "próxima etapa" (Comercial, Administración de Ventas, Logística) → toast distinto, simulando la notificación:
  `✓ Guardado. Se notificará a {nombre_vendedor} cuando esta etapa esté activa.`
  (si no hay `nombre_vendedor` disponible, usar un texto genérico sin el nombre)

Dejar un comentario en el código:
```js
// TODO: decidir mail vs ticket Zammad para sectores no onboarded — ver brief 30/07
```

El webhook viejo (`guardar-caso`) **se deja de llamar** — el submit pasa a ser 100% simulado por ahora, ya que el objetivo de hoy es mostrar el flujo, no persistir nada real.

## 3. Tarjeta de datos del PDV — campos ampliados

Se reemplaza el array hardcodeado de campos por una config declarativa:

```js
const CAMPOS_PDV = [
  { campo: "pdv",            titulo: "PDV",           seccion: "principal" },
  { campo: "cliente",        titulo: "Cliente",       seccion: "principal" },
  { campo: "canal",          titulo: "Canal",         seccion: "principal" },
  { campo: "localidad",      titulo: "Localidad",     seccion: "principal" },
  { campo: "provincia",      titulo: "Provincia",     seccion: "principal" },
  { campo: "perfil",         titulo: "Tipo de cliente", seccion: "principal" },
  { campo: "nombre_vendedor",titulo: "Comercial",     seccion: "principal" },
  { campo: "cpu",            titulo: "CPU",                    seccion: "equipamiento" },
  { campo: "nro_pos",        titulo: "POS",                    seccion: "equipamiento" },
  { campo: "lg_sube",        titulo: "LG SUBE",                seccion: "equipamiento" },
  { campo: "limite_credito", titulo: "Límite de Crédito",      seccion: "equipamiento" },
  { campo: "max_deposito",   titulo: "Máximo Depósito",        seccion: "equipamiento" },
  { campo: "max_deposito_diario", titulo: "Máximo Depósito Diario", seccion: "equipamiento" },
];
```

- Sección `principal`: se muestra siempre, igual que hoy (grid de datos).
- Sección `equipamiento`: nueva, colapsada por defecto detrás de un toggle "Ver equipamiento ▾" / "Ocultar equipamiento ▴".
- El componente que renderiza la tarjeta itera sobre `CAMPOS_PDV` agrupando por `seccion` — agregar un campo nuevo en el futuro es agregar una línea al array.
- "Sub Cliente" sigue sin dato real (la fuente no lo tiene todavía) — se mantiene como hoy, sin romper el layout.

**Renombres de título** (dato ya existía, cambia el label visible):
- "Perfil" → "Tipo de cliente"
- "EECC" → "Comercial"

## 4. Fuente de datos — ampliar el query de n8n

El workflow `MDA - Buscar Cliente` (n8n, id `hEUaW0rU7hdJ5yFW`) consulta `ventas_pos`. Se amplía el `SELECT` para traer las columnas nuevas que ya existen en la tabla (confirmadas en sesión anterior vía `\d ventas_pos`):

```sql
SELECT DISTINCT
  id_expendedora        as "PUNTO DE VENTA",
  cliente                as "CLIENTE",
  NULL                    as "SUB CLIENTE",
  canal                   as "CANAL",
  localidad               as "LOCALIDAD",
  provincia               as "PROVINCIA",
  perfil_comercial        as "PERFIL",
  nombre_vendedor         as "NOMBRE DEL COMERCIAL",
  cpu                     as "CPU",
  nro_pos                 as "POS",
  lg_sube                 as "LG SUBE",
  limite_credito          as "LIMITE CREDITO",
  max_deposito            as "MAXIMO DEPOSITO",
  max_deposito_diario     as "MAXIMO DEPOSITO DIARIO"
FROM ventas_pos
WHERE (
  CAST(id_expendedora AS TEXT) ILIKE '%' || $1 || '%'
  OR UPPER(cliente) ILIKE '%' || UPPER($1) || '%'
)
LIMIT 10
```

Nota: `lg_sube` es el nombre asumido según el brief ("confirmar nombre exacto del campo contra la base") — si al aplicar el cambio en n8n el nombre real de columna es distinto, ajustar ahí mismo (no bloquea el resto del trabajo, es una sola línea de SQL).

Una sola llamada al webhook sigue trayendo todo (comportamiento actual, confirmado por el usuario — no se parte en dos pasos).

## 5. Colapsos de espacio

**Buscador de cliente:** una vez seleccionado un PDV (`form.cliente` tiene valor), el input de búsqueda se reemplaza por una línea compacta:
```
PDV {pdv} — {cliente} · Cambiar
```
Al click en "Cambiar" vuelve a mostrarse el input de búsqueda vacío (permite buscar de nuevo).

**Tarjeta de datos del PDV:** permanece siempre visible una vez cargada — **no se colapsa**, porque el agente la consulta durante toda la gestión del chat en Tawk.to. Esto aplica también a la sección "equipamiento" una vez que el agente la abre manualmente (se mantiene abierta hasta que el agente la cierre, no se auto-colapsa).

**Agente:** una vez seleccionado, se compacta a una línea:
```
Agente: {nombre} ✎
```
Click en el lápiz vuelve a mostrar el selector.

## 6. Qué NO cambia

- Selector de agente sigue siendo lista simple, no login real.
- Modo oscuro, estilo de tarjetas celestes, tipografía Poppins — sin cambios.
- Producto, Tipo de Consulta, Error específico, Descripción, Notas internas — sin cambios funcionales (solo heredan la compactación visual ya aplicada el 23/07).
- El webhook `guardar-caso` no se borra del código fuente pero deja de invocarse desde el submit (ver sección 2) — queda mockeado.

## Fuera de alcance (explícitamente, para esta demo)

- Crear tickets reales en Zammad para "Servicio Técnico" (el brief lo describe como comportamiento futuro deseado; hoy todo el submit es simulado).
- Envío de mail real a vendedores/EECC.
- Decisión mail vs. ticket Zammad para sectores no onboarded (queda como TODO en código).
- Confirmar el nombre exacto de columna `lg_sube` contra la base (ajuste menor, no bloqueante).
