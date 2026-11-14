"""Lluvia prevista 7 días por departamento (GFS 0,25°, NOAA NOMADS).

Uso: python3 scripts/gfs_lluvia.py [YYYYMMDDHH]
Sin argumento busca la corrida más reciente con f168 disponible.
Requiere datos/departamentos.json: lista de {id, geometry} (geometry como texto GeoJSON).
Salida: datos/lluvia_pronostico.json
"""
import sys, json, os, datetime as dt, urllib.request, urllib.error, tempfile
import numpy as np, eccodes
from shapely.geometry import shape, Point
from shapely.prepared import prep

BASE = ("https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl?dir=%2Fgfs.{d}%2F{h}%2Fatmos"
        "&file=gfs.t{h}z.pgrb2.0p25.f{f}&var_APCP=on&lev_surface=on&subregion="
        "&toplat=1&leftlon=278&rightlon=293&bottomlat=-19")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def url(run, fh):
    return BASE.format(d=run[:8], h=run[8:], f=f"{fh:03d}")


def existe(run):
    try:
        with urllib.request.urlopen(url(run, 168), timeout=60) as r:
            return r.status == 200 and len(r.read(64)) > 0
    except urllib.error.URLError:
        return False


def corrida_reciente():
    t = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None) - dt.timedelta(hours=5)
    t = t.replace(hour=t.hour // 6 * 6, minute=0, second=0, microsecond=0)
    for _ in range(4):
        run = t.strftime("%Y%m%d%H")
        if existe(run):
            return run
        t -= dt.timedelta(hours=6)
    sys.exit("No hay corrida GFS completa en las últimas 24 h")


def main():
    run = sys.argv[1] if len(sys.argv) > 1 else corrida_reciente()
    tmp = tempfile.mkdtemp()
    fields, lat, lon = {}, None, None
    for fh in range(6, 169, 6):
        p = os.path.join(tmp, f"f{fh:03d}.grb")
        urllib.request.urlretrieve(url(run, fh), p)
        with open(p, "rb") as fhd:
            while True:
                g = eccodes.codes_grib_new_from_file(fhd)
                if g is None:
                    break
                s, e = eccodes.codes_get(g, "startStep"), eccodes.codes_get(g, "endStep")
                if e - s == 6:  # cada archivo trae dos APCP; solo el acumulado de 6 h
                    ni, nj = eccodes.codes_get(g, "Ni"), eccodes.codes_get(g, "Nj")
                    fields[e] = eccodes.codes_get_values(g).reshape(nj, ni)
                    if lat is None:
                        lat = eccodes.codes_get_array(g, "latitudes").reshape(nj, ni)
                        lon = eccodes.codes_get_array(g, "longitudes").reshape(nj, ni) - 360
                eccodes.codes_release(g)
    steps = sorted(fields)
    assert steps == list(range(6, 169, 6)), f"pasos incompletos: {steps}"
    tot = sum(fields[s] for s in steps)
    dias = [sum(fields[s] for s in steps if (s - 1) // 24 == d) for d in range(7)]

    t0 = dt.datetime.strptime(run, "%Y%m%d%H")
    meta = dict(corrida=t0.strftime("%Y-%m-%d %H UTC"), desde=t0.strftime("%Y-%m-%d"),
                hasta=(t0 + dt.timedelta(days=7)).strftime("%Y-%m-%d"))
    deps = json.load(open(os.path.join(ROOT, "datos", "departamentos.json")))
    out = []
    for d in deps:
        p = prep(shape(json.loads(d["geometry"])))
        m = np.array([[p.contains(Point(lon[i, j], lat[i, j])) for j in range(lat.shape[1])]
                      for i in range(lat.shape[0])])
        if m.sum() == 0:
            r = dict(id=d["id"], media_mm=0.0, max_mm=0.0, dia_max_mm=0.0)
        else:
            r = dict(id=d["id"], media_mm=round(float(tot[m].mean()), 1),
                     max_mm=round(float(tot[m].max()), 1),
                     dia_max_mm=round(float(max(x[m].max() for x in dias)), 1))
        r.update(meta)
        out.append(r)
    out.sort(key=lambda o: -o["media_mm"])
    json.dump(out, open(os.path.join(ROOT, "datos", "lluvia_pronostico.json"), "w"),
              ensure_ascii=False, indent=0)
    print("GFS", meta["corrida"], len(out), "departamentos")


if __name__ == "__main__":
    main()
