// ─────────────────────────────────────────────────────────────────────────────
// ESCUDOS GENÉRICOS ARDI — FUENTE ÚNICA
//
// Este arreglo estaba copiado TRES veces (scoreboard-view, GoalOverlay y
// page.tsx), con el mismo par de siluetas de una sola línea que se veían como
// un marcador de posición y no como un escudo. Cambiar el genérico obligaba a
// acordarse de los tres lugares — el patrón de duplicación de siempre.
//
// Ahora son dos archivos reales en /public/escudos/: mismo origen (los cachea
// el service worker, funcionan sin internet) y con peso visual suficiente para
// aguantar los 450 px del lanzador de gol, no sólo el ícono del panel.
// ─────────────────────────────────────────────────────────────────────────────

/** Escudo ARDI para el equipo local: azul acero con canto plateado. */
export const ARDI_SHIELD_HOME = '/escudos/ardi-local.svg'

/** Escudo ARDI para la visita: grafito con canto dorado. */
export const ARDI_SHIELD_AWAY = '/escudos/ardi-visita.svg'

/** `[local, visita]` — el orden que ya esperaba todo el código existente. */
export const GENERIC_SHIELDS = [ARDI_SHIELD_HOME, ARDI_SHIELD_AWAY]

/** El genérico que le toca a un equipo cuando no tiene escudo propio. */
export const genericShieldFor = (team: 'home' | 'away'): string =>
  team === 'home' ? ARDI_SHIELD_HOME : ARDI_SHIELD_AWAY
