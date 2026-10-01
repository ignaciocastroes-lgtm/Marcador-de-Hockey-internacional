# GUIÓN — Reescritura de ardisport.cl/hockey

Documento para pegar en el hilo de desarrollo web. Define qué se elimina, qué se
suma, y cómo queda el precio.

**Regla que gobierna todo el trabajo:** cada afirmación de la página debe existir en
el código. Si no se puede señalar dónde está implementada, no se escribe. La
auditoría técnica ya está hecha y está más abajo: reemplaza lo que no hacemos por
lo que sí hacemos.

---

## 1. ELIMINAR — afirmaciones falsas o desactualizadas

### 1.1 CRÍTICO — La cancelación de la tarjeta azul por gol
Aparece **dos veces**: en el punto interactivo 1 de la mesa de control y en la
sección "Lo que ARDI hace automáticamente".

> Texto actual: "Si el equipo contrario anota, la exclusión se cancela
> automáticamente."

**Está mal por dos razones independientes.** El motor no lo hace: las sanciones no
se cancelan por gol. Y el reglamento World Skate vigente lo derogó — el cambio
disciplinario más importante de esta versión es justamente que **la sanción se
cumple íntegra y el gol ya no libera al equipo de la inferioridad**.

**Reemplazar por:**
> "La sanción se cumple completa. Un gol recibido ya no libera al equipo: el
> reloj de exclusión corre hasta cero, como exige el reglamento World Skate
> vigente. Si hay dos sancionados, el segundo espera su turno y el equipo no baja
> de cuatro patinadores."

Esto convierte el error en la característica más difícil de copiar de la página.

### 1.2 "Reloj 2×25 min regresivo · Nunca se pausa"
Falso, y la propia página se contradice en la sección de preguntas frecuentes. El
reloj se detiene con cada tarjeta con tiempo, con el tiro libre directo y con los
tiempos de banca — que es lo correcto en hockey patín.

**Reemplazar por:** "Reloj 2×25 regresivo que se detiene solo cuando el reglamento
lo exige: tarjeta con tiempo, tiro libre directo y tiempo de banca."

### 1.3 "0ms Latencia buzzer"
Imposible como cifra. **Reemplazar por:** "Chicharra nativa, sin latencia
perceptible."

### 1.4 "Cero decisiones manuales del árbitro de mesa"
Contradice el manual de reglamento del producto, donde se declara que la
herramienta no arbitra. El motor **propone** la tarjeta según lo acumulado; el
árbitro decide.

**Reemplazar por:** "El sistema lleva la cuenta y propone la tarjeta que
corresponde según lo acumulado. La decisión es siempre del árbitro."

### 1.5 "Motor oficial activo"
"Oficial" sugiere aval de World Skate y la auditoría está pendiente.
**Reemplazar por:** "Reglamento World Skate 2026 implementado."

### 1.6 Plan Remoto completo
Eliminar el plan de $79 entero: Supabase, WebSocket Node, historial en la nube,
árbitro desde el celular, multi-cancha. No existe en el código y el modelo de
producto cambió: **el montaje es un PC con varias salidas HDMI**, no
sincronización inalámbrica.

**Aplicar el mismo criterio en los otros nueve deportes.**

### 1.7 "3 pantallas sincronizadas"
No es un error de número, es de concepto: el sistema **escala**.
**Reemplazar por:** "De 1 a 5 pantallas desde un solo PC — usa las que tengas."
Decir "5 pantallas" hace que quien tiene un proyector crea que no es para él.

### 1.8 Testimonios
Los tres actuales deben salir o marcarse como ejemplo ilustrativo, salvo que sean
reales y se pueda nombrar el club. Uno de ellos además testifica sobre la
cancelación por gol, o sea sobre una función que no existe.

Si hay validación real en clubes, el testimonio correcto es el de la validación —
no el de una compra.

---

## 2. SUMAR — logros nuevos, todos verificables en el código

### 2.1 Abre sin internet *(destacar — nadie más lo dice)*
Service worker. Tras la primera visita con conexión, la aplicación **abre** sin
red: recargas y ventanas nuevas de tablero funcionan con el wifi caído. Es distinto
de "funciona sin internet", que es lo que ya decíamos. Si Chrome se cierra a mitad
del segundo tiempo, se reabre sin depender de la señal del pabellón.

### 2.2 Las pantallas no se apagan solas *(logro nuevo, pedido explícito)*
Bloqueo de suspensión de pantalla. Windows deja de apagar los televisores a mitad
del segundo tiempo. Se vuelve a activar solo al minimizar y volver.

### 2.3 Mesa de dos operadores con teclado Bluetooth *(argumento central)*
Este es el diferenciador más fuerte y hoy no está en la página.

Un teclado o mando Bluetooth se empareja como teclado normal y controla el sistema
sin tocar el computador. Eso permite repartir la mesa como se reparte de verdad:
**un operador en la pantalla táctil cargando incidencias, otro llevando los dos
relojes de 45 y el tiempo desde el teclado.**

