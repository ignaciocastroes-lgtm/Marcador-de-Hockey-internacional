# Archivo del día — de la mesa a la web del club

El archivo oficial de una jornada es **un JSON**: `jornada-AAAA-MM-DD.json`.
Se sube a la web del club, y la web lo muestra como HTML y reparte los
resultados por serie como noticias.

## En la mesa

1. Al terminar cada partido: **ESTADÍSTICAS → Guardar en historial** (o
   **Guardar y nuevo partido**). Guardar dos veces el mismo partido no lo duplica.
2. Al cerrar la jornada: **HISTORIAL**. Los partidos están agrupados por día.
   En el día que corresponde, tocar **Archivo del día**. Ese botón:
   - crea el JSON del día y lo **descarga**;
   - abre la **vista** del día: las crónicas de esos mismos partidos, en orden.
3. Copiar `jornada-AAAA-MM-DD.json` al pendrive.

El archivo lleva **el día completo**, aunque la lista esté filtrada por serie.

## En casa

Subir `jornada-AAAA-MM-DD.json` a la web del club. Nada más.

## Cuidados

- **El historial guarda 60 partidos.** Con 10 por jornada son 6 jornadas; los
  más viejos se van cayendo. Sacar el archivo del día **cada jornada**: ese
  archivo es el respaldo.
- Los partidos guardados **antes de la 3.55** no traen los datos para la web y
  no entran al archivo. ARDI avisa cuántos quedaron fuera.
- Los escudos pegados como imagen van **dentro** del archivo. Un día de 10
  partidos pesa del orden de 50 KB.

---

## Contrato del archivo (para la web)

```json
{
  "formato": "ardi:jornada",
  "version": 1,
  "fecha": "2026-09-19",
  "partidos": [ { "formato": "ardi:partido", "...": "..." } ]
}
```

`partidos` va **en orden de juego**. Cada elemento es exactamente el archivo
**Datos web** de ese partido (`ardi:partido`, versión 1):

| Campo | Qué es |
|---|---|
| `id` | Clave estable: fecha + serie + equipos. **La web hace upsert por `id`**: subir otra vez el mismo día reemplaza, no duplica. |
| `fecha`, `hora` | `AAAA-MM-DD` y `HH:MM`, hora local de Chile. |
| `campeonato`, `serie`, `rama`, `estadio` | Texto. **`serie` es lo que usa la web para repartir las noticias.** |
| `local`, `visita` | `nombre`, `escudo`, `goles`, `penales`, `faltas`, `posesionSeg`, `posesionPct`, `goleadores` (`minuto`, `dorsal`), `tarjetas` (`tipo`: yellow/blue/red, `dorsal`, `banca`). |
| `ganador` | `local`, `visita` o `empate`. |
| `hubopenales` | Si se definió por penales (ver `penales` de cada lado). |
| `parciales` | Goles por periodo: `periodo`, `local`, `visita`. |
| `duracionRealSeg` | Segundos reales de inicio a fin, con descansos y detenciones, o `null`. |
| `cronologia` | `minuto`, `periodo`, `equipo`, `texto`, `anulado`. |
| `reanudacion` | Uso interno de ARDI (retomar un suspendido). **La web lo ignora.** |

Reglas que la web debe respetar:

- **Los goles anulados ya vienen descontados** del marcador. En `cronologia`
  llegan con `anulado: true`: se pueden mostrar tachados, nunca sumar.
- **`escudo`** puede ser una imagen incrustada (`data:image/...`), una URL
  completa o una **ruta del sitio de ARDI** (`/escudos/...`). Una ruta no
  existe en la web del club: la web tiene que resolverla o usar un escudo
  propio del equipo.
- Campos que la web no conozca: ignorarlos. Así ARDI puede sumar datos sin
  romperla.
