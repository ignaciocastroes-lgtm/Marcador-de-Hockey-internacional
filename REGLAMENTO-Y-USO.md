# ARDI Hockey Patín — Manual de reglamento, uso y términos

**Versión del documento:** 1.0
**Módulo:** ARDI Hockey Patín 3.5 "Pista Viva"
**Reglamento de referencia:** World Skate — Rules of the Game / Rulebook,
Technical Regulations, Rules of Refereeing, con las *Clarifications to the Rulebook
of Rink Hockey* de enero de 2026.

**Estado de este documento: PENDIENTE DE AUDITORÍA.** Ha sido redactado
contrastando el comportamiento del sistema con la documentación pública de World
Skate. No ha sido revisado ni aprobado por World Skate ni por ninguna federación
nacional. Hasta que esa revisión ocurra, el criterio del árbitro prevalece siempre
sobre el sistema.

---

## 1. QUÉ ES ESTA HERRAMIENTA — Y QUÉ NO ES

ARDI Hockey Patín es una **herramienta de apoyo para la mesa de control y el
árbitro auxiliar**. Su función es cronometrar, proyectar y registrar.

**Lo que hace:**
- Cronometra el tiempo de juego, los tiempos de inferioridad, la posesión de
  45 segundos, los tiempos de banca y el entretiempo.
- Proyecta la información al público en pantallas independientes.
- Registra cada incidencia con su minuto y periodo, y produce el acta.

**Lo que NO hace, y no debe entenderse que hace:**
- **No arbitra.** No detecta faltas, no interpreta jugadas, no decide sanciones.
- **No reemplaza el criterio del árbitro.** Toda tarjeta, falta y gol que el sistema
  registra fue decidida por un árbitro y cargada por un operador humano.
- **No valida la legalidad de una acción.** Si el operador carga algo distinto de lo
  que el árbitro señaló, el sistema registrará el error sin advertirlo.
- **No sustituye el acta oficial** donde la federación correspondiente exija un
  formato o soporte propio.

Las automatizaciones del sistema —la escalada de tarjetas por acumulación, el
cómputo de la inferioridad, el aviso de tiro libre directo por acumulación de
faltas— son **cálculos sobre lo que el operador cargó**, no decisiones arbitrales.
Si el árbitro determina algo distinto, el árbitro tiene razón y el operador debe
corregir el sistema.

---

## 2. CÓMO SE APLICAN LAS TARJETAS EN CANCHA

Esta sección describe **cómo trabaja el árbitro**, no cómo funciona el software.
Es la referencia para que un árbitro auxiliar entienda qué está registrando.

### 2.1 Dos dominios distintos: pista y banca

La distinción fundamental del reglamento no es el tipo de tarjeta sino **dónde
estaba la persona sancionada**.

**En la pista** existen tres tarjetas: amarilla, azul y roja.

**En la banca sólo existen dos: amarilla y roja.** Las clarificaciones de enero de 2026 son explícitas en que no hay tarjeta azul para quienes están en el banquillo, y lo señalan
dos veces, al aclarar el artículo 18 y el artículo 24. Un jugador sentado en la
banca no puede recibir una azul; si su infracción lo amerita, corresponde amarilla
o roja de banca.

Además, según la aclaración del artículo 24, la roja de banca no se limita al
cuerpo técnico: alcanza a **cualquier integrante del banquillo**, sea representante
técnico o jugador.

### 2.2 La inferioridad numérica sólo la produce la pista

Este es el punto que más se confunde y el que más consecuencias tiene en el
marcador.

Una azul o una roja mostrada a un jugador **que está en la pista** deja al equipo
en inferioridad durante el tiempo de la sanción. La aclaración del artículo 31 lo
circunscribe expresamente a los jugadores en pista.

Las tarjetas de banca **no producen inferioridad**. La aclaración del artículo 25
lo establece sin ambigüedad: las rojas mostradas a jugadores o representantes que
están en el banquillo no implican periodo de inferioridad. El equipo pierde a esa
persona, no a un patinador.

