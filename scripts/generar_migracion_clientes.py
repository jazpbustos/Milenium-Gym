"""Genera SQL de migración desde el CSV exportado por AppSheet.

Uso:
  python scripts/generar_migracion_clientes.py "ruta/al/CLIENTES.csv"

El CSV de AppSheet viene separado por punto y coma, codificado en cp1252
y con muchas columnas vacías al final. El script toma solo las columnas
relevantes, normaliza nombres de actividad conocidos y genera un UPSERT.
"""

from __future__ import annotations

import csv
import re
import sys
from datetime import datetime
from decimal import Decimal
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]
MIGRACION = REPO / "migracion"

MAPA_ACTIVIDADES = {
    "Aerolocalx2": "AEROLOCAL X2",
    "Aerolocalx3": "AEROLOCAL X3",
    "Boxeo x 3": "Boxeo x3",
    "BOXEO X2": "Boxeo x2",
    "COMBO X4 (apa+Cross)": "COMBO X4 (apa + cross)",
    "COMBO X5 (apa+Cross)": "COMBO X5 (apa + cross)",
    "COMBO X7 (apa+Cross)": "COMBO X7 (apa + cross)",
    # Alias históricos de AppSheet -> nombres actuales del catálogo.
    "El día aparatos": "1 día aparatos",
    "Medio mes aparatos": "2 semanas aparatos",
    "1 semana y ½ aparatos": "1 semana aparatos",
    "Apa x 2 + Hift x 3": "Aparatos",
    "Apa x 5 + Flex x2": "Aparatos",
    "Apa x3 + Flex x1": "Aparatos",
    "Apa x3 + Flex x2": "Aparatos",
    "Apax2+ boxx2": "Aparatos",
    "Apax2+hiftx2+flex1+box1": "Aparatos",
    "COMBO X4 + otra actividad": "Aparatos",
    "COMBO X5 + otra actividad": "Aparatos",
    "Hift x 2 + Flex x1": "Aparatos",
    "Hift x5 + apa x2": "Aparatos",
    "Hift x 3": "HIFT X3",
    "Hift x4": "HIFT X4",
    "Hift x 5": "HIFT X5",
    "Pase Libre (apa todos los dìas + x5 clases cross)": "Pase Libre (apa todos los días + x5 clases cross)",
}

ACTIVIDADES_ADMITIDAS = {
    "1 día aparatos", "1 semana aparatos", "2 semanas aparatos", "3 semanas aparatos",
    "Aparatos", "Aparatos dos veces por semana", "Boxeo x1", "Boxeo x2",
    "Calistenia x2", "COMBO x10 (apa + cross)", "COMBO X3 (apa + cross)",
    "COMBO X4 (apa + cross)", "COMBO X5 (apa + cross)", "COMBO X6 (apa + cross)",
    "COMBO X7 (apa + cross)", "HIFT X2", "HIFT X3", "HIFT X4", "HIFT X5",
    "HIFT X6", "Pase Libre (apa todos los días + x5 clases cross)",
}


def actividad_canonica(nombre: str) -> str:
    nombre = nombre.strip()
    if nombre in MAPA_ACTIVIDADES:
        return MAPA_ACTIVIDADES[nombre]
    if re.match(r"^COMBO [Xx]\d+ \(apa & cross\)$", nombre):
        return nombre.replace(" & ", " + ")
    return nombre


def precio_decimal(valor: str) -> Decimal:
    limpio = valor.replace("$", "").replace(".", "").replace(",", ".").strip()
    return Decimal(limpio)


def fecha_iso(valor: str) -> str:
    return datetime.strptime(valor.strip(), "%d/%m/%Y").date().isoformat()


def sql_texto(valor: str | None) -> str:
    if not valor:
        return "null"
    return "'" + valor.replace("'", "''") + "'"


def leer_csv(ruta: Path):
    validos = []
    revisar = []
    vistos = set()
    with ruta.open("r", encoding="cp1252", newline="") as archivo:
        for numero, fila in enumerate(csv.DictReader(archivo, delimiter=";"), start=2):
            dni_txt = (fila.get("DNI") or "").strip()
            if not dni_txt:
                if any((fila.get(c) or "").strip() for c in (
                    "NOMBRE", "TELEFONO", "ACTIVIDAD", "PRECIO", "COMENTARIOS",
                    "FECHA DE PAGO", "DIAS DE CREDITO",
                )):
                    revisar.append((numero, "Sin DNI", fila))
                continue
            if not dni_txt.isdigit():
                revisar.append((numero, "DNI no numérico", fila))
                continue
            dni = int(dni_txt)
            if dni > 2_147_483_647:
                revisar.append((numero, "DNI fuera de rango; parece un teléfono", fila))
                continue
            if dni in vistos:
                revisar.append((numero, "DNI duplicado", fila))
                continue
            vistos.add(dni)

            requeridos = ["NOMBRE", "ACTIVIDAD", "PRECIO", "FECHA DE PAGO", "DIAS DE CREDITO"]
            faltantes = [c for c in requeridos if not (fila.get(c) or "").strip()]
            if faltantes:
                revisar.append((numero, "Faltan: " + ", ".join(faltantes), fila))
                continue
            try:
                validos.append({
                    "dni": dni,
                    "nombre": fila["NOMBRE"].strip(),
                    "telefono": (fila.get("TELEFONO") or "").strip() or None,
                    "actividad": actividad_canonica(fila["ACTIVIDAD"]),
                    "precio": precio_decimal(fila["PRECIO"]),
                    "comentarios": (fila.get("COMENTARIOS") or "").strip() or None,
                    "fecha_pago": fecha_iso(fila["FECHA DE PAGO"]),
                    "dias_credito": int(fila["DIAS DE CREDITO"].strip()),
                })
            except (ValueError, ArithmeticError) as exc:
                revisar.append((numero, f"Dato inválido: {exc}", fila))
    return validos, revisar


