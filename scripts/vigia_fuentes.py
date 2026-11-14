"""Vigía de fuentes que requieren revisión humana (ENFEN, SENAMHI, NOAA CPC discusión).

No publica nada. Detecta novedades y abre un issue REVISAR con el enlace a la fuente.
Si una fuente no responde, abre un issue FUENTE CAIDA (una vez, no cada día).
Estado: datos/vigia_estado.json
Requiere: gh CLI autenticado (GITHUB_TOKEN en Actions).
"""
import os, re, json, time, subprocess, urllib.request, datetime as dt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ESTADO = os.path.join(ROOT, "datos", "vigia_estado.json")
UA = {"User-Agent": "Mozilla/5.0 (dataslut-vigia; +https://cjvidal.com)"}

# patron: regex cuyas coincidencias identifican cada documento nuevo.
# PENDIENTE primera prueba: confirmar que cada página responde desde GitHub Actions
# y que el patrón captura lo esperado. SENAMHI carga la tabla por JavaScript en el
# navegador; si el HTML no trae los números, hay que apuntar al endpoint de datos.
# Desde los servidores de GitHub (prueba del 14 nov 2026):
# - ENFEN (enfen.imarpe.gob.pe) no resuelve por DNS, ni con 3 reintentos. Lo vigila el
#   agente programado de Claude (18:17 Lima), desde donde sí responde.
# - SENAMHI no responde (timeout); tampoco desde la nube de Claude. Sigue manual.
FUENTES = {
    "NOAA CPC discusión ENSO": dict(
        url="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml",
        patron=r"(?s)issued by.{0,2000}?(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})"),
}


def gh(*args):
    return subprocess.run(["gh", *args], capture_output=True, text=True)


def issue_abierto(titulo):
    r = gh("issue", "list", "--state", "open", "--search", f'"{titulo}" in:title', "--json", "number")
    return r.returncode == 0 and json.loads(r.stdout or "[]")


def abrir(titulo, cuerpo, etiqueta):
    if issue_abierto(titulo):
        return
    r = gh("issue", "create", "--title", titulo, "--body", cuerpo, "--label", etiqueta)
    if r.returncode != 0:  # etiqueta inexistente: crear y reintentar
        gh("label", "create", etiqueta, "--force")
        gh("issue", "create", "--title", titulo, "--body", cuerpo, "--label", etiqueta)


def leer(url, intentos=3):
    """Hasta 3 intentos con 20 s de espera: GitHub tuvo fallas de DNS pasajeras con ENFEN."""
    for i in range(intentos):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                          timeout=60).read().decode("utf-8", "ignore")
        except Exception:  # noqa: BLE001
            if i == intentos - 1:
                raise
            time.sleep(20)


def main():
    estado = json.load(open(ESTADO)) if os.path.exists(ESTADO) else {}
    hoy = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None).strftime("%Y-%m-%d %H:%M UTC")
    for nombre, f in FUENTES.items():
        prev = set(estado.get(nombre, {}).get("vistos", []))
        fallas = estado.get(nombre, {}).get("fallas", 0)
        try:
            html = leer(f["url"])
        except Exception as e:  # noqa: BLE001
            fallas += 1
            estado.setdefault(nombre, {"vistos": []}).update(fallas=fallas, ultima_falla=hoy, error=str(e)[:200])
            if fallas >= 2:  # dos corridas seguidas: no es un error pasajero
                abrir(f"FUENTE CAIDA: {nombre}",
                      f"No respondió en {fallas} corridas seguidas (última: {hoy}).\n\nURL: {f['url']}\nError: {e}\n\n"
                      "No se detectan novedades de esta fuente mientras siga caída. El agente de las 18:17 "
                      "la revisa desde la nube de Claude como respaldo.", "FUENTE-CAIDA")
            continue
        vistos = set(re.findall(f["patron"], html))
        if not vistos:
            abrir(f"PATRON ROTO: {nombre}",
                  f"La página respondió pero no se encontró ningún documento ({hoy}).\n"
                  f"URL: {f['url']}\nRevisar el patrón en scripts/vigia_fuentes.py.", "FUENTE-CAIDA")
            continue
        nuevos = sorted(vistos - prev)
        if prev and nuevos:
            abrir(f"REVISAR {nombre}: {', '.join(nuevos)}",
                  f"Novedad detectada el {hoy}.\n\nFuente: {f['url']}\nNuevos: {', '.join(nuevos)}\n\n"
                  "El agente verifica contra la fuente, archiva en raw/ de la bóveda y propone "
                  "el cambio (PR) con la matriz. Nada entra a la web sin visto bueno de CJ.",
                  "REVISAR")
        estado[nombre] = dict(vistos=sorted(vistos | prev), revisado=hoy, url=f["url"], fallas=0)
    json.dump(estado, open(ESTADO, "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
