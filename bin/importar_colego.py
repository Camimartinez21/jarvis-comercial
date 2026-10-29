#!/usr/bin/env python3
"""Carga única: proveedores de Colego con forma de contacto → CRM de Colego en el Business OS.

Uso: python3 bin/importar_colego.py <ruta a proveedores-lista.csv> [--prueba]
Es idempotente: el Business OS salta los títulos que ya existen.
"""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import hub  # noqa: E402

TANDA = 50


def prioridad(puntaje: str) -> str:
    try:
        p = int(float(puntaje))
    except ValueError:
        return "media"
    return "alta" if p >= 8 else "media" if p >= 6 else "baja"


def fila(p: dict) -> dict:
    datos = [
        f"Categoría: {p['categoria']}",
        f"Comuna: {p['comuna']}" + (f" (cubre: {p['cubre_comunas']})" if p["cubre_comunas"] and p["cubre_comunas"] != p["comuna"] else ""),
    ]
    if p["instagram"]:
        datos.append(f"Instagram: {p['instagram']}")
    if p["capacidad_personas"]:
        datos.append(f"Capacidad: {p['capacidad_personas']} personas")
    if p["precio_referencia"] and p["precio_referencia"] != "0":
        datos.append(f"Precio ref.: ${p['precio_referencia']}" + (f" por {p['unidad_precio']}" if p["unidad_precio"] else ""))
    if p["atiende_cursos_antes"]:
        datos.append(f"Ya atiende cursos: {p['atiende_cursos_antes']}")
    datos.append(f"Fuente: {p['fuente']}")
    nota = " · ".join(datos) + "\n\n" + (p["notas"] or "")[:1500]
    return {
        "titulo": p["nombre"].strip(),
        "empresa": p["nombre"].strip(),
        "etapa": "Por contactar",
        "prioridad": prioridad(p["puntaje"]),
        "fuente": "WhatsApp" if p["whatsapp"] else "Instagram" if p["instagram"] else "Correo",
        "contacto": {"nombre": p["nombre"].strip(), "telefono": p["whatsapp"] or None, "correo": p["email"] or None},
        "nota": nota,
    }


def main() -> int:
    hub.leer_env()
    filas = list(csv.DictReader(open(sys.argv[1], encoding="utf-8-sig")))
    contactables = [fila(p) for p in filas if p["whatsapp"] or p["instagram"] or p["email"]]
    contactables.sort(key=lambda f: {"alta": 0, "media": 1, "baja": 2}[f["prioridad"]])
    if "--prueba" in sys.argv:
        contactables = contactables[:1]
    creadas = repetidas = 0
    for i in range(0, len(contactables), TANDA):
        estado, r = hub.llamar("importar_oportunidades", {"negocio": "colego", "filas": contactables[i:i + TANDA]})
        if estado != 200:
            print(f"Falló la tanda {i // TANDA + 1}: {r}")
            return 1
        creadas += r["creadas"]
        repetidas += r["repetidas"]
        print(f"Tanda {i // TANDA + 1}: +{r['creadas']} (repetidas {r['repetidas']})")
    print(f"Listo: {creadas} creadas, {repetidas} ya estaban, de {len(contactables)} con contacto.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