14 acciones configurables, con perfil listo para mando de presentación. Sin red,
sin latencia, sin costo mensual.

### 2.4 Lanzar todas las pantallas de un clic
Lee los monitores conectados y reparte los tableros por las salidas HDMI,
reservando el principal para la mesa de control.

### 2.5 Historial de temporada
Tabla de posiciones y goleadores acumulados a partir de los partidos guardados.
PJ, PG, PE, PP, GF, GC, diferencia, puntos y tarjetas por equipo. Exportable.
Es lo que le sirve a la liga, no sólo al operador.

### 2.6 Resúmenes proyectados
Resumen del primer tiempo durante el descanso y ficha completa al terminar el
partido. Goles con minuto y camiseta, goleadores, tarjetas, faltas y posesión.

### 2.7 Tiempo de posesión por equipo
Ningún marcador de hockey patín lo lleva. Los 45 segundos se cronometran en todas
las canchas del mundo y nadie los suma. Porcentaje y minutos, en el resumen.

### 2.8 Manual de reglamento y uso
Documento que explica cómo aplica la norma el árbitro, qué hace el sistema con
cada regla, y los términos de uso. Enlazar desde la página: a un dirigente le pesa
más que cualquier viñeta.

---

## 3. PRECIO

**$119 USD por 60 días, con contador regresivo. Después, $149 USD.**

Reglas obligatorias:

- El contador debe tener **fecha real de término** y el precio **debe subir de
  verdad** al vencer. Un contador que se reinicia solo destruye la credibilidad de
  todo lo demás en la página.
- **Sin precio tachado de "valor original".** Un valor original es un precio que se
  cobró efectivamente. Nunca se cobraron $779, así que no puede presentarse como
  precio anterior: es una afirmación falsa sobre un precio y en Chile eso cae bajo
  la ley del consumidor. Además un descuento del 85% comunica lo contrario de lo
  que se busca — los productos serios no valen un séptimo de un día para otro.
- **Sí se puede anclar por comparación**, porque el número grande no es propio:
  los sistemas de marcador integrados para pabellón cuestan miles de dólares y no
  conocen el reglamento.
- Un solo plan. Sin Estándar y Remoto.

**Texto sugerido:**
> $119 USD · pago único · sin mensualidad
> Precio de lanzamiento hasta el [FECHA]. Después, $149 USD.
> Un sistema de marcador integrado para pabellón cuesta miles de dólares y no sabe
> qué es una tarjeta azul.

---

## 4. ESTRUCTURA DE LA PÁGINA

1. **Titular** con la regla más difícil del deporte — en hockey, la tarjeta azul y
   la inferioridad que se cumple completa.
2. **El dolor**: quién cronometra los 2 minutos. Se mantiene, funciona bien.
3. **Cómo se opera**: la mesa de dos operadores con teclado Bluetooth. Bloque nuevo
   y destacado.
4. **Lo que hace hoy**: cada línea implementada y verificable.
5. **El montaje**: un PC, de 1 a 5 pantallas por HDMI, abre sin internet, las
   pantallas no se apagan.
6. **Reglamento**: enlace al manual, con la mención de que la auditoría con World
   Skate está en curso.
7. **Precio** con contador.
8. **Hoja de ruta** aparte, con fechas y con la condición de si cada mejora es
   gratuita o módulo pagado.
9. **Preguntas frecuentes** corregidas — hoy la del reloj se contradice con la
   franja superior.

---

## 5. NO MENCIONAR

- Cualquier forma de sincronización inalámbrica, Supabase, WebSocket o nube.
- El modo de pista dinámica y el detalle interno de las vistas de operador: está
  construido pero **no validado en partido real**. La página describe lo probado.
- Números de latencia medidos.
- La palabra "oficial" aplicada al motor, mientras la auditoría esté pendiente.

---

## 6. TONO

El comprador es dirigente de club, profesor de educación física o anotador de mesa.
No es técnico. Cada característica se explica por el problema que resuelve, no por
cómo está construida. "Nadie tiene que cronometrar con el celular" comunica más que
"reloj de cumplimiento con corrección de deriva".

Y una nota de honestidad que conviene mantener visible: el sistema no arbitra, no
interpreta jugadas y no reemplaza al árbitro. Decirlo suma credibilidad, no la
resta — es lo que separa una herramienta seria de una app que promete magia.

---

## 7. PARA LOS OTROS NUEVE DEPORTES

Misma plantilla, y **la misma tarea previa**: por cada viñeta que se vaya a
escribir, verificar en el código del módulo que existe.

En hockey encontramos que la característica estrella de la página no estaba en el
código y además había sido derogada por el reglamento. Con nueve deportes más, esa
revisión es lo único que evita repetir el error nueve veces.

Elementos comunes a todos: eliminar el plan Remoto, "de 1 a 5 pantallas", "abre sin
internet", "las pantallas no se apagan", mesa con teclado Bluetooth, un solo plan y
el mismo contador de 60 días.
