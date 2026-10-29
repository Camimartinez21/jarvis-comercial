'use strict';
// Centro de Comando de Áurea: reloj, tu día, tus negocios y la conversación por voz.

const $ = (id) => document.getElementById(id);
const nucleo = $('nucleo');
const modoTexto = $('modo-texto');
const conversacion = $('conversacion');
const texto = $('texto');
const microfono = $('microfono');
const continua = $('continua');

const SESION = 'centro-' + new Date().toISOString().slice(0, 10);
const FRASES_FIN = ['stop', 'para', 'chao áurea', 'chao aurea'];

// ---------- Reloj ----------
function reloj() {
  const ahora = new Date();
  $('hora').textContent = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  $('fecha').textContent = ahora.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
}
reloj();
setInterval(reloj, 15_000);

// ---------- Utilidades ----------
function el(tag, clase, contenido) {
  const n = document.createElement(tag);
  if (clase) n.className = clase;
  if (contenido !== undefined) n.textContent = contenido;
  return n;
}
const formatoNum = (n) => Number(n || 0).toLocaleString('es-CL');

function cuando(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const hoy = new Date();
  const manana = new Date(); manana.setDate(hoy.getDate() + 1);
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === hoy.toDateString()) return `hoy ${hora}`;
  if (d.toDateString() === manana.toDateString()) return `mañana ${hora}`;
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' }) + ` ${hora}`;
}

async function pedir(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
  return r.json();
}

// ---------- Estado ----------
async function cargarEstado() {
  const caja = $('estado');
  try {
    const e = await pedir('/api/estado');
    caja.dataset.ok = e.aurea ? 'si' : 'no';
    $('estado-texto').textContent = e.aurea ? 'Áurea en línea' : 'Áurea apagada';
  } catch {
    caja.dataset.ok = 'no';
    $('estado-texto').textContent = 'Sin conexión';
  }
}

// ---------- Tu día ----------
async function cargarHoy() {
  try {
    const { trabajos, pendientes } = await pedir('/api/hoy');
    const lt = $('trabajos');
    lt.replaceChildren();
    if (!trabajos.length) lt.append(el('li', 'vacio', 'Sin trabajos programados'));
    for (const t of trabajos.slice(0, 6)) {
      const li = el('li');
      li.append(el('span', 'trabajo-nombre', t.nombre), el('span', 'trabajo-cuando', cuando(t.proximo)));
      lt.append(li);
    }
    const lp = $('pendientes');
    lp.replaceChildren();
    if (!pendientes.length) lp.append(el('li', 'vacio', 'Nada pendiente. Pídeme algo y lo anoto.'));
    for (const p of pendientes) {
      const li = el('li');
      li.append(el('span', 'chip', p.quien === 'owner' ? 'Tú' : 'Áurea'), el('span', '', p.titulo));
      lp.append(li);
    }
  } catch {
    $('trabajos').replaceChildren(el('li', 'vacio', 'No pude leer el día de Áurea'));
  }
}

// ---------- Negocios ----------
function cifra(num, etiqueta, destacada = false) {
  const c = el('div');
  c.append(el('div', 'cifra-num' + (destacada ? ' destacada' : ''), formatoNum(num)), el('div', 'cifra-et', etiqueta));
  return c;
}

function tarjetaNegocio(nombre, lema, cifras, tareas) {
  const p = el('div', 'panel');
  const cab = el('div', 'negocio-cabeza');
  cab.append(el('span', 'negocio-nombre', nombre), el('span', 'negocio-lema', lema));
  const grid = el('div', 'cifras');
  cifras.forEach((c) => grid.append(c));
  p.append(cab, grid);
  if (tareas && tareas.length) {
    const ul = el('ul', 'negocio-tareas');
    for (const t of tareas.slice(0, 3)) {
      const li = el('li');
      li.append(el('span', '', t.titulo));
      if (t.prioridad === 'high') li.append(el('span', 'chip alta', 'urgente'));
      ul.append(li);
    }
    p.append(ul);
  }
  return p;
}

