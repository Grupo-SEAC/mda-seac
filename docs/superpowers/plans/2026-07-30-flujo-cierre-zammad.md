# Flujo de cierre de caso y tarjeta PDV ampliada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el flujo de cierre de caso (resuelto/derivado) por un selector secuencial acción→sector, ampliar la tarjeta de datos del PDV con campos nuevos y una sección de equipamiento colapsable, y simular el guardado (sin llamar a ningún webhook todavía) — todo para la demo de hoy embebida en Tawk.to.

**Architecture:** Componente único `App.js` (React, sin router ni componentes separados — se mantiene el patrón existente del archivo). Un workflow externo de n8n amplía qué datos trae el autocomplete. No se agregan dependencias nuevas.

**Tech Stack:** React 19 (create-react-app), axios, CSS-in-JS inyectado vía `<style>` (patrón ya existente en el archivo, no se cambia).

## Global Constraints

- Spec fuente: `docs/superpowers/specs/2026-07-30-flujo-cierre-zammad-design.md`
- Todo el trabajo de frontend es en `src/App.js` — es el único componente de la app, no se crean archivos nuevos.
- El botón "Guardar caso" queda **100% simulado** — ningún task de este plan conecta un webhook de creación de ticket. El webhook viejo `guardar-caso` deja de invocarse.
- No hay suite de tests de componente para esta UI (el único test, `src/App.test.js`, es el boilerplate de create-react-app y ya está roto/desactualizado — está fuera de alcance, no se toca). La verificación de cada task es manual, contra el servidor de desarrollo local (`npm start`) usando el navegador — cada task detalla los pasos exactos a probar y el resultado esperado.
- Mantener el lenguaje visual existente (tarjetas celestes, Poppins, modo oscuro) — no se toca el sistema de diseño, solo se agregan clases CSS puntuales donde el spec lo requiere.
- Nombre de columna confirmado por el usuario: `lgsube` (no `lg_sube`).

---

## Task 1: Ampliar el query de n8n para traer los campos nuevos del PDV

**Sistema:** Workflow de n8n `MDA - Buscar Cliente` (id `hEUaW0rU7hdJ5yFW`), nodo Postgres `Consultar Ventas`. No es un archivo del repo — se edita directamente en n8n.

**Interfaces:**
- Produce: el webhook `GET https://n8n.gruposeac.online/webhook/buscar-cliente?q=...` ahora devuelve, además de los campos actuales, las keys: `LOCALIDAD`, `PROVINCIA`, `CPU`, `POS`, `LG SUBE`, `LIMITE CREDITO`, `MAXIMO DEPOSITO`, `MAXIMO DEPOSITO DIARIO`.

- [ ] **Step 1: Abrir el workflow en n8n**

Ir a `https://n8n.gruposeac.online/workflow/hEUaW0rU7hdJ5yFW` y abrir el nodo **"Consultar Ventas"**.

- [ ] **Step 2: Reemplazar el contenido completo del campo Query por:**

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
  lgsube                  as "LG SUBE",
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

- [ ] **Step 3: Guardar el workflow** (el botón "Save" de n8n; el workflow ya está activo, el cambio aplica de inmediato al webhook en producción).

- [ ] **Step 4: Verificar con curl**

```bash
curl "https://n8n.gruposeac.online/webhook/buscar-cliente?q=95516"
```

Expected: JSON con un array de objetos donde cada objeto incluye las keys `LOCALIDAD`, `PROVINCIA`, `CPU`, `POS`, `LG SUBE`, `LIMITE CREDITO`, `MAXIMO DEPOSITO`, `MAXIMO DEPOSITO DIARIO` (con valor, `null`, o cadena vacía — no deben faltar las keys). Ajustar el `q=` al PDV o texto de cliente que se sepa que existe en `ventas_pos`.

No hay commit — este cambio vive en n8n, no en el repositorio.

---

## Task 2: Ampliar datos del PDV — estado, mapeo y tarjeta con sección Equipamiento colapsable

**Files:**
- Modify: `src/App.js`

