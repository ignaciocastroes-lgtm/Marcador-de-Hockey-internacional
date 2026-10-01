# ARDI — Mejoras Aplicadas (v2.0)

## Archivos Reemplazados

Copia cada archivo a la ruta correspondiente dentro de tu proyecto:

```
ardi-mejoras/
├── app/
│   └── layout.tsx                              → app/layout.tsx
├── hooks/
│   └── use-game-state.ts                       → hooks/use-game-state.ts
├── lib/
│   └── roster-utils.ts                         → lib/roster-utils.ts
└── components/
    ├── operator-view.tsx                       → components/operator-view.tsx
    └── scoreboard/
        ├── PreMatchSetup.tsx                   → components/scoreboard/PreMatchSetup.tsx
        ├── BenchModal.tsx                      → components/scoreboard/BenchModal.tsx
        ├── LiveCourtViewer.tsx                 → components/scoreboard/LiveCourtViewer.tsx
        └── OfficialSheetModal.tsx              → components/scoreboard/OfficialSheetModal.tsx
```

> Los archivos `PosModal.tsx`, `SanctionsList.tsx`, `SignatureCanvas.tsx`
> y `TacticalBoard.tsx` **no se modificaron** — estaban correctos.

---

## Dependencias Nuevas

Ejecuta este comando en la raíz del proyecto **antes de reemplazar los archivos**:

```bash
npm install sonner papaparse
npm install --save-dev @types/papaparse
```

Verifica que `sonner` esté en tu `package.json` como dependencia:

```json
"sonner": "^1.x.x",
"papaparse": "^5.x.x"
```

---

## Resumen de Cambios por Archivo

### `app/layout.tsx`
- Agrega `<Toaster>` de Sonner al root layout, disponible para toda la app.

### `hooks/use-game-state.ts`
- **Timers sin deriva**: todos los `setInterval` usan `performance.now()` para calcular
  el tiempo transcurrido real, eliminando la deriva acumulada en partidos largos.
- **IDs únicos**: reemplaza `Date.now().toString()` por `crypto.randomUUID()` en
  sanciones, eventos y registros — sin colisiones en loops síncronos.
- **`isReceiver` estable**: usa `usePathname()` de Next.js en vez de
  `window.location.pathname` directamente, evitando el SSR mismatch de hidratación.
- **`localStorage` seguro**: todas las lecturas/escrituras están envueltas en
  `try/catch` con toast de error en caso de almacenamiento lleno.

### `lib/roster-utils.ts`
- **CSV con papaparse**: reemplaza el `split(',')` manual por `Papa.parse()`,
  tolerante a BOM UTF-8, separadores mixtos y celdas con comas embebidas.
- IDs generados con `crypto.randomUUID()`.

### `components/scoreboard/PreMatchSetup.tsx`
- **`prompt()` → Dialog**: el campo "Nombre del club" al guardar roster
  ahora usa un `<Dialog>` de Radix con `<Input>` en vez de `prompt()` nativo.
- **Inicio Express → Dialog**: los dos `prompt()` para nombres de equipos y
  el `confirm()` para opciones de alargue/penales son ahora un modal con
  formulario, checkboxes y botón de confirmación.
- Importa `processRosterImport` que usa papaparse internamente.

### `components/scoreboard/BenchModal.tsx`
- **`alert()` → `toast.warning()`**: la validación "debe seleccionar un
  infractor directo" era un `alert()` bloqueante — ahora es un toast no
  intrusivo que no congela el hilo principal.

### `components/scoreboard/LiveCourtViewer.tsx`
- **`alert()` → `toast.warning()`**: todas las validaciones reglamentarias
  (cuerpo técnico en pista, mínimo de jugadores, máximo por tarjetas, portero
  duplicado) usan toast en vez de `alert()`.

### `components/operator-view.tsx`
- **`alert()` → `toast.error()`**: las dos validaciones de jugador en
  `handlePosSelectPlayer` (staff intentando entrar a cancha, jugador ya
  expulsado) usan toast en vez de `alert()`.

### `components/scoreboard/OfficialSheetModal.tsx`
- Nombre del archivo CSV generado incluye `crypto.randomUUID().slice(0,8)`
  para evitar sobreescritura en descargas rápidas.
- Refactor menor de helpers duplicados (`fmtTime`, `fmtStamp`).

---

## Verificación Rápida Post-Instalación

1. **Sin `alert()` en el código**:
   ```bash
   grep -r "alert(" app/ hooks/ lib/ components/ --include="*.ts" --include="*.tsx"
   # Resultado esperado: sin salida
   ```

2. **Sin `Date.now()` para IDs**:
   ```bash
   grep -rn "Date.now" hooks/use-game-state.ts lib/roster-utils.ts
   # Resultado esperado: sin salida
   ```

3. **Sonner activo**: al iniciar el servidor y hacer una acción inválida
   (ej: intentar agregar un jugador ya expulsado), debe aparecer un toast
   rojo en la parte superior de la pantalla.

4. **Compilación limpia**:
   ```bash
   npm run build
   # Sin errores de TypeScript
   ```
