# ARDI Hockey Patín 3.54 — Estadísticas sin planilla, overlays en su caja

Dos rondas, dos despliegues: **3.54** (ronda 1, `ardi-v354`) y **3.54.1**
(ronda 2, `ardi-v354-1`). Van separadas para que, si la ronda 2 rompe algo,
no se mezcle con el arreglo del sábado.

**Lo que falta verificar en tu equipo** (aquí no había red para instalar
dependencias): `tsc --noEmit`, `next build`, la prueba `csv` y
`pnpm install --frozen-lockfile` desde cero. No se tocó `package.json` salvo
la versión, así que el lockfile no cambia.

Pruebas: 13 suites sin dependencias en verde (150 casos, incluida la nueva
`historial`). Lo de abajo marcado *medido* se midió en Chromium con los
componentes reales de la 3.54 frente a los de la 3.53.

---

## 1. Los overlays tapaban la mesa (PANTALLAS)

En un descanso o al final, el resumen / ganador de la previsualización tapaba
el GESTOR PANTALLAS y los diálogos de Lanzadores: no se podía ajustar nada
justo en el tiempo muerto. En el móvil, la LUPA de cada pantalla asomaba por
encima del fondo oscuro del gestor.

Causa: los lanzadores embebidos son `absolute` con z-index 2800–3000. El
`overflow-hidden` del recuadro los recortaba en superficie, pero el recuadro no
creaba contexto de apilamiento, así que su z-index competía con la página
entera (gestor z-200, diálogos z-310).

Arreglo (`scoreboard-view.tsx`): `isolate` en la raíz **sólo en
previsualización**. La proyección no cambia. La lupa, el engranaje y el panel
de ajustes del recuadro suben por encima del overlay: son de la mesa y se
tienen que poder tocar con un gol en pantalla.

*Medido*, con el cartel de ganador activo:

| | 3.53 | 3.54 |
|---|---|---|
| Gestor pantallas | tapado por el overlay | encima |
| Diálogo de Lanzadores | tapado | encima |
| Lupa del recuadro | tapada por el overlay | se puede tocar |
| Fondo del gestor en móvil | el overlay asoma encima | queda debajo |

## 2. De planilla oficial a Estadísticas del partido

Ya nadie firma. Para guardar un partido normal había que marcar "Forzar
cierre", y el CSV lo registraba como `CIERRE FORZADO`.

- Fuera: sello, 8 firmas, Forzar cierre, observaciones (clave suelta que no
  llegaba ni al historial ni a la crónica) y ACTA (PDF), que era un
  `window.print()` del modal oscuro.
- Exportaciones en una fila, arriba: **Ver crónica** (trae Imprimir y Copiar
  para la web), **Datos web**, **CSV**.
- Pie fijo: **Guardar en historial** y **Guardar y nuevo partido**, sin
  firmar ni bajar hasta el fondo.
- El botón PLANILLA de PISTA y CONTROL pasa a ESTADÍSTICAS; el aviso de FIN ya
  no promete una planilla oficial.

**El CSV se queda**: su bloque `REANUDACION` es lo que lee *Cargar planilla
suspendida*. Salen de él firmas, observaciones y estado de planilla; el
archivo se llama `estadisticas_…csv`.

*Medido*: sin rastro de firmas/sello en el modal ni en el CSV; el lector de
reanudación de PreMatchSetup entiende el CSV nuevo; la crónica imprime en
**carta vertical** (612×792 pt); guardar y empezar otro sin tocar nada más.

## 3. Dos bugs encontrados en el camino

- **Parciales con goles anulados.** Los parciales 1T/2T/ET del modal contaban
  un gol anulado por el árbitro; la tabla de goles y el CSV ya lo excluían.
  Lógica escrita dos veces. *Medido*: 1T queda 1–0 con un gol anulado de la
  visita.
- **Partido duplicado en el historial.** "Guardar en historial" y luego
  "Guardar y nuevo partido" dejaban dos registros. El historial ahora
  reemplaza por el inicio del partido (`matchStart`, campo opcional nuevo en
  `MatchRecord`), conservando el id. Los registros viejos no lo traen y no se
  tocan. Prueba: `tests/historial.test.mjs`.

---

# Ronda 2 (3.54.1) — El andamiaje invisible

Se retira el cableado de firmas, que ya no dibuja nada:

- **PISTA** (`court-operator-view.tsx`) y **CONTROL** (`operator-view.tsx`):
  lienzo de firma de cierre, `signingClosingRole`, el candado
  `planillaLocked` (deshabilitaba REANUDAR y FIN tras sellar) y las props
  `setSignature` / `setClosingSignature`. En CONTROL además
  `extraSignatures` / `signingExtraRole`, que nada abría desde hacía tiempo.
- **Hook**: fuera `setSignature` y `setClosingSignature`.
- **PreMatchSetup**: la prop `setSignature` que quedó de la 3.42 y la copia
  de firmas al configurar el partido.
- **Modal**: las tres props que la ronda 1 dejó como ignoradas.
- `SignatureCanvas.tsx` borrado: no lo usa nadie.
- `downloadMatchReport` borrado: la crónica se abre con *Ver crónica*. (Si el
  navegador bloquea la ventana, `openMatchReport` ya descarga el HTML.)
- El CSS de impresión del modal (`globals.css`): sólo servía a `window.print()`
  de la planilla.
- Textos: el historial vacío y el aviso del CSV de reanudación ya no hablan de
  planilla oficial.

**Compatibilidad.** `SignatureData`, `ClosingSignatureData`, `signatures` y
`closingSignatures` se quedan como **tipos opcionales**. Un estado en curso de
la 3.53 restaurado del almacenamiento puede traerlas: no rompen nada, y al
empezar partido nuevo se descartan en vez de arrastrarse.

**Verificado:** `grep` no encuentra firmas en la interfaz (sólo comentarios
que explican el retiro); el historial abre en el navegador un registro de la
3.53 con firmas colgando, uno nuevo y uno mínimo, sin errores; el modal y los
overlays repiten las mediciones de la ronda 1 con el mismo resultado; `tsc`
comparativo contra la 3.53: ningún error nuevo (con la salvedad de arriba:
aquí no hay dependencias instaladas).

**Sin medir aquí:** PISTA y CONTROL montados enteros en el navegador. El
cambio en ellos es sólo quitar estado y props muertos, pero **pruébalos** tras
`next build`: iniciar, terminar, REANUDAR, abrir Estadísticas.

## Versión

3.54 → `ardi-v354`. 3.54.1 → `ardi-v354-1`.