async function cargarNegocios() {
  const caja = $('negocios');
  try {
    const { resumen, tareas } = await pedir('/api/negocios');
    const era = resumen.era || {};
    const ep = era.prospectos_por_estado || {};
    const col = resumen.colego || {};
    const co = col.oportunidades_por_etapa || {};
    const alq = resumen.alquimistic || {};
    const ao = alq.oportunidades_por_etapa || {};
    const suma = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    caja.replaceChildren(
      tarjetaNegocio('Colego', 'proveedores', [
        cifra(co['Por contactar'], 'por contactar', true),
        cifra(co['Contactado'], 'contactados'),
        cifra(co['Interesado'], 'interesados'),
        cifra(co['Activo'], 'activos'),
      ], tareas.colego),
      tarjetaNegocio('ERA', 'empresas', [
        cifra(ep.por_contactar, 'por contactar', true),
        cifra((ep.seguimiento_1 || 0) + (ep.seguimiento_2 || 0), 'en seguimiento'),
        cifra(ep.enviado, 'correos enviados'),
        cifra(ep.respondio, 'respondieron'),
      ], tareas.era),
      tarjetaNegocio('Alquimistic', 'clientes', [
        cifra(suma(ao), 'oportunidades', true),
        cifra(alq.tareas_abiertas, 'tareas abiertas'),
      ], tareas.alquimistic),
    );
  } catch (e) {
    const p = el('div', 'panel');
    p.append(el('p', 'vacio', 'No pude leer el Business OS. Reintento en un momento.'));
    caja.replaceChildren(p);
  }
}

// ---------- Conversación ----------
function decir(quien, contenido, clase = '') {
  const d = el('div', `dicho ${quien} ${clase}`.trim());
  d.append(el('span', 'quien', quien === 'cami' ? 'Tú' : 'Áurea'));
  const cuerpo = el('span', 'cuerpo', contenido);
  d.append(cuerpo);
  conversacion.append(d);
  conversacion.scrollTop = conversacion.scrollHeight;
  return cuerpo;
}

function modo(m, mensaje) {
  nucleo.dataset.modo = m;
  microfono.classList.toggle('activo', m === 'escuchando');
  const textos = {
    reposo: 'Toca el micrófono o aprieta espacio para hablarme',
    escuchando: 'Te escucho…',
    pensando: 'Pensando…',
    hablando: 'Hablando… (toca el orbe para callarme)',
  };
  modoTexto.textContent = mensaje || textos[m] || '';
}

let ocupada = false;
async function enviar(mensaje) {
  mensaje = mensaje.trim();
  if (!mensaje || ocupada) return;
  ocupada = true;
  decir('cami', mensaje);
  modo('pensando');
  let respuesta = '';
  const cuerpo = decir('aurea', '');
  try {
    const r = await fetch('/api/hablar', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-centro': '1' },
      body: JSON.stringify({ mensaje, sesion: SESION }),
    });
    if (!r.ok || !r.body) throw new Error((await r.json().catch(() => ({}))).error || 'No pude hablar con Áurea');
    const lector = r.body.getReader();
    const dec = new TextDecoder();
    for (;;) {
      const { value, done } = await lector.read();
      if (done) break;
      respuesta += dec.decode(value, { stream: true });
      cuerpo.textContent = respuesta;
      conversacion.scrollTop = conversacion.scrollHeight;
    }
    if (!respuesta.trim()) { respuesta = 'Listo.'; cuerpo.textContent = respuesta; }
    ocupada = false;
    cargarHoy();
    await hablarEnVoz(respuesta);
  } catch (e) {
    cuerpo.parentElement.classList.add('error');
    cuerpo.textContent = String(e.message || e);
    ocupada = false;
    modo('reposo');
    return;
  }
  if (continua.checked && ultimaFueVoz) escuchar();
  else modo('reposo');
}

