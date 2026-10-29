// Centro de Comando de Áurea: página local (solo este PC) para ver y hablar con Áurea.
// Sin dependencias: Node 22+. Arranque: node centro/server.mjs
// Lee sus llaves de C:\Users\HP\Aurea\.env y C:\Users\HP\Aurea\jarvis\.env; nunca las envía al navegador.
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(AQUI, 'public');
// Carpeta de Áurea. No se usa HERMES_HOME: algunos programas heredan un valor viejo.
const HOME = process.env.CENTRO_HOME || 'C:\\Users\\HP\\Aurea';
const PUERTO = Number(process.env.CENTRO_PORT || 7879);
const HOST = '127.0.0.1';

function leerEnv(archivo) {
  const out = {};
  try {
    for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
      const m = linea.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch { /* no existe */ }
  return out;
}
const env = { ...leerEnv(path.join(HOME, '.env')), ...leerEnv(path.join(HOME, 'jarvis', '.env')) };
const HERMES = `http://127.0.0.1:${env.API_SERVER_PORT || 8642}`;
const HERMES_KEY = env.API_SERVER_KEY || '';
const AGENTE_URL = env.AGENTE_API_URL || '';
const AGENTE_TOKEN = env.AGENTE_API_TOKEN || '';

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";

function json(res, codigo, datos) {
  res.writeHead(codigo, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(datos));
}

// --- Business OS (con caché corta para no golpear la base) ---
const cache = new Map();
async function agente(op, datos = {}, ttlMs = 60_000) {
  const clave = op + JSON.stringify(datos);
  const c = cache.get(clave);
  if (c && Date.now() - c.t < ttlMs) return c.v;
  if (!AGENTE_URL || !AGENTE_TOKEN) throw new Error('Falta la llave del Business OS');
  const r = await fetch(AGENTE_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${AGENTE_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ op, ...datos }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) throw new Error(`Business OS respondió ${r.status}`);
  const v = await r.json();
  cache.set(clave, { t: Date.now(), v });
  return v;
}

async function negocios() {
  const resumen = await agente('resumen');
  const tareas = {};
  await Promise.all(['era', 'alquimistic', 'colego'].map(async (n) => {
    try {
      const lista = await agente('tareas', { negocio: n });
      tareas[n] = (Array.isArray(lista) ? lista : [])
        .filter((t) => t.status !== 'done')
        .slice(0, 6)
        .map((t) => ({ titulo: t.title, estado: t.status, prioridad: t.priority, vence: t.due_date }));
    } catch { tareas[n] = []; }
  }));
  return { resumen, tareas };
}

// --- Lo de Áurea: trabajos programados y pendientes ---
const NOMBRES_TRABAJO = {
  'jornada-comercial': 'Jornada comercial',
  autopilot: 'Avanzar pendientes',
  'cierre-del-dia': 'Cierre del día',
  'weekly-review': 'Revisión semanal',
};

async function hoy() {
  let trabajos = [];
  try {
    const d = JSON.parse(await fsp.readFile(path.join(HOME, 'cron', 'jobs.json'), 'utf8'));
    const lista = Array.isArray(d) ? d : d.jobs || [];
    trabajos = lista
      .filter((j) => j.enabled !== false)
      .map((j) => {
        const skill = j.skill || (j.skills || [])[0] || '';
        let nombre = NOMBRES_TRABAJO[skill] || String(j.name || 'Trabajo').slice(0, 40);
        if (skill === 'cierre-del-dia' && /avance/i.test(j.prompt || '')) nombre = 'Avance de la semana';
        return { id: j.id, nombre, proximo: j.next_run_at || null, ultimo: j.last_run_at || null, estado: j.state || '' };
      })
      .sort((a, b) => String(a.proximo).localeCompare(String(b.proximo)));
  } catch { /* sin trabajos */ }
  let pendientes = [];
  try {
    const t = await fsp.readFile(path.join(HOME, 'jarvis', 'TASKS.md'), 'utf8');
    pendientes = t.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)
      .filter((l) => /^- \[ \] T-\d+/.test(l))
      .map((l) => {
        const partes = l.replace(/^- \[ \] /, '').split(' · ');
        const campos = Object.fromEntries(partes.slice(2).map((p) => p.split(':')).filter((p) => p.length >= 2).map(([k, ...v]) => [k, v.join(':')]));
        return { id: partes[0], titulo: partes[1] || '', estado: campos.state || '', quien: campos.who || '', vence: campos.due || '' };
      })
      .slice(0, 12);
  } catch { /* sin pendientes */ }
  return { trabajos, pendientes };
}

