import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'

// Tipografias autohospedadas desde npm: el build no consulta Google Fonts.
// Los .woff2 viajan en node_modules y Next los sirve desde el propio dominio.
import '@fontsource/orbitron/400.css'
import '@fontsource/orbitron/700.css'
import '@fontsource/orbitron/900.css'
import '@fontsource/share-tech-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import '@fontsource/fira-code/700.css'
import '@fontsource/chivo-mono/700.css'

import './globals.css'

export const metadata: Metadata = {
  title: 'ARDI Hockey Patín 3.5',
  description: 'Sistema profesional de marcador y control de tiempo para Hockey Patín',
  generator: 'v0.app',
  /**
   * Iconos de la app. No estaban declarados, asi que el navegador buscaba
   * `/favicon.ico` —que no existe— y en la pantalla de inicio quedaba el icono
   * generico. Estos pesan 2 KB y 30 KB, no medio mega como el escudo grande.
   *
   * Para un despliegue de club: reemplazar estos tres archivos por el escudo
   * del club ya reducido a esos tamanos. No apuntar aqui al escudo original.
   */
  icons: {
    icon: [
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="font-mono antialiased bg-black text-white">
        {children}

        {/*
          EL DESTINO DE TODOS LOS AVISOS DEL SISTEMA.
          ==========================================
          Faltaba. `toast()` se llama en decenas de lugares —validaciones de
          reglamento, cambio de portero, sanción anulada, partido reanudado—
          y sin este componente montado sonner no tiene dónde dibujar: la
          llamada no falla, simplemente no se ve nada. Avisos que el operador
          necesitaba para saber por qué el sistema rechazó algo se perdían en
          silencio, que es la peor forma de fallar en una mesa de control.

          `theme="dark"` fijo en vez de seguir al sistema: la app es negra
          siempre, y un toast claro sobre el tablero encandila en un gimnasio
          a oscuras. `richColors` para que un rechazo de reglamento se vea
          rojo y una confirmación verde sin tener que leer.

          Arriba y al centro: abajo compiten con la barra inferior y el cajón
          de ajustes, que es justo donde el operador tiene las manos.
        */}
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          closeButton
          duration={3500}
          toastOptions={{ style: { fontSize: '15px', fontWeight: 600 } }}
        />

        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
