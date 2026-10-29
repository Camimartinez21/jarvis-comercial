# Imagen de la agente comercial de Cami: Hermes oficial fijado por digest + sus archivos.
# Versión verificada en vivo el 2026-10-29: v0.22.5 (estable, publicada 2026-10-23).
FROM nousresearch/hermes-agent:v0.22.5@sha256:9c5561579f3ffdf333401797094ac3a743738d6c25d40f4331c7bf77b694238d

# Voz a texto local: se instala solo si la imagen no la trae (versión fijada).
RUN /opt/hermes/.venv/bin/python -c "import faster_whisper" 2>/dev/null \
 || (command -v uv >/dev/null && uv pip install --python /opt/hermes/.venv/bin/python --no-cache "faster-whisper==1.2.1") \
 || /opt/hermes/.venv/bin/python -m pip install --no-cache-dir "faster-whisper==1.2.1"

# Sin secretos en la imagen: llaves y IDs llegan como variables selladas de Railway.
COPY SOUL.md AGENTS.md TOOLS.md USER.md MEMORY.md TASKS.md LESSONS.md HEARTBEAT.md /opt/jarvis/
COPY skills/ /opt/jarvis/skills/
COPY bin/ /opt/jarvis/bin/
COPY jobs/ /opt/jarvis/jobs/
COPY memory/topics/ /opt/jarvis/memory/topics/
COPY deploy/ /opt/jarvis/deploy/
RUN chmod 755 /opt/jarvis/deploy/arranque.sh

ENTRYPOINT ["/opt/jarvis/deploy/arranque.sh"]
CMD ["gateway", "run"]