def generar_clientes(filas):
    lineas = [
        "-- Importación actualizada desde AppSheet.",
        f"-- {len(filas)} socios válidos. UPSERT por DNI: crea los nuevos y actualiza los existentes.",
        "-- Si 07_historial_pagos.sql ya está instalado, un cambio real de fecha_pago",
        "-- genera automáticamente su movimiento en el historial.",
        "",
        "insert into clientes (dni, nombre, telefono, actividad_id, precio, comentarios, fecha_pago, dias_credito)",
        "select v.dni, v.nombre, v.telefono, a.id, v.precio, v.comentarios, v.fecha_pago, v.dias_credito",
        "from (values",
    ]
    valores = []
    for f in filas:
        valores.append(
            f"  ({f['dni']}, {sql_texto(f['nombre'])}, {sql_texto(f['telefono'])}, "
            f"{sql_texto(f['actividad'])}, {f['precio']:.2f}, {sql_texto(f['comentarios'])}, "
            f"'{f['fecha_pago']}'::date, {f['dias_credito']})"
        )
    lineas.append(",\n".join(valores))
    lineas.extend([
        ") as v(dni, nombre, telefono, actividad_nombre, precio, comentarios, fecha_pago, dias_credito)",
        "join actividades a on a.nombre = v.actividad_nombre",
        "on conflict (dni) do update set",
        "  nombre = excluded.nombre,",
        "  telefono = excluded.telefono,",
        "  actividad_id = excluded.actividad_id,",
        "  precio = excluded.precio,",
        "  comentarios = excluded.comentarios,",
        "  fecha_pago = excluded.fecha_pago,",
        "  dias_credito = excluded.dias_credito,",
        "  activo = true;\n",
    ])
    return "\n".join(lineas)


def generar_diagnostico(filas):
    pares = ",\n".join(f"  ({f['dni']}, {sql_texto(f['actividad'])})" for f in filas)
    return f"""-- Debe devolver cero filas después de ejecutar 01 y 02.
with esperados(dni, actividad_nombre) as (
values
{pares}
)
select e.dni, e.actividad_nombre,
  (a.id is not null) as actividad_existe,
  (c.dni is not null) as cliente_existe
from esperados e
left join actividades a on a.nombre = e.actividad_nombre
left join clientes c on c.dni = e.dni
where a.id is null or c.dni is null
order by actividad_existe, e.actividad_nombre, e.dni;
"""


def escribir_revision(revisar):
    ruta = MIGRACION / "revisar_a_mano.csv"
    with ruta.open("w", encoding="utf-8-sig", newline="") as archivo:
        writer = csv.writer(archivo, delimiter=";")
        writer.writerow(["FILA", "MOTIVO", "DNI", "NOMBRE", "TELEFONO", "ACTIVIDAD"])
        for numero, motivo, fila in revisar:
            writer.writerow([numero, motivo, fila.get("DNI", ""), fila.get("NOMBRE", ""), fila.get("TELEFONO", ""), fila.get("ACTIVIDAD", "")])


def escribir_pendientes(filas):
    ruta = MIGRACION / "pendientes_actividades_nuevas.csv"
    with ruta.open("w", encoding="utf-8-sig", newline="") as archivo:
        writer = csv.writer(archivo, delimiter=";")
        writer.writerow(["DNI", "NOMBRE", "TELEFONO", "ACTIVIDAD", "PRECIO", "COMENTARIOS", "FECHA DE PAGO", "DIAS DE CREDITO"])
        for f in filas:
            writer.writerow([f["dni"], f["nombre"], f["telefono"] or "", f["actividad"], f"{f['precio']:.2f}", f["comentarios"] or "", f["fecha_pago"], f["dias_credito"]])


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Indicá la ruta al CSV exportado por AppSheet.")
    ruta = Path(sys.argv[1])
    todas, revisar = leer_csv(ruta)
    filas = [f for f in todas if f["actividad"] in ACTIVIDADES_ADMITIDAS]
    pendientes = [f for f in todas if f["actividad"] not in ACTIVIDADES_ADMITIDAS]
    if not filas:
        raise SystemExit("No se encontraron socios válidos; no se modificó la migración.")
    MIGRACION.mkdir(exist_ok=True)
    (MIGRACION / "02_clientes_import.sql").write_text(generar_clientes(filas), encoding="utf-8")
    (MIGRACION / "03_diagnostico_faltantes.sql").write_text(generar_diagnostico(filas), encoding="utf-8")
    escribir_revision(revisar)
    escribir_pendientes(pendientes)
    print(f"Generados: {len(filas)} socios; {len(pendientes)} pendientes por actividad; {len(revisar)} para revisión.")


if __name__ == "__main__":
    main()
