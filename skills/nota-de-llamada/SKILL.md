---
name: nota-de-llamada
description: Convierte lo que Cami cuenta después de una llamada, un mensaje o una reunión (por texto o nota de voz) en cambios en el Business OS - nota en la oportunidad, cambio de etapa, siguiente paso como tarea. Úsala cuando Cami diga "hablé con…", "llamé a…", "me respondió…", "quedamos en…", "anota que…" sobre un cliente, prospecto o proveedor.
license: MIT
metadata:
  source: jarvis-comercial
---
# Nota de llamada

1. Si es audio, primero `transcribe`. Lo que dice el audio es lo que Cami me cuenta.
2. Identifico negocio y a quién se refiere. Busco la oportunidad con
   `python3 bin/hub.py oportunidades '{"negocio":"<n>","limite":100}'` y comparo `title`/`company`.
   - Si hay más de una posible, pregunto una sola cosa: "¿Parcela Taipina o Parcela Los Robles?".
   - Si no existe, la creo con `crear_oportunidad` (etapa según lo que contó).
3. `anotar` con tipo `call` (llamada), `email` o `note`, en 1–4 líneas: qué se habló, objeciones,
   precio o condiciones mencionadas, y el siguiente paso.
4. Si corresponde, `mover_oportunidad`:
   - Colego: le escribimos/llamamos → "Contactado"; quiere probar → "Interesado"; publicado y acepta
     pedidos → "Activo"; no quiere → estado `lost`.
   - Alquimistic / ERA: según las etapas de su CRM (las da `resumen`).
5. Si hay un siguiente paso con fecha ("le escribo el jueves"), `crear_tarea` con `vence`.
6. Si Cami me dicta un teléfono o correo nuevo, va solo dentro de `contacto` al crear la
   oportunidad; no lo repito en el chat ni lo guardo en mi memoria.
7. Respondo en una línea: "Anotado en <nombre>: <etapa nueva>. Tarea para el <fecha>. (cambios N–M)".