> **En el marcador:** las sanciones de banca se registran con tiempo cero. Aparecen
> en el historial y en el acta, pero no ocupan la mesa de control ni descuentan
> tiempo, porque no hay tiempo que descontar.

### 2.3 La amarilla de banca alcanza a todo el banquillo

Este es el mecanismo que en Chile se conoce como "pintar la banca", y la aclaración
general número 10 lo describe con precisión: una amonestación al banquillo es
**individual, pero al mismo tiempo vale como advertencia para todos los integrantes
del banquillo**.

La consecuencia práctica es que después de la primera amarilla de banca, todo el
banquillo queda advertido. Y ante una segunda amonestación a cualquiera de ellos,
corresponde la expulsión.

Hay además un detalle de **procedimiento** que el árbitro debe seguir y que el
sistema no puede reflejar por sí solo: en esa segunda amonestación, el árbitro
muestra **primero la amarilla y sólo después la roja**. La expulsión no se muestra
directa; se muestra como consecuencia visible de la acumulación.

> **En el marcador:** al cargar una sanción de banca, el operador designa al
> infractor directo y marca a quiénes alcanza la advertencia colectiva. Por defecto
> vienen preseleccionados los integrantes fijos del banquillo. Una vez que el equipo
> registra una amarilla de banca, el sistema deja de ofrecer nuevas colectivas,
> porque el banquillo ya está advertido.
>
> **PUNTO A AUDITAR:** el reglamento indica que la advertencia alcanza a *todos* los
> integrantes del banquillo. El sistema permite al operador desmarcar a alguno. Debe
> confirmarse con World Skate si el reparto debe ser total y automático, o si admite
> criterio del árbitro sobre quiénes estaban presentes.

### 2.4 Acumulación y escalada

El árbitro no lleva la cuenta en un papel: la mesa la lleva por él. Esa es
justamente la función del árbitro auxiliar que esta herramienta apoya.

En la pista, la acumulación de amonestaciones deriva en sanción con tiempo, y la
acumulación de sanciones con tiempo deriva en expulsión. En la banca, una segunda
amonestación a la misma persona implica expulsión.

> **En el marcador:** el sistema mantiene la cuenta por persona y propone la tarjeta
> que corresponde según lo acumulado. **La propone; no la impone.** El árbitro
> decide, y el operador puede anular una sanción cargada por error tocándola en la
> mesa de control.
>
> **PUNTO A AUDITAR:** los umbrales exactos de escalada configurados en el sistema
> deben contrastarse artículo por artículo con el Rulebook vigente. Están descritos
> en la sección 6 de este documento.

### 2.5 La sanción se cumple completa

El cambio disciplinario más relevante del reglamento vigente: **un gol recibido no
libera al equipo de la inferioridad**. El tiempo de la sanción se cumple íntegro.

> **En el marcador:** el sistema no cancela sanciones por gol. El cronómetro de la
> sanción sólo corre mientras corre el reloj de juego, y el saldo pendiente cruza
> al periodo siguiente.

### 2.6 Faltas de equipo y tiro libre directo

Las faltas de equipo se acumulan y, al alcanzar el límite, cada falta posterior se
sanciona con tiro libre directo.

> **En el marcador:** el sistema avisa cuando el equipo está a una falta del límite
> y detiene automáticamente el reloj y las posesiones cuando corresponde el tiro
> libre directo.
>
> **PUNTO A AUDITAR:** debe confirmarse si el contador de faltas se reinicia entre
> periodos. **El sistema actualmente NO lo reinicia**: las faltas se acumulan del
> primer al segundo tiempo. Si el reglamento exige reinicio, hoy el operador debe
> hacerlo a mano.

### 2.7 Lanzamiento intencional del bocho fuera de la pista

La aclaración general número 11 establece que lanzar intencionalmente el bocho
fuera de la pista para demorar la reanudación se sanciona con **falta de equipo y
tarjeta amarilla**, las dos cosas.

