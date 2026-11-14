"""Valida datos/oficiales/*.json contra datos/oficiales/_esquema.json.

Corre en cada PR y en cada push a main. Una PR que rompa el formato que espera la
página 238 queda en rojo y no debe aprobarse.
Reglas: JSON válido, lista no vacía, cada fila con exactamente las columnas del esquema
(pueden faltar columnas opcionales que ya faltaban en alguna fila de la v4), manifiesto completo.
"""
import os, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)


def main():
    esquema = json.load(open(P("datos", "oficiales", "_esquema.json")))
    man = json.load(open(P("datos", "manifiesto.json")))
    errores = []
    for k, info in man["datasets"].items():
        if not os.path.exists(P(info["ruta"])):
            errores.append(f"{k}: falta {info['ruta']}")
    for k, cols in esquema.items():
        try:
            x = json.load(open(P("datos", "oficiales", f"{k}.json")))
        except Exception as e:  # noqa: BLE001
            errores.append(f"{k}: JSON inválido ({e})"); continue
        if not isinstance(x, list) or not x:
            errores.append(f"{k}: debe ser una lista no vacía"); continue
        for i, r in enumerate(x):
            extra = set(r) - set(cols)
            if extra:
                errores.append(f"{k} fila {i}: columnas nuevas {sorted(extra)} (actualiza _esquema.json y la página)")
    print("\n".join(errores) or f"OK: {len(esquema)} datasets oficiales")
    sys.exit(1 if errores else 0)


if __name__ == "__main__":
    main()
