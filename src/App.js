import { useState, useEffect, useRef } from "react";
import axios from "axios";

// URL del webhook de n8n para buscar clientes en ventasdb
const N8N_URL = "https://n8n.gruposeac.online/webhook/buscar-cliente";

// Listas fijas de opciones para los desplegables
const AGENTES = ["Andrés Franco","Anibal Egea","Ayelen Vera","Gastón Citarella","Giselle Alvarez","Mariano Bonnet","Martín Ceballos","Pablo Molino","Vanesa Figueroa"];
const PRODUCTOS = ["Carga Virtual","SUBE","Cobro Virtual","ReSimple"];
const TIPOS = ["Reclamo","Consulta técnica","Consulta comercial","Solicitud"];
const RESUELTO = ["Sí","No","Pendiente"];
const DERIVADO = ["Nadie","Servicio Técnico","Ejecutivo de Cuentas"];

// ─── CSS del sistema de diseño SEAC ───────────────────────────────────────────
// Se inyecta programáticamente en el <head> para no mezclarlo con App.css.
// Usa variables CSS (--accent, --paper, etc.) para soportar dark mode.
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* Variables globales SEAC — light mode */
  :root {
    --ink: #1a1a2e;
    --ink-soft: #4a4870;
    --ink-muted: #9490b0;
    --paper: #eff6ff;
    --paper-dark: #dbeafe;
    --line: #bfdbfe;
    --accent: #2563eb;
    --accent-dark: #1d4ed8;
    --accent-bg: #dbeafe;
    --success: #0f6338;
    --success-bg: #d1fae5;
    --error: #a71d1d;
    --error-bg: #fdf0ee;
    --radius: 10px;
    --radius-lg: 18px;
    --transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Dark mode — se activa agregando la clase "dark" al <html> */
  html.dark {
    --ink: #e2e8f0;
    --ink-soft: #94a3b8;
    --ink-muted: #64748b;
    --paper: #0f172a;
    --paper-dark: #1e293b;
    --line: #1e3a5f;
    --accent: #3b82f6;
    --accent-dark: #2563eb;
    --accent-bg: #1e3a8a;
  }

  body {
    font-family: 'Poppins', sans-serif;
    -webkit-font-smoothing: antialiased;
    background: var(--paper);
    color: var(--ink);
    min-height: 100vh;
  }

  /* Contenedor principal centrado */
  .mda-wrapper {
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 20px 60px;
  }

  .mda-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32px;
  }

  /* Badge superior — estilo SEAC */
  .mda-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--accent);
    background: var(--accent-bg);
    padding: 4px 12px;
    border-radius: 20px;
    margin-bottom: 8px;
  }

  .mda-title {
    font-size: 24px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.02em;
  }

  /* Palabra destacada en el título — patrón SEAC con <em> */
  .mda-title em {
    font-style: normal;
    color: var(--accent);
  }

  /* Botón toggle de tema claro/oscuro */
  .btn-theme {
    background: none;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 8px 14px;
    font-family: 'Poppins', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-soft);
    cursor: pointer;
    transition: var(--transition);
  }
  .btn-theme:hover { border-color: var(--accent); color: var(--accent); }

  /* Card — contenedor de cada sección del formulario */
  .mda-card {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 24px;
    margin-bottom: 16px;
  }
  html.dark .mda-card { background: var(--paper-dark); }

  /* Etiqueta de sección — uppercase con línea inferior */
  .section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--line);
  }

  /* Campo de formulario — label + input/select/textarea */
  .field { margin-bottom: 18px; }
  .field label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-bottom: 6px;
  }
  .field input,
  .field select,
  .field textarea {
    display: block;
    width: 100%;
    padding: 10px 14px;
    font-family: 'Poppins', sans-serif;
    font-size: 13px;
    color: var(--ink);
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    outline: none;
    transition: var(--transition);
    appearance: none;
  }
  html.dark .field input,
  html.dark .field select,
  html.dark .field textarea {
    background: var(--paper);
    color: var(--ink);
  }
  /* Ring de foco — azul suave */
  .field input:focus,
  .field select:focus,
  .field textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
  }
  .field textarea { resize: vertical; min-height: 80px; }

  /* Grid de 2 columnas para campos relacionados */
  .fields-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 16px;
  }

  /* ── Autocomplete ── */
  .autocomplete-wrapper { position: relative; }

  /* Dropdown de sugerencias */
  .autocomplete-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0; right: 0;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    z-index: 100;
    max-height: 260px;
    overflow-y: auto;
  }
  html.dark .autocomplete-dropdown { background: var(--paper-dark); }

  .autocomplete-item {
    padding: 10px 14px;
    cursor: pointer;
    border-bottom: 1px solid var(--line);
    transition: background 0.15s;
  }
  .autocomplete-item:last-child { border-bottom: none; }
  .autocomplete-item:hover { background: var(--accent-bg); }
  .autocomplete-item-pdv { font-size: 13px; font-weight: 600; color: var(--ink); }
  .autocomplete-item-cliente { font-size: 12px; color: var(--ink-soft); margin-top: 2px; }
  .autocomplete-loading { font-size: 11px; color: var(--ink-muted); padding: 8px 0 0; }

  /* Grilla de datos autocompletos del cliente seleccionado */
  .datos-cliente {
    background: var(--accent-bg);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 14px 16px;
    margin-bottom: 18px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
  }
  .dato-item label {
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--ink-muted); display: block; margin-bottom: 2px;
  }
  .dato-item span { font-size: 12px; font-weight: 500; color: var(--ink); }

  /* Info contextual de derivación */
  .derivacion-info {
    background: var(--paper-dark);
    border-radius: var(--radius);
    padding: 12px 14px;
    margin-top: 12px;
    font-size: 12px;
    color: var(--ink-soft);
  }
  .derivacion-info strong { color: var(--accent); }

  /* Botón principal de envío */
  .btn-submit {
    width: 100%;
    padding: 14px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius);
    font-family: 'Poppins', sans-serif;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
    margin-top: 8px;
  }
  .btn-submit:hover { background: var(--accent-dark); }
  .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Toast de confirmación/error — aparece abajo a la derecha */
  .toast {
    position: fixed;
    bottom: 24px; right: 24px;
    padding: 14px 20px;
    border-radius: var(--radius);
    font-size: 13px; font-weight: 500;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    animation: toastIn 0.3s cubic-bezier(0.16,1,0.3,1);
    z-index: 999;
  }
  .toast.success { background: var(--success-bg); color: var(--success); }
  .toast.error { background: var(--error-bg); color: var(--error); }

  @keyframes toastIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Responsive — en mobile los grids pasan a 1 columna */
  @media (max-width: 520px) {
    .fields-grid { grid-template-columns: 1fr; }
    .datos-cliente { grid-template-columns: 1fr 1fr; }
  }