> **En el marcador:** hoy son dos acciones separadas. El operador debe cargar la
> falta y la amarilla por separado. **Mejora identificada:** una acción combinada
> evitaría que se registre sólo una de las dos.

### 2.8 Sustitución irregular

La aclaración del artículo 8 establece que una sustitución irregular constituye
falta grave y corresponde tarjeta azul, con la inferioridad consiguiente. Al no
haber doble sanción, el juego no se reanuda con tiro libre directo.

> **En el marcador:** el sistema registra los cambios de jugador con su minuto, lo
> que permite reconstruir una sustitución irregular en el acta. La azul se carga
> como cualquier otra sanción de pista.

### 2.9 Reposición de cinco segundos

La aclaración del artículo 30, punto 9, recuerda que ante un tiro libre directo o
un penal debe reponerse el cronómetro a cinco segundos, que es el tiempo previsto
para ejecutar el lanzamiento. Se admite la simulación, pero no hay tiempo para un
segundo remate.

> **En el marcador: ESTA FUNCIÓN NO EXISTE HOY.** El operador debe ajustar el reloj
> manualmente con los botones de ajuste fino. **Mejora identificada y prioritaria**,
> porque es una regla que afecta directamente al cronómetro, que es el corazón de
> esta herramienta.

---

## 3. CÓMO SE USA

### 3.1 Antes del partido
1. Configurar el partido: campeonato, serie, rama, duración de los periodos y si
   habrá alargue o penales.
2. Cargar los planteles. En modo Express basta con los números de camiseta; el
   primero de cada lista se toma como portero y puede reasignarse en partido.
3. Recoger las firmas de apertura en pantalla.
4. Abrir las pantallas de proyección y repartirlas por los monitores.

### 3.2 Durante el partido
- **Reloj:** dos botones de arranque, con chicharra y sin chicharra. Ajuste fino
  disponible en el cajón de ajustes.
- **Posesión:** un cronómetro de 45 segundos por equipo, mutuamente excluyentes.
  Arrancar una posesión arranca el reloj de juego; pausar el reloj de juego repone
  las dos posesiones.
- **Sanciones:** en el modo Pista se toca la ficha del jugador y se elige la
  tarjeta. La posición de esa persona —pista o banca— determina qué tarjetas ofrece
  el sistema.
- **Corrección de errores:** tocar la ficha del sancionado en la mesa de control
  permite anular la sanción. La tarjeta permanece en el historial.

### 3.3 Al terminar
1. Cerrar el partido y recoger las firmas de cierre.
2. Revisar la planilla y sellarla. Al sellar se exporta el acta.
3. Guardar el partido en el historial.

### 3.4 Responsabilidad del operador
El operador es responsable de que lo registrado coincida con lo señalado por el
árbitro. Ante cualquier discrepancia entre la pantalla y el criterio arbitral,
**prevalece el árbitro** y el operador debe corregir el registro.

---

## 4. TÉRMINOS DE USO

**Naturaleza del producto.** ARDI es software de apoyo. No constituye un sistema
oficial de arbitraje ni está homologado por World Skate ni por federación alguna,
salvo que dicha homologación se documente expresamente por escrito.

**Ausencia de garantía sobre decisiones deportivas.** El proveedor no responde por
resultados deportivos, sanciones, protestas ni decisiones de competición derivadas
del uso del sistema. La responsabilidad de lo registrado recae en el operador y en
el cuerpo arbitral del encuentro.

**Vigencia reglamentaria.** El motor de reglas refleja el reglamento vigente a la
fecha de esta versión. Los reglamentos cambian. Es responsabilidad del club o la
federación verificar que la versión instalada corresponde al reglamento aplicable a
su competición.

**Datos.** El sistema opera en el navegador del operador y guarda la información en
el equipo local. No transmite datos de partidos a terceros. Los planteles pueden
contener datos personales —nombre y documento de identidad— cuyo tratamiento y
resguardo son responsabilidad de quien opera el sistema, conforme a la legislación
de datos personales aplicable.

