# ARDI Hockey Patín 3.55 — Archivo del día (JSON), sólo P1 encendida, deuda saldada

Se aplica sobre la 3.54.1. Service worker `ardi-v355`.

**Falta en tu equipo** (aquí no había red): `tsc --noEmit`, `next build`, la
prueba `csv` (planteles, usa papaparse) y `pnpm install --frozen-lockfile`
desde cero. No se agregó ninguna dependencia: el lockfile no cambia.

Pruebas: **181 casos en verde** en 14 suites (todas menos `csv`). Tres corren
contra el código real: `figura`, `historial` (28, nueva) y `reanudar` (10,
nueva). En Chromium, con el hook y los modales reales: el flujo completo de
una jornada de 10 partidos hasta el archivo del día, el modal de estadísticas y los overlays.

---

## 1. Archivo del día: el JSON oficial

El historial ahora está **agrupado por día**. Cada día tiene un botón,
**Archivo del día**, que:

- crea `jornada-AAAA-MM-DD.json` (`ardi:jornada`) y lo **descarga**: el
  archivo oficial que se sube a la web del club;
- abre la **vista** del día: las crónicas de esos mismos partidos, en orden.

Cada partido del JSON es exactamente su **Datos web** (`ardi:partido`), con
su `serie` para que la web reparta los resultados como noticias. JSON y vista
salen de la misma función: no pueden traer partidos distintos. Cada partido
del historial sigue teniendo su botón para reabrir la crónica.

El flujo del pendrive y el contrato completo para la web están en
**`ARCHIVO-DEL-DIA.md`**.

*Medido en el navegador, con el hook real:* una jornada de **10 partidos** →
el historial la muestra agrupada, el JSON trae los 10 en orden de juego con su
serie y resultado, el escudo del club entero en cada uno (≈50 KB el archivo),
y la vista abre con las 10 crónicas. En el almacenamiento, 10 partidos ocupan
≈83 KB y el escudo se guarda una sola vez.

**Límites:** el historial guarda 60 partidos (6 jornadas de 10); el archivo
del día de cada jornada es el respaldo. Los partidos guardados antes de la
3.55 no traen los datos y no entran; ARDI avisa cuántos quedaron fuera.

## 1b. Sólo P1 encendida por defecto

Una instalación nueva parte con **sólo P1** y su lanzador. P2–P5 se encienden
en *Vistas y proyectores*; los lanzadores de gol, final, figura y
estadísticas, en *Lanzadores de proyección*, como ya funcionaba. Cada pantalla
visible es un tablero vivo más en PANTALLAS: menos encendido, mejor
rendimiento.

**Lo ya configurado y guardado no cambia.** Excepción a saber: si una
configuración guardada es anterior a la figura del partido, la figura
aparece apagada hasta encenderla.

*Medido:* instalación nueva con el partido terminado → ningún lanzador se
pinta solo; encendido el de final en su modal → aparece.

## 2. Fuera los CSV que no se usan

Quedan **sólo los de planteles** (cargar y exportar), que ya estaban unificados.

- Estadísticas del partido: sin CSV. Botones **Ver crónica** y **Datos web**.
- Historial: sin *Exportar historial*, sin *Tabla y goleadores* en CSV, sin el
  CSV por partido (ahora ese botón abre la crónica). Las pestañas de
  posiciones y goleadores siguen en pantalla.

**Retomar un suspendido** era lo único que el CSV hacía y nadie más hacía.
Pasa a los **Datos web**: traen un bloque nuevo y opcional, `reanudacion`
(periodo y reloj). *Cargar partido suspendido* lee ese archivo y sigue
leyendo un CSV viejo si alguien lo tiene guardado.

## 3. Bug encontrado: partidos de noche con la fecha del día siguiente

La fecha del partido se ponía con `toISOString()`, que es la fecha en **UTC**.
En Chile (UTC-3), un partido configurado desde las 21:00 quedaba fechado al
día siguiente: en la crónica, en la clave que usa la web y en el archivo del
día. Ahora es la fecha local, en un solo helper (`fechaLocal`), en los tres
sitios donde estaba.

## 4. Deuda de la 3.54

| Deuda | Estado |
|---|---|
| "Guardar y nuevo" sin confirmar en pleno partido | Con el partido en juego pide un segundo toque; se desarma a los 4 s. *Medido.* |
| Almacenamiento escrito dentro del updater de `setState` | Fuera. Un único `commitHistory` cambia estado, ref y almacenamiento. |
| Parciales contados aparte en el modal | Salen de `buildSummary`, como la crónica y el resumen proyectado. |
| Rótulo de periodo escrito cuatro veces | Una tabla. |
| Nombres y escudos del partido en dos sitios | `reportOptsFor`: modal, crónica guardada y Datos web. |
| Página de la crónica escrita dentro de `openMatchReport` | `lib/cronica-doc.ts`: la usan el partido suelto y la vista del día. Un solo escapador de HTML. |
| Registro cronológico sin la tanda de penales | Incluida. |
| Línea suelta `'sonner'`, variables sin uso | Fuera. |
| `OfficialSheetModal` | Ahora `MatchStatsModal`. |
| Pruebas que copiaban la lógica | `historial` y `reanudar` ejecutan el código real. |
| Guía de uso con firmas y sello | `REGLAMENTO-Y-USO.md` al día. |

**No se hizo, a propósito:**

- **`gameState as any` en `page.tsx`**: tiparlo sin las definiciones de React
  instaladas es a ciegas; puede romper `next build` en Vercel. Con `tsc` a mano.
- **Duplicados viejos del historial**: sin inicio guardado no hay forma segura
  de saber si dos registros son el mismo partido.
- **`anular` sigue copiando la lógica**: es el motor de tarjetas, congelado.
- **El banco de Playwright no entra al repo**: cambiaría el lockfile.
- **La carpeta del zip sigue siendo `ARDI-Hockey-3.5`**: renombrarla puede
  romper el directorio raíz configurado en Vercel.
- **PISTA y CONTROL no se montaron enteros** en el navegador.