**Interfaces:**
- Consumes: respuesta ampliada del webhook `buscar-cliente` (Task 1) — keys `LOCALIDAD`, `PROVINCIA`, `CPU`, `POS`, `LG SUBE`, `LIMITE CREDITO`, `MAXIMO DEPOSITO`, `MAXIMO DEPOSITO DIARIO`.
- Produces: campos de estado `form.localidad`, `form.provincia`, `form.cpu`, `form.nro_pos`, `form.lgsube`, `form.limite_credito`, `form.max_deposito`, `form.max_deposito_diario`; estado `equipamientoAbierto` (boolean); constante `CAMPOS_PDV`. Tasks posteriores (3, 3-bis reset en Task 6) consumen estos nombres de campo.

- [ ] **Step 1: Agregar la constante `CAMPOS_PDV`**

En `src/App.js`, después de la línea de `DERIVADO` (línea 12: `const DERIVADO = [...]`), agregar:

```js

// Config declarativa de los campos de la tarjeta del PDV — para sumar un
// campo nuevo en el futuro alcanza con agregar una línea acá, no hace
// falta tocar el JSX de la tarjeta.
const CAMPOS_PDV = [
  { campo: "pdv", titulo: "PDV", seccion: "principal" },
  { campo: "cliente", titulo: "Cliente", seccion: "principal" },
  { campo: "sub_cliente", titulo: "Sub Cliente", seccion: "principal" },
  { campo: "canal", titulo: "Canal", seccion: "principal" },
  { campo: "localidad", titulo: "Localidad", seccion: "principal" },
  { campo: "provincia", titulo: "Provincia", seccion: "principal" },
  { campo: "perfil", titulo: "Tipo de cliente", seccion: "principal" },
  { campo: "eecc", titulo: "Comercial", seccion: "principal" },
  { campo: "cpu", titulo: "CPU", seccion: "equipamiento" },
  { campo: "nro_pos", titulo: "POS", seccion: "equipamiento" },
  { campo: "lgsube", titulo: "LG SUBE", seccion: "equipamiento" },
  { campo: "limite_credito", titulo: "Límite de Crédito", seccion: "equipamiento" },
  { campo: "max_deposito", titulo: "Máximo Depósito", seccion: "equipamiento" },
  { campo: "max_deposito_diario", titulo: "Máximo Depósito Diario", seccion: "equipamiento" },
];
```

- [ ] **Step 2: Agregar CSS para el toggle de equipamiento**

Ubicar el bloque `.dato-item span { ... }` (dentro de la sección `/* Grilla de datos autocompletos del cliente seleccionado */`) y agregar inmediatamente después:

```css

  /* Toggle colapsable de la sección Equipamiento */
  .btn-equipamiento {
    display: block;
    width: 100%;
    background: none;
    border: 1px dashed var(--line);
    border-radius: var(--radius);
    padding: 6px 10px;
    font-family: 'Poppins', sans-serif;
    font-size: 10px;
    font-weight: 600;
    color: var(--accent);
    cursor: pointer;
    margin-bottom: 10px;
    transition: var(--transition);
  }
  .btn-equipamiento:hover { background: var(--accent-bg); }
  .datos-equipamiento { margin-top: -4px; }
```

- [ ] **Step 3: Agregar el estado `equipamientoAbierto`**

Ubicar `const [enviando, setEnviando] = useState(false);` y agregar la línea siguiente después del bloque `useState(form)` que lo acompaña:

```js
  const [equipamientoAbierto, setEquipamientoAbierto] = useState(false);
```

(va justo después del cierre `});` del `useState(form)`, antes del comentario `// Ref para detectar clicks fuera del dropdown y cerrarlo`)

- [ ] **Step 4: Ampliar el estado inicial `form`**

Reemplazar:

```js
  const [form, setForm] = useState({
    agente: "", pdv: "", cliente: "", sub_cliente: "",
    canal: "", perfil: "", eecc: "", producto: "", tipo: "",
    error_especifico: "", descripcion: "", resuelto: "",
    derivado_a: "", notas: "",
  });
```

Por:

```js
  const [form, setForm] = useState({
    agente: "", pdv: "", cliente: "", sub_cliente: "",
    canal: "", localidad: "", provincia: "", perfil: "", eecc: "",
    cpu: "", nro_pos: "", lgsube: "", limite_credito: "",
    max_deposito: "", max_deposito_diario: "",
    producto: "", tipo: "",
    error_especifico: "", descripcion: "", resuelto: "",
    derivado_a: "", notas: "",
  });
```

