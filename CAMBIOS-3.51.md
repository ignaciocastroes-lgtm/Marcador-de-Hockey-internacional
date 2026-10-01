# ARDI Hockey Patín 3.51 — Bloque A

`tsc --noEmit` y `next build` limpios. **146 pruebas, 146 pasan.**

> **Regla de producto, escrita para que nadie la "arregle":**
> **las tarjetas viven en ESTA citación.** Sub-15 a las 10 y Sub-17 a las 12 son
> dos historiales vacíos al pitazo. La misma persona puede irse expulsada en una
> y jugar la otra. No hay temporada, no hay jornada, no hay arrastre entre
> series. `cardHistory` nace vacío en cada partido y así debe quedarse.
> **Si aparece código o prueba que sume entre partidos, es un bug.**

---

## 1. Lo anulado dejó de pintarse

El motor ya no escalaba con una tarjeta anulada, pero **seis lecturas visuales
seguían contándola**. El operador anulaba y la seguía viendo.

| Dónde | Qué mostraba de más |
|---|---|
| `CardTally` (PISTA) | el palito en la ficha del jugador |
| `operator-view` | amarillas por dorsal |
| `operator-view` | "ya expulsado" |
| `PosModal` | amarilla de banca: la banca creía que ya se había pintado |
| `PosModal` | roja: el expulsado seguía deshabilitado en la grilla |
| `OfficialSheetModal` | la grilla del acta reservaba casillero |

**Sobre PosModal:** son **dos** lecturas, con consecuencias distintas, a sesenta
líneas de distancia. En una revisión anterior vi sólo la primera y di por
equivocado el diagnóstico. Estaban las dos.

**Dos que no estaban en el plan:** el acta también **contaba los goles
anulados**, en el listado y en el desglose por periodo — así que el desglose no
cuadraba con el marcador. Son dos apariciones, el CSV y la vista.

La traza no se pierde: el registro cronológico sigue imprimiendo
*"Tarjeta X de #N ANULADA por la mesa"*. Lo que deja de pasar es que se pinte
como vigente.

## 2. El penal repone al COBRO (Art. 30.9)

La reposición existía sólo para el tiro libre directo (faltas 10/15/20).

El artículo da cinco segundos **para ejecutar**, así que se cuentan **antes del
tiro**. Engancharla al gol no serviría: un penal errado a `0:03` no repondría
nunca, y uno convertido repondría *después* de tirar.

`awardPenalty` es el **cobro**: para el reloj, repone los 45 y, si quedan menos
de cinco segundos, los lleva a `0:05`. La conversión sigue su camino normal,
como gol. En la tanda el botón suma al contador y no toca el reloj de juego.

Nunca descuenta. Queda en el acta.

## 3. La serie entra en la clave del JSON

Era `fecha + local + visita`. Dos series de los mismos clubes el mismo sábado
daban la **misma clave**, y la web hace upsert por `id`: la segunda noticia
pisaba a la primera.

```
2026-09-12-sub-15-fem-internacional-lo-espejo-vs-cp-bata
2026-09-12-sub-17-fem-internacional-lo-espejo-vs-cp-bata
```

Sin serie desempata la hora. **Los partidos ya publicados no se renombran**: el
cambio vale para los nuevos. No sube `MATCH_JSON_VERSION` — cambia el valor, no
el esquema.

Esto **no une tarjetas**: sólo evita que la noticia se pise.

## 4. Fuera Analytics de Vercel

Retirado del layout y de `package.json`. En un pabellón no aporta, y sumaba un
script de terceros al primer pintado.

## 5. Reglamento alineado

`REGLAMENTO-Y-USO` §2.9 decía **"ESTA FUNCIÓN NO EXISTE HOY"**. Mentía a medias:
el TLD ya reponía desde la 3.5. Ahora distingue TLD (al cobrarse la falta) de
penal (al cobrarse el penal), y aclara que nunca descuenta y que no aplica en la
tanda. **No se borró el artículo**, se corrigió lo que decía.

## Versión

`VERSION.md`, `package.json` y el título a **3.51**; service worker a
`ardi-v351`.

---

## Pendiente: bloque B (escalada por persona, dentro de este partido)

No incluido a propósito: es el único que puede romper un sábado a medias.

Lo verificado hasta ahora:

- `staffId` **ya se persiste** en todas las tarjetas. En pista llega `undefined`
  porque los dos llamadores mandan sólo el dorsal. **El arreglo no es tocar la
  escritura, es que `addSanction` reciba la persona.**
- `calculateCourtCardResult` filtra **sólo** `playerNumber`, mientras
  `getYellowCount` ya mira `número || display || staffId`. La ficha y el motor
  no dicen lo mismo.
- `getBlueCount` no mira `staffId`.
