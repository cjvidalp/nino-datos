# nino-datos

Datos abiertos del [Monitor El Niño Perú 2026-27](https://cjvidal.com/el-nino-monitor-peru/), por Carlos Vidal.
Fuente no oficial. Para decisiones, consulta ENFEN, SENAMHI e INDECI.

## Archivos (GitHub Pages)

Base: `https://cjvidalp.github.io/nino-datos/datos/`

| Archivo | Qué es | Fuente | Actualización |
|---|---|---|---|
| `noaa_semanal.json` | Anomalía semanal Niño 1+2, 3, 3.4, 4 (°C, base 1991-2020) | NOAA CPC | Lun y mar |
| `mar_anomalia.json` | Anomalía diaria del mar frente a Perú, grilla 0,25°, últimos 4 días | NOAA NCEI OISST v2.1 preliminar | Diaria |
| `lluvia_pronostico.json` | Lluvia prevista 7 días por departamento (mm). **Pronóstico de modelo** | NOAA GFS 0,25° | 2 veces al día |
| `departamentos.json` | Geometrías de los 25 departamentos | Monitor v4 | Fija |
| `estado.json` | Frescura de cada archivo: VIGENTE, VENCIDO o SIN DATO | Este repo | Con cada corrida |
| `vigia_estado.json` | Últimos documentos vistos de ENFEN, SENAMHI y NOAA | Este repo | 3 veces al día |

## Cómo funciona
- Cada workflow descarga, calcula y valida rangos (`scripts/validar.py`). Si algo falla, **no publica** y abre un issue `FALLA-DATOS`.
- El vigía (`scripts/vigia_fuentes.py`) no publica nada. Abre issues `REVISAR` cuando ENFEN, SENAMHI o NOAA publican algo nuevo, y `FUENTE-CAIDA` si una fuente no responde.
- Lo que viene de fuentes oficiales con revisión humana entra por PR, con visto bueno de CJ.

Los formatos son idénticos a los datasets de la página publicada (comprobado el 13 nov 2026: NOAA 16/16 semanas, OISST 384/384 filas, GFS 24/25 departamentos).