(los campos `resuelto`/`derivado_a` se reemplazan en el Task 5 — no tocarlos acá)

- [ ] **Step 5: Ampliar `seleccionar()` para mapear los campos nuevos**

Reemplazar:

```js
  function seleccionar(item) {
    setForm(f => ({
      ...f,
      pdv: item["PUNTO DE VENTA"] || "",
      cliente: item["CLIENTE"] || "",
      sub_cliente: item["SUB CLIENTE"] || "",
      canal: item["CANAL"] || "",
      perfil: item["PERFIL"] || "",
      eecc: item["NOMBRE DEL COMERCIAL"] || "",
    }));
    setBusqueda(item["PUNTO DE VENTA"] + " — " + item["CLIENTE"]);
    setSugerencias([]);
  }
```

Por:

```js
  function seleccionar(item) {
    setForm(f => ({
      ...f,
      pdv: item["PUNTO DE VENTA"] || "",
      cliente: item["CLIENTE"] || "",
      sub_cliente: item["SUB CLIENTE"] || "",
      canal: item["CANAL"] || "",
      localidad: item["LOCALIDAD"] || "",
      provincia: item["PROVINCIA"] || "",
      perfil: item["PERFIL"] || "",
      eecc: item["NOMBRE DEL COMERCIAL"] || "",
      cpu: item["CPU"] || "",
      nro_pos: item["POS"] || "",
      lgsube: item["LG SUBE"] || "",
      limite_credito: item["LIMITE CREDITO"] || "",
      max_deposito: item["MAXIMO DEPOSITO"] || "",
      max_deposito_diario: item["MAXIMO DEPOSITO DIARIO"] || "",
    }));
    setBusqueda(item["PUNTO DE VENTA"] + " — " + item["CLIENTE"]);
    setSugerencias([]);
  }
```

- [ ] **Step 6: Reemplazar el bloque de datos-cliente en el JSX**

Reemplazar:

```jsx
        {/* Datos autocompletos — solo se muestran cuando hay cliente seleccionado */}
        {form.cliente && (
          <div className="datos-cliente">
            {[
              ["PDV", form.pdv],
              ["Cliente", form.cliente],
              ["Sub cliente", form.sub_cliente],
              ["Canal", form.canal],
              ["Perfil", form.perfil],
              ["EECC", form.eecc],
            ].map(([l, v]) => (
              <div className="dato-item" key={l}>
                <label>{l}</label>
                <span>{v || "—"}</span>
              </div>
            ))}
          </div>
        )}
```

Por:

```jsx
        {/* Datos autocompletos — solo se muestran cuando hay cliente seleccionado */}
        {form.cliente && (
          <>
            <div className="datos-cliente">
              {CAMPOS_PDV.filter(c => c.seccion === "principal").map(c => (
                <div className="dato-item" key={c.campo}>
                  <label>{c.titulo}</label>
                  <span>{form[c.campo] || "—"}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn-equipamiento"
              onClick={() => setEquipamientoAbierto(a => !a)}
            >
              {equipamientoAbierto ? "Ocultar equipamiento ▴" : "Ver equipamiento ▾"}
            </button>

            {equipamientoAbierto && (
              <div className="datos-cliente datos-equipamiento">
                {CAMPOS_PDV.filter(c => c.seccion === "equipamiento").map(c => (
                  <div className="dato-item" key={c.campo}>
                    <label>{c.titulo}</label>
                    <span>{form[c.campo] || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
```

- [ ] **Step 7: Verificar en el navegador**

Arrancar el servidor si no está corriendo (`npm start` o el preview configurado) y en `http://localhost:3001` (o el puerto activo):

1. Escribir en el buscador un PDV/cliente que exista en `ventas_pos` y seleccionarlo.
2. Confirmar que la tarjeta muestra: PDV, Cliente, Sub Cliente, Canal, **Localidad**, **Provincia**, **Tipo de cliente** (antes "Perfil"), **Comercial** (antes "EECC").
3. Confirmar que aparece el botón "Ver equipamiento ▾" y que la sección de equipamiento NO se ve todavía.
4. Click en "Ver equipamiento ▾" → confirmar que aparecen CPU, POS, LG SUBE, Límite de Crédito, Máximo Depósito, Máximo Depósito Diario, y el botón cambia a "Ocultar equipamiento ▴".
5. Click de nuevo → se oculta.

