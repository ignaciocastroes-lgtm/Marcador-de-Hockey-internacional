# ARDI Hockey Patín 3.55.1

`tsc --noEmit` en cero, `next build` limpio, **196 pruebas, 196 pasan**, y
`pnpm install --frozen-lockfile` verificado desde cero.

---

## 1. El "¡GOL!" temblaba

La animación `goalFlash` duraba **0,6 s** y movía la **escala** entre 1 y 1,05
sin parar. Sobre un texto de 300 px ese 5% son unos **15 píxeles de
desplazamiento cada 0,3 segundos**: se lee como un temblor, no como un latido.

Ahora la geometría queda **quieta** —el texto no se mueve ni un píxel— y lo que
respira es el brillo, a 1,6 s por ciclo.

**Medido en la proyección:** doce muestras seguidas dan **un solo tamaño y una
sola posición**. Antes cambiaban en cada muestra.

## 2. Los dos montajes quedaron de fábrica

Una instalación nueva arranca con tu montaje, sin importar nada:

- **Lanzadores**: gol, fin, figura y estadísticas **encendidos**, con las
  posiciones de tus capas.
- **Tablero**: tipografía `dseg7`, acento `#ffc800`, dígitos en flúor, escudo
  sin recorte, y las 20 posiciones de P1.
- **P1 como única pantalla visible** (ya era así).

Una configuración ya guardada **manda sobre esto** y no se toca: los valores de
fábrica sólo aplican cuando no hay nada guardado.

### Dos decisiones que conviene que sepas

**El escudo local reemplaza a la dirección externa.** Tu montaje traía el
escudo desde `i.ibb.co`. Como valor de fábrica eso obliga a tener internet para
ver el escudo, así que apunta a `/escudos/internacional-lo-espejo.webp`, que ya
está en el proyecto. Si importas el montaje, manda el montaje.

**Esto revierte lo de la 3.55.** En esa versión se dejaron los cuatro
lanzadores apagados por defecto. Tu montaje los trae encendidos, así que ahora
una instalación nueva celebra los goles desde el primer partido.

## Auditoría de la versión recibida

Revisado desde cero antes de tocar nada: instala con `--frozen-lockfile`,
`tsc` da **cero errores** (la frase "sin errores nuevos" del informe anterior
sonaba a que había viejos; no los hay), el build compila y pasan **196**
pruebas, no las 181 que decía el informe. Hay más, no menos.
