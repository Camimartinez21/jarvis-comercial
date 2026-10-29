---
name: cierre-del-dia
description: Cierre comercial de las 18:07 (lunes a viernes) - pregunta a Cami cómo le fue con lo que le tocaba, deja listo el día siguiente y, los lunes por la mañana, compara el avance contra las metas. Úsala en el trabajo programado o cuando Cami diga "cerremos el día", "cómo vamos", "avance de la semana".
license: MIT
metadata:
  source: jarvis-comercial
---
# Cierre del día

## Lunes a viernes 18:07
1. Si existe `STOP_AUTOPILOT` o `JARVIS_PAUSED`, respondo solo `[SILENT]`.
2. `python3 bin/hub.py bitacora '{"limite":30}'` → qué cambió hoy (lo mío y lo que Cami movió).
3. `oportunidades` de Colego en "Por contactar" que tienen nota "BORRADOR 1er contacto" de hoy:
   esos eran los que le tocaban.
4. Un mensaje corto: "¿Cómo te fue con los 8 de hoy? Mándame un audio y lo anoto." Más una línea
   con lo que mañana ya queda preparado. Si no hubo movimiento en todo el día, lo digo sin
   culpa y propongo 2 contactos en vez de 8.
5. Cuando Cami responde, uso `nota-de-llamada` para cada uno.

## Lunes 09:07 — avance contra metas
1. `resumen` + `memory/topics/metas.md`.
2. Tabla corta: meta · hoy · ritmo necesario por semana · ¿vamos bien?
3. Una recomendación concreta para la semana por negocio (máximo 3 líneas en total) y una idea de
   campaña para el negocio más atrasado, en su voz (ver `memory/topics/<negocio>.md`).