- [ ] **Step 8: Commit**

```bash
git add src/App.js
git commit -m "$(cat <<'EOF'
Ampliar tarjeta de datos del PDV con config declarativa y equipamiento

Agrega Localidad, Provincia y renombra Perfil/EECC a Tipo de
cliente/Comercial. Suma una sección colapsable "Ver equipamiento"
con CPU, POS, LG SUBE y límites de depósito/crédito. Los campos se
arman a partir del array CAMPOS_PDV en vez de estar hardcodeados en
el JSX.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Colapsar el buscador de cliente tras seleccionar un PDV

**Files:**
- Modify: `src/App.js`

**Interfaces:**
- Consumes: `form.cliente`, `form.pdv`, `seleccionar()`, `busqueda`/`setBusqueda`, campos del PDV agregados en Task 2 (`localidad`, `provincia`, `cpu`, `nro_pos`, `lgsube`, `limite_credito`, `max_deposito`, `max_deposito_diario`), `setEquipamientoAbierto` (Task 2).
- Produces: ninguna interfaz nueva para otros tasks (UI terminal).

- [ ] **Step 1: Agregar CSS para la vista compacta del cliente**

Ubicar el bloque `.autocomplete-loading { ... }` y agregar inmediatamente después:

```css

  /* Vista compacta del cliente ya seleccionado */
  .cliente-compacto {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 7px 10px;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    margin-bottom: 10px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink);
  }
  .btn-cambiar {
    background: none;
    border: none;
    color: var(--accent);
    font-family: 'Poppins', sans-serif;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
  }
  .btn-cambiar:hover { text-decoration: underline; }