async function estado() {
  try {
    const r = await fetch(`${HERMES}/health`, { signal: AbortSignal.timeout(3000) });
    return { aurea: r.ok };
  } catch {
    return { aurea: false };
  }
}

// --- Conversación: se pasa el mensaje a Hermes y se devuelve el texto a medida que llega ---
async function hablar(req, res) {
  let cuerpo = '';
  for await (const parte of req) {
    cuerpo += parte;
    if (cuerpo.length > 20_000) return json(res, 413, { error: 'Mensaje muy largo' });
  }
  let datos;
  try { datos = JSON.parse(cuerpo); } catch { return json(res, 400, { error: 'JSON inválido' }); }
  const mensaje = String(datos.mensaje || '').trim().slice(0, 8000);
  const sesion = String(datos.sesion || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'centro';
  if (!mensaje) return json(res, 400, { error: 'Mensaje vacío' });
  if (!HERMES_KEY) return json(res, 500, { error: 'Falta API_SERVER_KEY en el .env de Hermes' });

  const control = new AbortController();
  res.on('close', () => { if (!res.writableEnded) control.abort(); });
  let r;
  try {
    r = await fetch(`${HERMES}/v1/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${HERMES_KEY}`, 'content-type': 'application/json', 'x-hermes-session-id': sesion },
      body: JSON.stringify({ model: 'hermes-agent', stream: true, messages: [{ role: 'user', content: mensaje }] }),
      signal: AbortSignal.any([control.signal, AbortSignal.timeout(10 * 60_000)]),
    });
  } catch (e) {
    return json(res, 502, { error: 'Áurea no está encendida' });
  }
  if (!r.ok || !r.body) return json(res, 502, { error: `Áurea respondió ${r.status}` });

  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  const dec = new TextDecoder();
  let buf = '';
  try {
    for await (const trozo of r.body) {
      buf += dec.decode(trozo, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const linea = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!linea.startsWith('data:')) continue;
        const d = linea.slice(5).trim();
        if (d === '[DONE]') continue;
        try {
          const texto = JSON.parse(d)?.choices?.[0]?.delta?.content;
          if (texto) res.write(texto);
        } catch { /* línea parcial o evento sin texto */ }
      }
    }
  } catch { /* conexión cortada */ }
  res.end();
}

async function archivo(res, url) {
  const rel = decodeURIComponent(url === '/' ? '/index.html' : url);
  const destino = path.resolve(PUBLICO, '.' + path.posix.normalize(rel));
  if (!destino.startsWith(PUBLICO + path.sep)) return json(res, 404, { error: 'No existe' });
  try {
    const contenido = await fsp.readFile(destino);
    res.writeHead(200, { 'content-type': MIME[path.extname(destino)] || 'application/octet-stream', 'content-security-policy': CSP, 'x-content-type-options': 'nosniff', 'cache-control': 'no-cache' });
    res.end(contenido);
  } catch {
    json(res, 404, { error: 'No existe' });
  }
}

const servidor = http.createServer(async (req, res) => {
  // Solo se atiende a este mismo PC (protege contra páginas que intenten usar este servidor).
  const host = String(req.headers.host || '').toLowerCase();
  if (host !== `127.0.0.1:${PUERTO}` && host !== `localhost:${PUERTO}`) return json(res, 403, { error: 'Host no permitido' });
  const url = (req.url || '/').split('?')[0];
  try {
    if (url.startsWith('/api/')) {
      if (req.method === 'POST' && req.headers['x-centro'] !== '1') return json(res, 403, { error: 'Falta cabecera' });
      if (req.method === 'GET' && url === '/api/estado') return json(res, 200, await estado());
      if (req.method === 'GET' && url === '/api/hoy') return json(res, 200, await hoy());
      if (req.method === 'GET' && url === '/api/negocios') return json(res, 200, await negocios());
      if (req.method === 'POST' && url === '/api/hablar') return await hablar(req, res);
      return json(res, 404, { error: 'No existe' });
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido' });
    return await archivo(res, url);
  } catch (e) {
    console.error('[centro]', e?.message || e);
    if (!res.headersSent) json(res, 500, { error: e?.message || 'Error' });
    else res.end();
  }
});

servidor.listen(PUERTO, HOST, () => console.log(`Centro de Comando de Áurea en http://${HOST}:${PUERTO}`));
