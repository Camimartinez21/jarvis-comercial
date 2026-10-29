# Runbook — agente comercial de Cami

## Dónde vive
- **Cerebro:** Railway, un servicio (`hermes`) con un volumen en `/opt/data` y **1 réplica**. Nunca dos copias encendidas.
- **Archivos:** esta carpeta (`ALQUIMISTIC/jarvis-comercial`) → repositorio privado en GitHub → Railway lo construye con el `Dockerfile`.
- **Datos de clientes:** Business OS (Supabase "Alquimistic Hub SaaS"), vía la función `agente-api`.
- **Modelo:** DeepSeek (`deepseek-flash`; `deepseek-v4-pro` solo para propuestas), saldo prepago.
- **Versión de Hermes:** v0.22.5, imagen fijada por digest en el `Dockerfile` (verificada 2026-10-29).

## Hablarle
Telegram, desde el celular o desde el PC (Telegram Desktop o web.telegram.org). Solo responde a la cuenta de Cami.

## Prender, apagar, pausar
| Quiero | Cómo |
|---|---|
| Pausar solo el piloto | Escribirle "pausa el piloto" |
| Apagarla del todo | Railway › servicio › Settings › "Remove deployment" (el volumen y su memoria quedan) |
| Volver a prenderla | Railway › Deployments › "Redeploy" |
| Cambiar su personalidad o reglas | Editar SOUL.md / AGENTS.md aquí → commit → push (Railway redespliega) |

## Revisar que está sana
- Le escribes "hola" y contesta en menos de un minuto.
- En Railway › servicio › "Logs": sin errores repetidos.
- Con Claude: abrir `jarvis-architect` y pedir `/jarvis-doctor`.

## Costos y topes
- DeepSeek: nunca gasta más que el saldo cargado. Recargar en platform.deepseek.com.
- Railway: límite duro US$10 (Account › Usage). Prueba de 30 días con US$5; **antes del día 30 pasar a Hobby** o se apaga y, 30 días después, se borra el volumen.

## Si algo sale mal
1. Si responde algo raro o a alguien más: apágala (tabla de arriba) y avísale a Claude.
2. Si se filtró una llave: ver SECURITY.md › Botón de pánico.
3. Si un cambio en el Business OS estuvo mal: escríbele "deshaz el cambio N" (lo ves en sus mensajes) o pídele "muéstrame tu bitácora".

## Medios
- Voz a texto: faster-whisper modelo `base` dentro del servidor (stt local). Si no está en la imagen, el `Dockerfile` instala `faster-whisper==1.2.1`.
- Video: no instalado en esta versión.

## En el PC de Cami (versión gratis, desde 2026-10-29)
- **Hermes** vive en `C:\Users\HP\Aurea` (v0.22.5). Llaves en `C:\Users\HP\Aurea\.env` (las pega Cami).
- **Ícono «Áurea»** en el escritorio: enciende Áurea si está apagada, enciende el Centro de Comando
  (`centro/server.mjs`, solo en 127.0.0.1:7879) y abre la ventana en Edge. Voz: micrófono y voz de Edge.
- **Ícono «Hablar con Áurea»**: la versión de terminal (`/voice on`, Ctrl+B).
- Áurea solo trabaja mientras el PC esté prendido y se haya abierto el ícono (o Claude la haya encendido).
- Cambios de reglas o personalidad: editar aquí y correr `deploy/pc/instalar-pc.ps1`, luego cerrar y
  abrir Áurea.
