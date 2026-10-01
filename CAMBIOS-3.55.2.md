# ARDI Hockey Patín 3.55.2 — Agregar equipos

`tsc` en cero, `next build` limpio, **196 pruebas, 196 pasan**, instalación
congelada verificada desde cero.

---

## Por qué no podías agregar equipos

Lo reproduje, y **caí en la misma trampa a la primera**.

El modal de clubes tenía **dos campos de texto casi idénticos**: `Buscar club`
a la izquierda y `Ej: DEPORTES TEMUCO` a la derecha. El buscador quedaba
primero y a mano, así que ahí se escribe el nombre del club nuevo. El texto se
va al filtro, el campo real queda vacío, y GUARDAR se niega. Parece que la app
no deja agregar equipos.

**El buscador se eliminó.** Esa columna ahora sólo muestra clubes, y el modal
tiene **un solo campo de texto**: el del nombre. Verificado en el navegador.

## Los 16 clubes de la Liga Central

Debajo de tus clubes hay una rejilla con **los 16 clubes de la liga, con su
escudo**. Un toque da de alta el club **con su insignia y sus series vacías**,
y queda abierto para cargarle las camisetas. Los que ya tienes dados de alta no
se ofrecen dos veces: al agregar BATA, el catálogo pasó de 16 a 15.

No inventa planteles. Crea el club y su escudo; las camisetas se cargan por
serie, como siempre.

## Los escudos, también en el gestor

Los 16 vienen **de fábrica en la galería de escudos**, así que están a mano en
GESTOR PANTALLAS desde el primer día sin pegar ninguna URL. Se ordenan al final
para que cualquier escudo que uses de verdad quede por delante.

## Sobre la conexión

Los escudos están alojados en ImgBB, y eso **ya estaba resuelto**: el service
worker aplica "caché primero" a las imágenes de otro dominio, así que la
primera vez se descargan y a partir de ahí el marcador las muestra **sin red**.
Es exactamente lo que pediste; no hubo que tocar nada.

La única condición es que el equipo vea los escudos una vez con internet antes
del primer partido sin conexión.

## Versión

3.55.2, service worker `ardi-v3552`.
