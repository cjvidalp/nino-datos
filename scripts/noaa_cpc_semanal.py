"""Temperatura y anomalía semanal de las regiones Niño (NOAA CPC, base 1991-2020).

Fuente: https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for
Uso: python3 scripts/noaa_cpc_semanal.py
Salida: datos/noaa_semanal.json (últimas 16 semanas, anomalías)
"""
import os, json, re, urllib.request, datetime as dt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for"
MESES = {m: i for i, m in enumerate(
    ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], 1)}


def main():
    txt = urllib.request.urlopen(URL, timeout=60).read().decode("latin-1")
    filas = []
    for ln in txt.splitlines():
        m = re.match(r"\s*(\d{2})([A-Z]{3})(\d{4})\s+(.*)", ln)
        if not m:
            continue
        nums = [float(x) for x in re.findall(r"-?\d+\.\d+", m.group(4))]
        if len(nums) != 8:
            continue
        fecha = dt.date(int(m.group(3)), MESES[m.group(2)], int(m.group(1)))
        # formato web: solo anomalías (°C, base 1991-2020)
        filas.append(dict(semana=fecha.isoformat(), nino12=nums[1], nino3=nums[3],
                          nino34=nums[5], nino4=nums[7]))
    if not filas:
        raise SystemExit("Formato de CPC cambió: no se leyó ninguna fila")
    out = filas[-16:]
    json.dump(out, open(os.path.join(ROOT, "datos", "noaa_semanal.json"), "w"),
              ensure_ascii=False, indent=1)
    print("CPC última semana", filas[-1]["semana"])


if __name__ == "__main__":
    main()
