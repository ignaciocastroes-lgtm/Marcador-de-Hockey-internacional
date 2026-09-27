# ARDI Hockey Patín 3.56 — El final del partido

`tsc` en cero, `next build` limpio, **212 pruebas, 212 pasan**, instalación
congelada verificada **sin filtrar la salida** (ver el último punto).

---

## 1. El bug que te costó el partido

Hay dos caminos para cambiar de periodo y **sólo uno reiniciaba los tiempos de
banca**. Avanzar de periodo sí; **terminar el descanso no** — y ése es el
camino normal. Existía un parche que los reiniciaba, pero vivía **sólo en
CONTROL**: en PISTA el fallo estaba descubierto.

Por eso llegaste al segundo tiempo con los tiempos ya gastados.

Corregido en el motor: al entrar a **cualquier** periodo, los tiempos vuelven a
cero. Son **dos por equipo en cada uno de los cuatro** — 1T, 2T y los dos
alargues.

## 2. El descanso ya no puede comerse un periodo

**Un partido con tiempo por delante no se descansa: se suspende.** Ahora es un
bloqueo, no un consejo: si queda tiempo, el descanso se niega y te dice que
suspendas.

Y **suspender tiene su propio botón**, rojo y de un solo toque. Antes compartía
puerta con el descanso, y por eso no lo encontraste cuando ardía.

## 3. El alargue, como es de verdad

**Dos periodos**, con su propia duración, y la forma de resolverlo se pacta
antes de empezar:

- **Gol de oro** — el partido termina **en el instante del gol**.
- **Gol de plata** — termina **al cerrar** un periodo si hay diferencia.
- **Ninguna** — se juegan los dos completos.

Si al cerrar el segundo siguen iguales, van a penales.

Oro y plata no son lo mismo para el motor y por eso viven en sitios distintos:
el oro se evalúa **al marcar** (en los tres caminos de gol, incluido el gol de
penal), la plata **al cerrar el periodo**.

El primer alargue conserva su nombre interno anterior a propósito: los partidos
ya guardados lo traen así y **siguen siendo válidos sin migrar nada**.

**16 pruebas nuevas**, incluidas las que separan oro de plata: un gol que
*iguala* no resuelve nada, y sin regla de oro un gol en el alargue no termina
el partido.

## 4. Auditoría: qué le falta a PISTA respecto de CONTROL

Comparadas las acciones del motor que usa cada vista, **a PISTA no le falta
nada**. Sólo dos diferencias, y ninguna es un hueco:

- `playBuzzer` — PISTA toca la chicharra por su cuenta, con el motor de audio.
- `resetTimeouts` — era el parche del punto 1, ahora innecesario.

Al revés sí hay distancia: **PISTA usa 13 acciones que CONTROL no tiene**
(plantel en vivo, portero y capitán, lesionados, cambio de dorsal, alineación,
tanda de penales, corrección de marcador). Es lo esperado: CONTROL está
congelado.

## 5. Un error mío, y la lección

**El zip 3.55.2 que entregué no se podía desplegar.** Dos dependencias
quedaron ancladas a versión exacta mientras el lockfile seguía con rango, y
`--frozen-lockfile` aborta. Restaurado y verificado.

Lo peor no es el error: es **cómo se me pasó**. Corrí la instalación congelada,
pero filtré la salida con `tail -1` y me tragué el mensaje. Desde aquí esa
comprobación va sin filtros.

## Pendiente

El gol desde banca con corrección posterior, y el cambio partiendo de quién
entra. Son mejoras de velocidad de mesa, no de reglamento.

## Versión

3.56, service worker `ardi-v356`.