// ---------- Voz de Áurea (voces de Windows / Edge) ----------
let vozElegida = null;
function elegirVoz() {
  const voces = speechSynthesis.getVoices();
  vozElegida =
    voces.find((v) => /catalina/i.test(v.name)) ||
    voces.find((v) => v.lang === 'es-CL') ||
    voces.find((v) => /es-(419|MX|US|AR|CO)/.test(v.lang) && /natural|online/i.test(v.name)) ||
    voces.find((v) => v.lang.startsWith('es')) ||
    null;
}
if ('speechSynthesis' in window) {
  elegirVoz();
  speechSynthesis.onvoiceschanged = elegirVoz;
}

function limpiarParaVoz(t) {
  return t
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, 'el enlace')
    .replace(/[*_#>|~]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hablarEnVoz(t) {
  return new Promise((listo) => {
    if (!('speechSynthesis' in window) || !t.trim()) return listo();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(limpiarParaVoz(t));
    u.lang = vozElegida?.lang || 'es-CL';
    if (vozElegida) u.voice = vozElegida;
    u.rate = 1.03;
    u.onstart = () => modo('hablando');
    u.onend = u.onerror = () => listo();
    speechSynthesis.speak(u);
  });
}

nucleo.addEventListener('click', () => {
  if (nucleo.dataset.modo === 'hablando') { speechSynthesis.cancel(); modo('reposo'); }
  else if (nucleo.dataset.modo === 'reposo') escuchar();
});

// ---------- Escuchar a Cami ----------
const Reconocedor = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconocedor = null;
let ultimaFueVoz = false;

function escuchar() {
  if (!Reconocedor) {
    modo('reposo', 'Este navegador no puede escucharte. Ábreme con el ícono del escritorio (Edge).');
    return;
  }
  if (ocupada) return;
  if (reconocedor) { reconocedor.abort(); reconocedor = null; modo('reposo'); return; }
  speechSynthesis.cancel();
  const r = new Reconocedor();
  r.lang = 'es-CL';
  r.interimResults = true;
  r.continuous = false;
  let final = '';
  r.onstart = () => modo('escuchando');
  r.onresult = (ev) => {
    let parcial = '';
    for (const res of ev.results) {
      if (res.isFinal) final = res[0].transcript;
      else parcial += res[0].transcript;
    }
    modoTexto.textContent = parcial || final || 'Te escucho…';
  };
  r.onerror = (ev) => {
    const msg = ev.error === 'not-allowed' ? 'Necesito permiso para usar el micrófono' : ev.error === 'no-speech' ? '' : 'No te escuché bien, intenta otra vez';
    if (msg) modo('reposo', msg);
  };
  r.onend = () => {
    reconocedor = null;
    const dicho = final.trim();
    if (!dicho) { if (nucleo.dataset.modo === 'escuchando') modo('reposo'); return; }
    if (FRASES_FIN.includes(dicho.toLowerCase().replace(/[.,!¡¿?]/g, '').trim())) {
      modo('reposo', 'Listo, aquí estoy cuando me necesites');
      return;
    }
    ultimaFueVoz = true;
    enviar(dicho);
  };
  reconocedor = r;
  r.start();
}

microfono.addEventListener('click', escuchar);
$('formulario').addEventListener('submit', (e) => {
  e.preventDefault();
  ultimaFueVoz = false;
  const m = texto.value;
  texto.value = '';
  enviar(m);
});
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && document.activeElement !== texto) {
    e.preventDefault();
    if (nucleo.dataset.modo === 'hablando') { speechSynthesis.cancel(); modo('reposo'); }
    else escuchar();
  }
});

// ---------- Arranque ----------
cargarEstado();
cargarHoy();
cargarNegocios();
setInterval(cargarEstado, 20_000);
setInterval(cargarHoy, 60_000);
setInterval(cargarNegocios, 120_000);
