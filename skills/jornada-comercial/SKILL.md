---
name: jornada-comercial
description: Arma y EJECUTA la jornada comercial de Cami en los 3 negocios (Colego, Alquimistic, ERA) usando el Business OS, y le entrega solo lo que necesita su sí o su voz. Úsala en el trabajo de las 08:07 de lunes a viernes, o cuando Cami diga "¿qué hacemos hoy?", "arma el día", "jornada", "qué toca hoy".
license: MIT
metadata:
  source: jarvis-comercial
---
# Jornada comercial

Objetivo: que Cami empiece el día con el trabajo **ya hecho** y una lista corta de lo que solo
ella puede hacer (llamar, enviar, decidir). No es un recordatorio.

## Pasos
1. Si existe `STOP_AUTOPILOT` o `JARVIS_PAUSED`, respondo solo `[SILENT]`.
2. Leo `memory/topics/metas.md` y `LESSONS.md`.
3. `python3 bin/hub.py resumen` → foto de los 3 negocios.
4. **Colego (ritmo alto)**:
   - `oportunidades {"negocio":"colego","etapa":"Por contactar","limite":10}` → elijo 8, cuidando
     que haya variedad de categorías (meta: 3 por categoría) y que estén cerca entre sí.
   - Para cada uno escribo el mensaje de primer contacto (WhatsApp o DM de Instagram, según su
     `source`), corto y personalizado con un dato de su nota ("vi que tienen piscina y ya atienden
     cursos"). Lo guardo como nota en su oportunidad con `anotar` (tipo note, empieza con
     "BORRADOR 1er contacto:").
   - `oportunidades {"negocio":"colego","etapa":"Contactado"}` → los que llevan 3+ días sin
     respuesta reciben un borrador de seguimiento (misma forma).
5. **Alquimistic (ritmo medio)**: si hay menos de 10 oportunidades abiertas en "Prospecto", busco
   en la web 3 negocios que calcen con `memory/topics/alquimistic.md` § Dónde buscar y los creo con
   `crear_oportunidad` (etapa "Prospecto", nota con qué venden, dónde los encuentran y el dolor
   probable). Para cada uno dejo el primer DM sugerido (pregunta 1 del filtro, nunca el precio).
6. **ERA (ritmo bajo, 2 acciones)**:
   - Si hay prospectos en `borrador_creado` hace 2+ días, aviso: "hay N borradores en tu Gmail
     esperando envío".
   - Si no hay lote en revisión, marco 10 prospectos `por_contactar` de prioridad alta como
     `en_revision` (`marcar_prospecto`) para que Cami cree el lote de borradores en el Business OS.
7. Le escribo a Cami **un solo mensaje**, en este orden y corto:
   - "Hice: …" (lo que ya cambié, con el rango de números de bitácora para deshacer).
   - "Te toca: …" (máximo 3 cosas: llamar a N proveedores — los ve en el CRM de Colego con su
     teléfono —, enviar el lote de ERA, responder un DM).
   - "Ojo: …" (una alerta si una meta va atrasada).
8. Nunca contacto a nadie. Los borradores quedan en el Business OS; Cami los envía.

## Formato del mensaje (ejemplo)
Hice: 8 primeros mensajes para proveedores de Colego (parcelas 3, coctel 3, buses 2) y 3
prospectos nuevos para Alquimistic (cambios 120–134).
Te toca: 1) llamar o escribir a esos 8 (están en Colego › Por contactar, con el borrador en la
nota) · 2) crear el lote de 10 correos de ERA en Prospección.
Ojo: Colego va 4/60 contactados y quedan 47 días.
