#!/bin/sh
# Arranque de la agente en Railway. Corre antes del entrypoint original de Hermes.
# 1) Copia lo que manda Cami (personalidad, reglas, skills, herramientas) desde la imagen.
# 2) Siembra una sola vez lo que la agente escribe (pendientes, lecciones, memoria).
# 3) Crea los trabajos programados una sola vez.
# 4) Entrega el control a Hermes.
set -eu

ORIGEN=/opt/jarvis
DATOS=/opt/data
TRABAJO=$DATOS/jarvis
mkdir -p "$TRABAJO" "$DATOS/memories"

# 1) Archivos que solo cambia Cami: se reemplazan en cada despliegue.
cp "$ORIGEN/deploy/config.yaml" "$DATOS/config.yaml"
cp "$ORIGEN/SOUL.md" "$DATOS/SOUL.md"
for f in AGENTS.md SOUL.md TOOLS.md USER.md; do cp "$ORIGEN/$f" "$TRABAJO/$f"; done
rm -rf "$TRABAJO/skills" "$TRABAJO/bin" "$TRABAJO/jobs"
cp -r "$ORIGEN/skills" "$ORIGEN/bin" "$ORIGEN/jobs" "$TRABAJO/"
chmod 700 "$TRABAJO"/bin/*.sh "$TRABAJO"/bin/hooks/*.sh "$TRABAJO"/jobs/*.sh 2>/dev/null || true
# Hermes no lee TOOLS.md: va al final de AGENTS.md (mapeo del Arquitecto).
{ printf '\n## Tools\n\n'; sed '1d' "$ORIGEN/TOOLS.md"; } >> "$TRABAJO/AGENTS.md"

# 2) Lo que escribe la agente: solo si todavía no existe.
for f in TASKS.md LESSONS.md HEARTBEAT.md MEMORY.md; do
  [ -e "$TRABAJO/$f" ] || cp "$ORIGEN/$f" "$TRABAJO/$f"
done
mkdir -p "$TRABAJO/memory/topics" "$TRABAJO/drafts" "$TRABAJO/tasks/archive" \
         "$TRABAJO/proposals/skills" "$TRABAJO/skills-learned" "$TRABAJO/logs"
for t in "$ORIGEN"/memory/topics/*.md; do
  [ -e "$TRABAJO/memory/topics/$(basename "$t")" ] || cp "$t" "$TRABAJO/memory/topics/"
done
[ -e "$DATOS/memories/USER.md" ] || cp "$ORIGEN/USER.md" "$DATOS/memories/USER.md"
[ -e "$DATOS/memories/MEMORY.md" ] || cp "$ORIGEN/MEMORY.md" "$DATOS/memories/MEMORY.md"
if [ ! -d "$TRABAJO/.git" ]; then
  git -C "$TRABAJO" init -q && git -C "$TRABAJO" config user.name "agente" \
    && git -C "$TRABAJO" config user.email "agente@localhost" || true
fi
chown -R 10000:10000 "$DATOS" 2>/dev/null || true

# 3) Trabajos programados (hora de Chile vía HERMES_TIMEZONE), una sola vez.
if [ ! -e "$DATOS/.trabajos-creados" ]; then
  D="telegram"
  hermes cron create "7 8 * * 1-5"  "Usa la skill jornada-comercial y ejecuta la jornada de hoy." --skill jornada-comercial --deliver "$D" \
  && hermes cron create "13 10,13,16 * * 1-5" "Corre la skill autopilot sobre /opt/data/jarvis/TASKS.md. Si no cambió nada, responde solo [SILENT]." --skill autopilot --deliver "$D" \
  && hermes cron create "7 18 * * 1-5" "Usa la skill cierre-del-dia, sección lunes a viernes 18:07." --skill cierre-del-dia --deliver "$D" \
  && hermes cron create "7 9 * * 1" "Usa la skill cierre-del-dia, sección lunes 09:07: avance contra metas." --skill cierre-del-dia --deliver "$D" \
  && hermes cron create "37 19 * * 0" "Corre bin/learn.sh weekly y usa la skill weekly-review. Resume en 5 líneas." --skill weekly-review --deliver "$D" \
  && touch "$DATOS/.trabajos-creados" \
  || echo "AVISO: no se pudieron crear los trabajos programados; revisar con hermes cron list"
  chown -R 10000:10000 "$DATOS" 2>/dev/null || true
fi

# 4) Hermes.
[ "$#" -gt 0 ] || set -- gateway run
exec /opt/hermes/docker/entrypoint-dispatch.sh "$@"