`;

export default function App() {
  // Estado del tema — se lee de localStorage para persistir entre sesiones
  const [dark, setDark] = useState(() => localStorage.getItem("seac-theme") === "dark");

  // Estados del autocomplete
  const [busqueda, setBusqueda] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Estado del toast de notificación
  const [toast, setToast] = useState(null);

  // Estado del formulario completo
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState({
    agente: "", pdv: "", cliente: "", sub_cliente: "",
    canal: "", perfil: "", eecc: "", producto: "", tipo: "",
    error_especifico: "", descripcion: "", resuelto: "",
    derivado_a: "", notas: "",
  });

  // Ref para detectar clicks fuera del dropdown y cerrarlo
  const wrapperRef = useRef(null);

  // Ref para el timer del debounce del autocomplete
  const timerRef = useRef(null);

  // Aplica/quita la clase "dark" en <html> y persiste en localStorage
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("seac-theme", dark ? "dark" : "light");
  }, [dark]);

  // Inyecta el CSS de SEAC en el <head> una sola vez (guard de duplicado)
  useEffect(() => {
    if (!document.getElementById("seac-mda-styles")) {
      const style = document.createElement("style");
      style.id = "seac-mda-styles";
      style.textContent = css;
      document.head.appendChild(style);
    }
  }, []);

  // Cierra el dropdown si el usuario hace click fuera del autocomplete
  useEffect(() => {
    function clickFuera(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setSugerencias([]);
    }
    document.addEventListener("mousedown", clickFuera);
    return () => document.removeEventListener("mousedown", clickFuera);
  }, []);

  // Debounce del autocomplete — espera 300ms después de que el usuario
  // deja de escribir antes de consultar n8n, para no spamear requests
  useEffect(() => {
    if (busqueda.length < 2) { setSugerencias([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setCargando(true);
      try {
        const { data } = await axios.get(N8N_URL, { params: { q: busqueda } });
        setSugerencias(Array.isArray(data) ? data : []);
      } catch {
        setSugerencias([]);
      } finally {
        setCargando(false);
      }
    }, 300);
  }, [busqueda]);

  // Cuando el agente selecciona un cliente del dropdown,
  // autocompleta los campos que vienen de ventasdb
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

  // Actualiza cualquier campo del formulario por nombre
  function cambiar(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  // Muestra un toast y lo oculta después de 3.5 segundos
  function mostrarToast(msg, tipo = "success") {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  }

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

  return (
    <div className="mda-wrapper">

      {/* Header con título y toggle de tema */}
      <div className="mda-header">
        <div>
          <div className="mda-badge">Mesa de Ayuda</div>
          <h1 className="mda-title">Registro de <em>caso</em></h1>
        </div>
        <button className="btn-theme" onClick={() => setDark(d => !d)}>
          {dark ? "☀ Claro" : "☾ Oscuro"}
        </button>
      </div>

      {/* ── Card 1: Agente ── */}
      <div className="mda-card">
        <div className="section-label">Agente</div>
        <div className="field">
          <label>¿Quién atendió?</label>
          <select name="agente" value={form.agente} onChange={cambiar}>
            <option value="">Seleccioná un agente...</option>
            {AGENTES.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* ── Card 2: Cliente con autocomplete ── */}
      <div className="mda-card">
        <div className="section-label">Cliente</div>
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
      </div>

      {/* ── Card 3: Detalle de la consulta ── */}
      <div className="mda-card">
        <div className="section-label">Detalle de la consulta</div>
        <form onSubmit={enviar}>

          {/* Producto y tipo en grilla de 2 columnas */}
          <div className="fields-grid">
            <div className="field">
              <label>Producto</label>
              <select name="producto" value={form.producto} onChange={cambiar}>
                <option value="">Seleccioná...</option>
                {PRODUCTOS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Tipo de consulta</label>
              <select name="tipo" value={form.tipo} onChange={cambiar}>
                <option value="">Seleccioná...</option>
                {TIPOS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Error específico</label>
            <input
              name="error_especifico"
              value={form.error_especifico}
              onChange={cambiar}
              placeholder="Describí el error o motivo..."
            />
          </div>

          <div className="field">
            <label>Descripción</label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={cambiar}
              placeholder="Detalle adicional..."
            />
          </div>

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

          <div className="field">
            <label>Notas internas</label>
            <textarea
              name="notas"
              value={form.notas}
              onChange={cambiar}
              placeholder="Notas para uso interno..."
              style={{ minHeight: 60 }}
            />
          </div>

          <button type="submit" className="btn-submit" disabled={enviando}>
            {enviando ? "Guardando..." : "Guardar caso"}
          </button>

        </form>
      </div>

      {/* Toast de notificación — success o error */}
      {toast && <div className={`toast ${toast.tipo}`}>{toast.msg}</div>}

    </div>
  );
}