"""Valida rangos y frescura de los JSON publicados y escribe datos/estado.json.

Uso: python3 scripts/validar.py <dataset>   (lluvia | mar | cpc | todos)
Sale con error si un dato está fuera de rango: el workflow no publica y abre un issue.
La web lee estado.json: si un dataset está vencido, muestra SIN DATO.
"""
import os, sys, json, datetime as dt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = lambda n: os.path.join(ROOT, "datos", n)

# Vencimiento propuesto (ajustable): lo que la web considera vigente.
VENCE_H = {"lluvia": 48, "mar": 96, "cpc": 24 * 10}


def fecha_lluvia(x):
    assert x, "vacío"
    for r in x:
        assert 0 <= r["media_mm"] <= r["max_mm"] <= 2000, r
        assert 0 <= r["dia_max_mm"] <= 800, r
    return dt.datetime.strptime(x[0]["corrida"], "%Y-%m-%d %H UTC")


def fecha_mar(x):
    assert x and len(x) % 96 == 0, f"filas {len(x)}"
    for r in x:
        vals = [float(v) for v in r["vals"].split(",") if v]
        assert all(-10 <= v <= 12 for v in vals), r["fecha"]
    return dt.datetime.fromisoformat(max(r["fecha"] for r in x))


def fecha_cpc(x):
    assert x, "vacío"
    for s in x:
        assert -5 <= s["nino12"] <= 9 and -4 <= s["nino34"] <= 5, s
    # la semana CPC se centra en miércoles; se publica el lunes siguiente
    return dt.datetime.fromisoformat(x[-1]["semana"]) + dt.timedelta(days=5)


CHEQUEOS = {"lluvia": ("lluvia_pronostico.json", fecha_lluvia),
            "mar": ("mar_anomalia.json", fecha_mar),
            "cpc": ("noaa_semanal.json", fecha_cpc)}


def main():
    pedido = sys.argv[1] if len(sys.argv) > 1 else "todos"
    est = json.load(open(D("estado.json"))) if os.path.exists(D("estado.json")) else {}
    ahora = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)
    error = False
    for k, (archivo, fn) in CHEQUEOS.items():
        if not os.path.exists(D(archivo)):
            est[k] = dict(estado="SIN DATO", motivo="archivo no existe")
            continue
        try:
            f = fn(json.load(open(D(archivo))))
            edad = (ahora - f).total_seconds() / 3600
            est[k] = dict(archivo=archivo, dato_al=f.isoformat(), edad_h=round(edad, 1),
                          estado="VIGENTE" if edad <= VENCE_H[k] else "VENCIDO")
        except (AssertionError, KeyError, ValueError) as e:
            est[k] = dict(archivo=archivo, estado="SIN DATO", motivo=f"validación: {e}"[:300])
            if pedido in (k, "todos"):
                error = True
    est["generado"] = ahora.strftime("%Y-%m-%d %H:%M UTC")
    json.dump(est, open(D("estado.json"), "w"), ensure_ascii=False, indent=1)
    print(json.dumps(est, ensure_ascii=False, indent=1))
    sys.exit(1 if error else 0)


if __name__ == "__main__":
    main()
