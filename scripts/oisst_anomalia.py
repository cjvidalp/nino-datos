"""Anomalía diaria de temperatura del mar frente a Perú (OISST v2.1 preliminar, NOAA NCEI).

Reproduce el dataset mar_anomalia del dashboard (comprobado 11 nov 2026: 96/96 filas).
Grilla 0,25°, lat -20.875..2.875 (96 filas), lon -91.875..-67.125 (100 columnas).
Uso: python3 scripts/oisst_anomalia.py [YYYYMMDD ...]
Sin argumento: agrega los días disponibles de los últimos 6 y conserva los 10 más recientes.
Salida: datos/mar_anomalia.json
"""
import sys, os, json, tempfile, urllib.request, urllib.error, datetime as dt
import numpy as np, netCDF4

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(ROOT, "datos", "mar_anomalia.json")
URL = ("https://www.ncei.noaa.gov/data/sea-surface-temperature-optimum-interpolation/v2.1/"
       "access/avhrr/{ym}/oisst-avhrr-v02r01.{f}_preliminary.nc")
DIAS_GUARDADOS = 4  # formato web (el dashboard usaba 10 días y 2 decimales)


def extraer(fecha):
    p = os.path.join(tempfile.mkdtemp(), "oi.nc")
    try:
        urllib.request.urlretrieve(URL.format(ym=fecha[:6], f=fecha), p)
    except urllib.error.HTTPError:
        return None
    ds = netCDF4.Dataset(p)
    lat, lon, a = ds["lat"][:], ds["lon"][:], ds["anom"][0, 0]
    iso = f"{fecha[:4]}-{fecha[4:6]}-{fecha[6:]}"
    filas = []
    for la in np.arange(-20.875, 2.876, 0.25):
        i = int(np.argmin(abs(lat - la)))
        vals = []
        for k in range(100):
            j = int(np.argmin(abs(lon - (-91.875 + k * 0.25) % 360)))
            v = a[i, j]
            vals.append("" if np.ma.is_masked(v) else f"{float(f'{float(v):.2f}'):.1f}")  # dos pasos, igual que la web
        filas.append(dict(fecha=iso, lat=round(float(la), 3), lon0=-91.875, dlon=0.25,
                          vals=",".join(vals)))
    return filas


def main():
    fechas = sys.argv[1:] or [(dt.date.today() - dt.timedelta(days=d)).strftime("%Y%m%d")
                              for d in range(1, 7)]
    actual = json.load(open(SALIDA)) if os.path.exists(SALIDA) else []
    por_dia = {}
    for r in actual:
        por_dia.setdefault(r["fecha"], []).append(r)
    nuevos = 0
    for f in fechas:
        iso = f"{f[:4]}-{f[4:6]}-{f[6:]}"
        if iso in por_dia:
            continue
        filas = extraer(f)
        if filas:
            por_dia[iso] = filas
            nuevos += 1
    dias = sorted(por_dia)[-DIAS_GUARDADOS:]
    out = [r for d in dias for r in por_dia[d]]
    json.dump(out, open(SALIDA, "w"), separators=(",", ":"))
    print("OISST", nuevos, "días nuevos; último", dias[-1] if dias else "ninguno")


if __name__ == "__main__":
    main()