```

- [ ] **Step 2: Reemplazar el bloque del campo de búsqueda por la vista condicional**

Reemplazar:

```jsx
        <div className="field">
          <label>Buscar por PDV o nombre</label>
          {/* El ref permite detectar clicks fuera y cerrar el dropdown */}
          <div className="autocomplete-wrapper" ref={wrapperRef}>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Escribí el PDV o nombre del cliente..."
              autoComplete="off"
            />
            {cargando && <div className="autocomplete-loading">Buscando...</div>}
            {/* Dropdown de sugerencias — aparece mientras hay resultados */}
            {sugerencias.length > 0 && (
              <div className="autocomplete-dropdown">
                {sugerencias.map((s, i) => (
                  <div key={i} className="autocomplete-item" onClick={() => seleccionar(s)}>
                    <div className="autocomplete-item-pdv">PDV {s["PUNTO DE VENTA"]} — {s["CLIENTE"]}</div>
                    <div className="autocomplete-item-cliente">{s["SUB CLIENTE"]} · {s["PERFIL"]}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
```

Por:

```jsx
        {form.cliente ? (
          <div className="cliente-compacto">
            <span>PDV {form.pdv} — {form.cliente}</span>
            <button
              type="button"
              className="btn-cambiar"
              onClick={() => {
                // Limpia solo los datos del PDV — vuelve a mostrar el
                // buscador para elegir uno nuevo
                setForm(f => ({
                  ...f, pdv: "", cliente: "", sub_cliente: "", canal: "",
                  localidad: "", provincia: "", perfil: "", eecc: "",
                  cpu: "", nro_pos: "", lgsube: "", limite_credito: "",
                  max_deposito: "", max_deposito_diario: "",
                }));
                setBusqueda("");
                setEquipamientoAbierto(false);
              }}
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="field">
            <label>Buscar por PDV o nombre</label>
            {/* El ref permite detectar clicks fuera y cerrar el dropdown */}
            <div className="autocomplete-wrapper" ref={wrapperRef}>
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Escribí el PDV o nombre del cliente..."
                autoComplete="off"
              />
              {cargando && <div className="autocomplete-loading">Buscando...</div>}
              {/* Dropdown de sugerencias — aparece mientras hay resultados */}
              {sugerencias.length > 0 && (
                <div className="autocomplete-dropdown">
                  {sugerencias.map((s, i) => (
                    <div key={i} className="autocomplete-item" onClick={() => seleccionar(s)}>
                      <div className="autocomplete-item-pdv">PDV {s["PUNTO DE VENTA"]} — {s["CLIENTE"]}</div>
                      <div className="autocomplete-item-cliente">{s["SUB CLIENTE"]} · {s["PERFIL"]}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
```

- [ ] **Step 3: Verificar en el navegador**

1. Buscar y seleccionar un PDV → confirmar que el input de búsqueda desaparece y en su lugar se ve una línea "PDV {x} — {cliente} · Cambiar".
2. Confirmar que la tarjeta de datos (Task 2) sigue mostrándose debajo, sin cambios.
3. Click en "Cambiar" → confirmar que reaparece el input de búsqueda vacío y que la tarjeta de datos desaparece (porque `form.cliente` quedó vacío).
4. Buscar de nuevo y seleccionar otro PDV → confirmar que vuelve a funcionar el ciclo completo.

- [ ] **Step 4: Commit**

```bash
git add src/App.js
git commit -m "$(cat <<'EOF'
Colapsar buscador de cliente tras seleccionar un PDV

Una vez encontrado el PDV, el input de búsqueda se reemplaza por una
línea compacta con opción de "Cambiar" — libera espacio en la
columna angosta del embed de Tawk.to. La tarjeta de datos del
cliente sigue siempre visible, no se colapsa.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Colapsar el selector de Agente tras elegirlo

**Files:**
- Modify: `src/App.js`

**Interfaces:**
- Consumes: `form.agente`, `cambiar()`, `AGENTES`.
- Produces: ninguna interfaz nueva para otros tasks (UI terminal).

- [ ] **Step 1: Agregar CSS para la vista compacta del agente**

Ubicar el bloque `.btn-theme:hover { ... }` y agregar inmediatamente después:

```css

  /* Vista compacta del agente ya seleccionado */
  .agente-compacto {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink);
  }
  .btn-editar-agente {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 13px;
    cursor: pointer;
    line-height: 1;
  }
```

- [ ] **Step 2: Reemplazar la Card de Agente por la vista condicional**

Reemplazar:

```jsx
      {/* ── Card 1: Agente ── */}
      <div className="mda-card">
        <div className="section-label">Agente</div>
        <div className="field">
          <select name="agente" value={form.agente} onChange={cambiar}>
            <option value="">Seleccioná un agente...</option>
            {AGENTES.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>
```

Por:

```jsx
      {/* ── Card 1: Agente ── */}
      <div className="mda-card">
        <div className="section-label">Agente</div>
        {form.agente ? (
          <div className="agente-compacto">
            <span>Agente: {form.agente}</span>
            <button
              type="button"
              className="btn-editar-agente"
              onClick={() => setForm(f => ({ ...f, agente: "" }))}
            >
              ✎
            </button>
          </div>
        ) : (
          <div className="field">
            <select name="agente" value={form.agente} onChange={cambiar}>
              <option value="">Seleccioná un agente...</option>
              {AGENTES.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
        )}
      </div>
```

- [ ] **Step 3: Verificar en el navegador**

1. Elegir un agente del selector → confirmar que la card se compacta a "Agente: {nombre} ✎".
2. Click en el lápiz (✎) → confirmar que vuelve a mostrarse el selector, vacío.
3. Elegir un agente distinto → confirmar que vuelve a compactarse con el nombre nuevo.

- [ ] **Step 4: Commit**

```bash
git add src/App.js
git commit -m "$(cat <<'EOF'
Colapsar selector de Agente tras elegirlo

Una vez seleccionado, se compacta a una línea "Agente: nombre ✎"
para liberar espacio arriba del formulario en la columna angosta
del embed de Tawk.to. El lápiz permite volver a elegir.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Flujo "¿Qué hacemos con este caso?" — acción, sector destino y caso especial Comercial

**Files:**
- Modify: `src/App.js`

**Interfaces:**
- Consumes: `form.eecc` (Comercial del PDV, de Task 2), `cambiar()`.
- Produces: campos de estado `form.accion_caso`, `form.sector_destino`, constantes `ACCIONES_CASO`, `SECTORES_DESTINO`. Consumidos por Task 6 (validación y reset del submit).

- [ ] **Step 1: Reemplazar las constantes `RESUELTO`/`DERIVADO`**

Reemplazar:

```js
const RESUELTO = ["Sí","No","Pendiente"];
const DERIVADO = ["Nadie","Servicio Técnico","Ejecutivo de Cuentas"];
```

Por:

```js
const ACCIONES_CASO = ["Ya se resolvió", "Necesita seguimiento", "Derivar a otro sector"];
const SECTORES_DESTINO = [
  "Servicio Técnico",
  "Comercial (próxima etapa)",
  "Administración de Ventas (próxima etapa)",
  "Logística (próxima etapa)",
];
```

- [ ] **Step 2: Actualizar el estado inicial `form`**

Reemplazar (estado tal como quedó tras el Task 2):

```js
  const [form, setForm] = useState({
    agente: "", pdv: "", cliente: "", sub_cliente: "",
    canal: "", localidad: "", provincia: "", perfil: "", eecc: "",
    cpu: "", nro_pos: "", lgsube: "", limite_credito: "",
    max_deposito: "", max_deposito_diario: "",
    producto: "", tipo: "",
    error_especifico: "", descripcion: "", resuelto: "",
    derivado_a: "", notas: "",
  });
```

Por:

```js
  const [form, setForm] = useState({
    agente: "", pdv: "", cliente: "", sub_cliente: "",
    canal: "", localidad: "", provincia: "", perfil: "", eecc: "",
    cpu: "", nro_pos: "", lgsube: "", limite_credito: "",
    max_deposito: "", max_deposito_diario: "",
    producto: "", tipo: "",
    error_especifico: "", descripcion: "",
    accion_caso: "", sector_destino: "", notas: "",
  });
```

- [ ] **Step 3: Reemplazar el bloque "Resuelto y Derivar a" por el flujo nuevo**

Reemplazar:

```jsx
          {/* Resuelto y Derivar a en grilla de 2 columnas */}
          <div className="fields-grid">
            <div className="field">
              <label>¿Se resolvió?</label>
              <select
                name="resuelto"
                value={form.resuelto}
                onChange={e => {
                  // Si se resolvió, limpia el campo de derivación
                  // porque no tiene sentido derivar algo ya resuelto
                  if (e.target.value === "Sí") {
                    setForm(f => ({ ...f, resuelto: "Sí", derivado_a: "" }));
                  } else {
                    cambiar(e);
                  }
                }}
              >
                <option value="">Seleccioná...</option>
                {RESUELTO.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>

            {/* El campo de derivación solo aparece si NO se resolvió */}
            {form.resuelto !== "Sí" && (
              <div className="field">
                <label>Derivar a</label>
                <select name="derivado_a" value={form.derivado_a} onChange={cambiar}>
                  <option value="">Seleccioná...</option>
                  {DERIVADO.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Info contextual según la derivación elegida */}
          {form.derivado_a === "Ejecutivo de Cuentas" && form.eecc && (
            <div className="derivacion-info">
              Se enviará un mail a <strong>{form.eecc}@seac.com.ar</strong> con copia a su jefe.
            </div>
          )}
          {form.derivado_a === "Servicio Técnico" && (
            <div className="derivacion-info">
              Se creará un ticket en <strong>AppSheet — Servicio Técnico</strong>.
            </div>
          )}
```

Por:

```jsx
          {/* Acción sobre el caso — reemplaza los selectores viejos de resuelto/derivado */}
          <div className="field">
            <label>¿Qué hacemos con este caso?</label>
            <select
              name="accion_caso"
              value={form.accion_caso}
              onChange={e => {
                // Al cambiar de acción, se limpia el sector destino
                // para no arrastrar una selección que ya no aplica
                setForm(f => ({ ...f, accion_caso: e.target.value, sector_destino: "" }));
              }}
            >
              <option value="">Seleccioná...</option>
              {ACCIONES_CASO.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          {form.accion_caso === "Derivar a otro sector" && (
            <div className="field">
              <label>Sector destino</label>
              <select name="sector_destino" value={form.sector_destino} onChange={cambiar}>
                <option value="">Seleccioná...</option>
                {SECTORES_DESTINO.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          )}

          {/* Caso especial: derivar a Comercial avisa automáticamente a quién se notifica */}
          {form.sector_destino === "Comercial (próxima etapa)" && (
            <div className="derivacion-info">
              Se va a notificar a: <strong>{form.eecc || "—"}</strong>
            </div>
          )}

          {form.sector_destino === "Servicio Técnico" && (
            <div className="derivacion-info">
              Se creará un ticket en <strong>Zammad — Servicio Técnico</strong>.
            </div>
          )}
```

- [ ] **Step 4: Verificar en el navegador**

1. Con un PDV ya seleccionado (para tener `form.eecc` cargado), abrir "¿Qué hacemos con este caso?".
2. Elegir "Ya se resolvió" → confirmar que no aparece nada más.
3. Elegir "Necesita seguimiento" → confirmar que no aparece nada más.
4. Elegir "Derivar a otro sector" → confirmar que aparece "Sector destino".
5. En Sector destino, elegir "Servicio Técnico" → confirmar que aparece "Se creará un ticket en Zammad — Servicio Técnico".
6. Cambiar a "Comercial (próxima etapa)" → confirmar que aparece "Se va a notificar a: {nombre del comercial del PDV}" (el mismo valor que se ve en la tarjeta como "Comercial").
7. Cambiar a "Administración de Ventas (próxima etapa)" o "Logística (próxima etapa)" → confirmar que NO aparece ningún texto adicional (solo Comercial y Servicio Técnico tienen mensaje).
8. Volver a "¿Qué hacemos con este caso?" y elegir "Ya se resolvió" → confirmar que "Sector destino" y cualquier mensaje desaparecen.

- [ ] **Step 5: Commit**

```bash
git add src/App.js
git commit -m "$(cat <<'EOF'
Reemplazar selectores resuelto/derivado por flujo de acción de caso

Selector único "¿Qué hacemos con este caso?" con 3 opciones; al
elegir "Derivar a otro sector" aparece el selector de Sector
destino. Derivar a Comercial muestra automáticamente a quién se va
a notificar, usando el dato ya cargado en la tarjeta del PDV.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Botón "Guardar caso" — simulación completa, sin webhook

**Files:**
- Modify: `src/App.js`

**Interfaces:**
- Consumes: `form.agente`, `form.cliente`, `form.producto`, `form.accion_caso`, `form.sector_destino`, `form.eecc` (Task 5), todos los campos del PDV agregados en Task 2, `mostrarToast()`, `setEnviando`, `setBusqueda`, `setEquipamientoAbierto` (Task 2).
- Produces: ninguna interfaz nueva — es el punto terminal del flujo.

- [ ] **Step 1: Reemplazar la función `enviar`**

Reemplazar:

```js
  // Envío del formulario — valida campos obligatorios antes de mandar
  async function enviar(e) {
    e.preventDefault();
    if (!form.agente) return mostrarToast("Seleccioná un agente", "error");
    if (!form.cliente) return mostrarToast("Buscá y seleccioná un cliente", "error");
    if (!form.producto) return mostrarToast("Seleccioná un producto", "error");
    if (!form.resuelto) return mostrarToast("Indicá si se resolvió", "error");
    setEnviando(true);
    try {
  // Envía el caso al webhook de n8n que graba en mesadb.casos
  const { data } = await axios.post(
    "https://n8n.gruposeac.online/webhook/guardar-caso",
    form
  );
  console.log("Caso guardado:", data);
  mostrarToast(`Caso #${data.id} registrado correctamente`);
  // Limpia el formulario pero mantiene el agente seleccionado
  setForm(f => ({
    ...f, pdv: "", cliente: "", sub_cliente: "", canal: "",
    perfil: "", eecc: "", producto: "", tipo: "",
    error_especifico: "", descripcion: "", resuelto: "",
    derivado_a: "", notas: "",
  }));
  setBusqueda("");
} catch {
      mostrarToast("Error al guardar el caso", "error");
    } finally {
      setEnviando(false);
    }
  }
```

Por:

```js
  // Envío del formulario — 100% simulado para la demo de hoy, no llama
  // a ningún webhook todavía.
  // TODO: decidir mail vs ticket Zammad para sectores no onboarded — ver brief 30/07
  async function enviar(e) {
    e.preventDefault();
    if (!form.agente) return mostrarToast("Seleccioná un agente", "error");
    if (!form.cliente) return mostrarToast("Buscá y seleccioná un cliente", "error");
    if (!form.producto) return mostrarToast("Seleccioná un producto", "error");
    if (!form.accion_caso) return mostrarToast("Indicá qué hacemos con el caso", "error");
    if (form.accion_caso === "Derivar a otro sector" && !form.sector_destino) {
      return mostrarToast("Seleccioná el sector destino", "error");
    }

    setEnviando(true);

    const esProximaEtapa = form.sector_destino.includes("(próxima etapa)");

    setTimeout(() => {
      if (esProximaEtapa) {
        mostrarToast(`✓ Guardado. Se notificará a ${form.eecc || "el comercial"} cuando esta etapa esté activa.`);
      } else {
        mostrarToast("✓ Caso guardado correctamente");
      }

      // Limpia el formulario pero mantiene el agente seleccionado
      setForm(f => ({
        ...f, pdv: "", cliente: "", sub_cliente: "", canal: "",
        localidad: "", provincia: "", perfil: "", eecc: "",
        cpu: "", nro_pos: "", lgsube: "", limite_credito: "",
        max_deposito: "", max_deposito_diario: "",
        producto: "", tipo: "", error_especifico: "", descripcion: "",
        accion_caso: "", sector_destino: "", notas: "",
      }));
      setBusqueda("");
      setEquipamientoAbierto(false);
      setEnviando(false);
    }, 500);
  }
```

- [ ] **Step 2: Verificar en el navegador**

1. Intentar guardar sin elegir agente → toast de error "Seleccioná un agente".
2. Completar agente, buscar y elegir PDV, elegir producto, elegir "Ya se resolvió" → click "Guardar caso" → confirmar toast "✓ Caso guardado correctamente" y que el formulario se resetea (reaparece el buscador de cliente vacío, el agente sigue seleccionado y compacto).
3. Repetir, esta vez con "Derivar a otro sector" sin elegir sector destino → click "Guardar caso" → toast de error "Seleccioná el sector destino".
4. Repetir con "Derivar a otro sector" → "Servicio Técnico" → guardar → confirmar toast genérico "✓ Caso guardado correctamente".
5. Repetir con "Derivar a otro sector" → "Comercial (próxima etapa)" → guardar → confirmar toast "✓ Guardado. Se notificará a {nombre del comercial} cuando esta etapa esté activa.".
6. Confirmar en la pestaña de Network del navegador que **no** se dispara ningún request a `guardar-caso` al hacer click en "Guardar caso" (sí debe seguir viéndose el request a `buscar-cliente` mientras se escribe en el buscador).

- [ ] **Step 3: Commit**

```bash
git add src/App.js
git commit -m "$(cat <<'EOF'
Simular el guardado del caso — sin llamar a ningún webhook todavía

El botón "Guardar caso" deja de pegarle al webhook viejo
guardar-caso y ahora solo simula el resultado con un toast distinto
según si el sector es real (Mesa de Ayuda/Servicio Técnico) o
"próxima etapa" (Comercial y similares). Queda un TODO marcando la
decisión pendiente de mail vs. ticket Zammad para esos sectores.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Verificación final (después del Task 6)

Con el servidor de desarrollo corriendo, recorrer el flujo completo una vez de punta a punta:

1. Elegir agente → se compacta.
2. Buscar y elegir un PDV → se compacta el buscador, aparece la tarjeta con Localidad/Provincia/Tipo de cliente/Comercial.
3. Abrir "Ver equipamiento" → confirmar CPU/POS/LG SUBE/Límite de Crédito/Máximo Depósito/Máximo Depósito Diario con datos reales (verificar que Task 1 ya está aplicado en n8n).
4. Completar Producto, Tipo de consulta.
5. Elegir "Derivar a otro sector" → "Comercial (próxima etapa)" → confirmar el aviso de notificación.
6. Guardar → confirmar el toast simulado correspondiente y que el formulario vuelve a un estado limpio listo para el próximo caso, sin perder el agente.

Si los 6 pasos funcionan sin errores en consola, la demo está lista para embeber en Tawk.to.
