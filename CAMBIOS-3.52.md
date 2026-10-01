# ARDI Hockey Patín 3.52

`tsc --noEmit` y `next build` limpios. **158 pruebas, 158 pasan.**
`pnpm install --frozen-lockfile` verificado — ver el primer punto.

---

## ⚠️ 1. LA 3.51 NO SE PODÍA DESPLEGAR

En la 3.51 quité `@vercel/analytics` del `package.json` **sin actualizar el
lockfile**. Vercel instala con `--frozen-lockfile`, y con esa inconsistencia
aborta:

```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile"
because pnpm-lock.yaml is not up to date with package.json
```

Es el mismo error que ya les costó un despliegue antes. **Si subiste la 3.51,
el deploy falló.** Esta versión trae el lockfile regenerado, y la instalación
con `--frozen-lockfile` está verificada.

Lo encontré al reinstalar el entorno para esta ronda; mis compilaciones
anteriores pasaban porque `node_modules` ya estaba instalado de antes y nunca
volví a instalar en limpio.

## 2. FIGURA DEL PARTIDO — automática

Aparece **seis segundos después del ganador** y se queda ocho, antes de la
ficha. La mesa no elige. Una sola por partido, de cualquiera de los dos equipos.

**Verificado en la proyección real:** ganador a los 2 y 5 s, figura a los 8 y
12 s, ficha a los 16 s.

### La fórmula (`lib/figura.ts`)

| | Puntos |
|---|---|
| Gol | +10 |
| Minuto en pista | +0,2 |
| Amarilla | −3 |
| Azul | −6 |
| Roja | descartada |

Los minutos pesan poco a propósito: dependen de que se toque cada cambio, así
que un toque que faltó no le cambia la figura a nadie.

**Desempate:** más goles → menos tarjetas → más minutos → la portera.

**Regla de la portera:** empate con el rival teniendo más la pelota, o ganar con
menos posesión → la figura es la portera del que aguantó. Salvo que alguien
haga tres goles o más: eso sigue siendo el hecho del partido.

**Sólo dorsal, nunca el nombre.**

### Los minutos, sin pedirle nada al operador

No hacía falta fotografiar la formación inicial. Se parte de quién está en
pista **al final** —eso sí está guardado— y se recorre el registro **hacia
atrás**, deshaciendo cada cambio. Así se sabe quién estuvo adentro en cada
tramo, incluida la titular que jugó todo sin salir.

**Un bug mío que atrapó la prueba:** en la primera versión, un periodo sin
eventos no contaba sus minutos, y una titular sin cambios quedaba en cero.
Ahora cuentan todos los periodos jugados, tengan o no eventos.

### Pruebas: 12

Incluidos tus casos: cinco goles en un equipo que perdió 5‑7 → figura igual;
roja → descartada; roja anulada → vuelve a ser elegible; gol anulado → no
suma; la regla de la portera en empate y en victoria; hat‑trick sobre la
portera; la titular de dos tiempos con 50 minutos.

La prueba corre contra **el código real** de `lib/figura.ts`, no contra una
copia: si alguien cambia la fórmula, la prueba lo ve.

## 3. MARCA en cada lanzador

Gol, Fin, Estadísticas y Figura tienen cada uno su **Marca (logo)**: un campo
con el enlace, y la capa aparece en el lienzo, se mueve con MOVER y se apaga
con su ojito en CAPAS. Pensado para un PNG o WebP con fondo transparente.

Cada lanzador tiene la suya — un auspiciador en los goles y otro distinto en
el final. Si la URL falla, la imagen se oculta sola en vez de dejar un icono
roto en la pantalla del estadio.

**Verificado en el navegador:** la marca aparece en los cuatro lienzos.

## Versión

3.52, service worker `ardi-v352`.
