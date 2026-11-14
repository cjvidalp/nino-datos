"""Valida los JSON antes de publicarlos y escribe datos/estado.json.

Uso: python3 scripts/validar.py <dataset>   (lluvia | mar | cpc | todos)

Códigos de salida:
  0  todo bien: se publica.
  1  ERROR (bloquea): fuera de rango, faltan departamentos o filas, el dato retrocede
     en el tiempo o viene vacío. No se publica; el workflow abre un issue FALLA-DATOS.
  3  SALTO (no bloquea): cambio brusco frente a la versión anterior. Se publica y el
     workflow abre un issue REVISAR con el detalle (/tmp/alertas.txt).

La web no debe confiar solo en estado.json: si una corrida falla, estado.json no se
publica y su edad_h queda congelada. La web debe calcular la edad con dato_al.
"""
import os, sys, json, subprocess, datetime as dt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = lambda n: os.path.join(ROOT, "datos", n)
ALERTAS = "/tmp/alertas.txt"

# Umbrales (propuesta, ajustables)
VENCE_H = {"lluvia": 48, "mar": 96, "cpc": 24 * 10}
LLUVIA_BASE_MM = 30       # solo se vigilan saltos en departamentos con al menos 30 mm antes
LLUVIA_FACTOR = 5         # salto si se multiplica o divide por 5 o más
LLUVIA_TOTAL = 0.7        # salto si la suma nacional cambia más de 70 %
MAR_SALTO_C = 3.0         # cambio de una celda entre días consecutivos
MAR_SALTO_PCT = 0.05      # salto si más del 5 % de las celdas cambia más de 3 °C
MAR_MIN_OCEANO = 0.9      # cada día debe tener al menos 90 % de las celdas de mar del día anterior
CPC_SALTO_C = 1.5         # cambio semanal de un índice


def anterior(archivo):
    """Versión publicada (último commit). None si no existe."""
    try:
        txt = subprocess.run(["git", "-C", ROOT, "show", f"HEAD:datos/{archivo}"],
                             capture_output=True, text=True, check=True).stdout
        return json.loads(txt)
    except Exception:  # noqa: BLE001
        return None


def lluvia(x, prev, saltos):
    assert x, "vacío"
    ids = [r["id"] for r in x]
    deps = {d["id"] for d in json.load(open(D("departamentos.json")))}
    assert len(ids) == len(set(ids)), "departamentos repetidos"
    assert set(ids) == deps, f"faltan {sorted(deps - set(ids))} / sobran {sorted(set(ids) - deps)}"
    assert len({r["corrida"] for r in x}) == 1, "corridas mezcladas"
    for r in x:
        assert 0 <= r["media_mm"] <= r["max_mm"] <= 2000, r
        assert 0 <= r["dia_max_mm"] <= min(800, r["max_mm"] + 0.1), r
    assert sum(r["media_mm"] for r in x) > 0, "todo en cero: descarga incompleta"
    f = dt.datetime.strptime(x[0]["corrida"], "%Y-%m-%d %H UTC")
    if prev:
        fp = dt.datetime.strptime(prev[0]["corrida"], "%Y-%m-%d %H UTC")
        assert f >= fp, f"la corrida {f} es anterior a la publicada {fp}"
        p = {r["id"]: r["media_mm"] for r in prev}
        for r in x:
            a, b = p.get(r["id"], 0), r["media_mm"]
            if a >= LLUVIA_BASE_MM and (b < a / LLUVIA_FACTOR or b > a * LLUVIA_FACTOR):
                saltos.append(f"lluvia {r['id']}: {a} → {b} mm (corrida {x[0]['corrida']})")
        ta, tb = sum(p.values()), sum(r["media_mm"] for r in x)
        if ta > 0 and abs(tb - ta) / ta > LLUVIA_TOTAL:
            saltos.append(f"lluvia total nacional: {ta:.0f} → {tb:.0f} mm")
    return f


