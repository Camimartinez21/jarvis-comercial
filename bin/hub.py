#!/usr/bin/env python3
"""Herramienta de la agente para hablar con el Business OS (agente-api).

Uso:  python3 bin/hub.py <op> ['{"json": "opcional"}']
Ej.:  python3 bin/hub.py resumen
      python3 bin/hub.py oportunidades '{"negocio": "colego", "etapa": "Por contactar", "limite": 10}'

Lee AGENTE_API_URL y AGENTE_API_TOKEN del entorno (o de .env en la carpeta de la agente).
Nunca imprime la llave. Solo usa la biblioteca estándar de Python.
"""
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

URL_POR_DEFECTO = "https://iqdpjvramnwcasanjxhz.supabase.co/functions/v1/agente-api"


def leer_env() -> None:
    env = Path(__file__).resolve().parent.parent / ".env"
    if not env.exists():
        return
    for linea in env.read_text(encoding="utf-8").splitlines():
        if "=" in linea and not linea.lstrip().startswith("#"):
            clave, valor = linea.split("=", 1)
            os.environ.setdefault(clave.strip(), valor.strip())


def llamar(op: str, datos: dict) -> tuple[int, object]:
    token = os.environ.get("AGENTE_API_TOKEN", "")
    url = os.environ.get("AGENTE_API_URL", URL_POR_DEFECTO)
    cuerpo = json.dumps({"op": op, **datos}).encode("utf-8")
    req = urllib.request.Request(url, data=cuerpo, method="POST", headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except ValueError:
            return e.code, {"error": f"HTTP {e.code}"}


def main() -> int:
    leer_env()
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    datos = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    estado, respuesta = llamar(sys.argv[1], datos)
    print(json.dumps(respuesta, ensure_ascii=False, indent=1))
    return 0 if estado == 200 else 1


if __name__ == "__main__":
    sys.exit(main())