**Uso permitido.** Licencia de uso institucional para el club, liga o
establecimiento adquirente. No se autoriza la reventa ni la prestación del sistema
como servicio a terceros sin licencia comercial específica.

**Actas.** El acta que produce el sistema es un documento de apoyo. Su validez ante
una federación depende de que ésta lo acepte como formato válido.

---

## 5. PENDIENTES DE VALIDACIÓN CON WORLD SKATE

Lista para la auditoría, en orden de prioridad:

1. **Reposición de cinco segundos** ante tiro libre directo o penal — no
   implementada. Confirmar umbral y comportamiento exacto.
2. **Umbrales de escalada** de tarjetas en pista y en banca — contrastar con el
   articulado del Rulebook.
3. **Alcance de la advertencia colectiva** de banca — ¿total y automática, o admite
   criterio sobre presentes?
4. **Reinicio de faltas de equipo entre periodos** — hoy no se reinician.
5. **Falta de equipo + amarilla** por lanzamiento intencional del bocho — hoy son
   dos acciones separadas.
6. **Procedimiento de amarilla antes de roja** en la segunda amonestación de banca —
   el sistema calcula la roja directa; el árbitro debe mostrar ambas.
7. **Mínimo de patinadores en pista** y su interacción con sanciones simultáneas.
8. **Arrastre de sanciones entre periodos** y su cómputo.

---

## 6. ANEXO — COMPORTAMIENTO EXACTO DEL SISTEMA

Este anexo describe qué hace el software, para que el auditor lo compare contra el
articulado. Se documenta tal como está implementado, sin interpretación.

**Duraciones.** Azul: 120 segundos. Roja: 240 segundos. Amarilla: sin tiempo.

**Escalada en pista** (se evalúa al aplicar, en este orden):
- Jugador con roja previa: bloqueado, no admite nuevas sanciones.
- Roja enviada → roja.
- Azul enviada → roja si ya tiene dos azules; en caso contrario, azul.
- Amarilla enviada → roja si ya tiene dos azules; azul si tiene una amarilla
  directa de banca; azul si tiene una amarilla o una azul previa de pista; en caso
  contrario, amarilla sin tiempo.
- Se registra la tarjeta **final**, no la enviada, por lo que las escaladas se
  acumulan sobre sí mismas.

**Escalada en banca:**
- Sólo amarilla y roja.
- Amarilla directa a quien ya registre una amarilla previa → roja.
- Toda sanción de banca se registra con tiempo cero.
- La advertencia colectiva se reparte una sola vez por equipo y por partido:
  registrada la primera amarilla de banca, el sistema no ofrece nuevas colectivas.

**Cruce entre dominios:**
- Sólo la amarilla **directa** de banca escala una amarilla de pista a azul. La
  colectiva no escala en pista.
- En la banca, la acumulación cuenta todas las amarillas de la persona, incluidas
  las de pista y las colectivas.

**Inferioridad:** el máximo en pista es cinco menos las sanciones activas, con piso
de cuatro. Con dos sanciones simultáneas el equipo no baja de cuatro patinadores;
la segunda sanción espera su turno y prolonga el tiempo de inferioridad.

**Faltas:** aviso a la novena falta, tiro libre directo a la décima, y de ahí en
adelante cada cinco. El tiro libre directo detiene el reloj de juego y repone las
posesiones.

**Sanciones entre periodos:** el saldo pendiente cruza al periodo siguiente. Un gol
no cancela ninguna sanción.

---

*Fuente reglamentaria consultada: World Skate, "Clarifications to the Rulebook of
Rink Hockey", enero de 2026, disponible en la sección de regulaciones de Rink Hockey
del sitio de World Skate. Este documento no reproduce el reglamento; lo parafrasea
para explicar el comportamiento del sistema. El texto oficial prevalece.*