def mar(x, prev, saltos):
    assert x, "vacío"
    dias = {}
    for r in x:
        v = r["vals"].split(",")
        assert len(v) == 100, f"{r['fecha']} lat {r['lat']}: {len(v)} columnas"
        vals = [float(a) if a else None for a in v]
        assert all(-10 <= a <= 12 for a in vals if a is not None), r["fecha"]
        dias.setdefault(r["fecha"], {})[r["lat"]] = vals
    orden = sorted(dias)
    for d in orden:
        assert len(dias[d]) == 96, f"{d}: {len(dias[d])} filas"
    oceano = lambda d: sum(a is not None for fila in dias[d].values() for a in fila)
    for d0, d1 in zip(orden, orden[1:]):
        assert oceano(d1) >= MAR_MIN_OCEANO * oceano(d0), f"{d1}: faltan celdas de mar"
        dif = [abs(a - b) for lat in dias[d1] for a, b in zip(dias[d0][lat], dias[d1][lat])
               if a is not None and b is not None]
        n = sum(x > MAR_SALTO_C for x in dif)
        if dif and n / len(dif) > MAR_SALTO_PCT:
            saltos.append(f"mar {d0} → {d1}: {n} de {len(dif)} celdas cambian más de {MAR_SALTO_C} °C")
    f = dt.datetime.fromisoformat(orden[-1])
    if prev:
        fp = dt.datetime.fromisoformat(max(r["fecha"] for r in prev))
        assert f >= fp, f"último día {f.date()} anterior al publicado {fp.date()}"
    return f


def cpc(x, prev, saltos):
    assert x, "vacío"
    sem = [dt.date.fromisoformat(s["semana"]) for s in x]
    assert all((b - a).days == 7 for a, b in zip(sem, sem[1:])), "semanas no consecutivas"
    for s in x:
        assert -5 <= s["nino12"] <= 9 and -5 <= s["nino3"] <= 7, s
        assert -4 <= s["nino34"] <= 5 and -4 <= s["nino4"] <= 4, s
    for a, b in zip(x, x[1:]):
        for k in ("nino12", "nino3", "nino34", "nino4"):
            if abs(b[k] - a[k]) > CPC_SALTO_C:
                saltos.append(f"cpc {k}: {a[k]} → {b[k]} °C ({a['semana']} → {b['semana']})")
    if prev:
        assert sem[-1] >= dt.date.fromisoformat(prev[-1]["semana"]), "última semana anterior a la publicada"
    # la semana CPC se centra en miércoles; se publica el lunes siguiente
    return dt.datetime.combine(sem[-1], dt.time()) + dt.timedelta(days=5)


CHEQUEOS = {"lluvia": ("lluvia_pronostico.json", lluvia),
            "mar": ("mar_anomalia.json", mar),
            "cpc": ("noaa_semanal.json", cpc)}


def main():
    pedido = sys.argv[1] if len(sys.argv) > 1 else "todos"
    est = json.load(open(D("estado.json"))) if os.path.exists(D("estado.json")) else {}
    ahora = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)
    error, saltos_pedido = False, []
    for k, (archivo, fn) in CHEQUEOS.items():
        if not os.path.exists(D(archivo)):
            est[k] = dict(estado="SIN DATO", motivo="archivo no existe")
            continue
        saltos = []
        try:
            f = fn(json.load(open(D(archivo))), anterior(archivo), saltos)
            edad = (ahora - f).total_seconds() / 3600
            est[k] = dict(archivo=archivo, dato_al=f.isoformat(), edad_h=round(edad, 1),
                          estado="VIGENTE" if edad <= VENCE_H[k] else "VENCIDO")
            if saltos:
                est[k]["saltos"] = saltos
        except (AssertionError, KeyError, ValueError, TypeError) as e:
            est[k] = dict(archivo=archivo, estado="SIN DATO", motivo=f"validación: {e}"[:300])
            if pedido in (k, "todos"):
                error = True
        if pedido in (k, "todos"):
            saltos_pedido += saltos
    est["generado"] = ahora.strftime("%Y-%m-%d %H:%M UTC")
    json.dump(est, open(D("estado.json"), "w"), ensure_ascii=False, indent=1)
    print(json.dumps(est, ensure_ascii=False, indent=1))
    if error:
        sys.exit(1)
    if saltos_pedido:
        open(ALERTAS, "w").write("\n".join(f"- {s}" for s in saltos_pedido) + "\n")
        sys.exit(3)
    sys.exit(0)


if __name__ == "__main__":
    main()
