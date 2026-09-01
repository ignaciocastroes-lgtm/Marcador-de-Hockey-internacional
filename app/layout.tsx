import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'

// Tipografias autohospedadas desde npm: el build no consulta Google Fonts.
// Los .woff2 viajan en node_modules y Next los sirve desde el propio dominio.
import '@fontsource/orbitron/400.css'
import '@fontsource/orbitron/700.css'
import '@fontsource/orbitron/900.css'
import '@fontsource/share-tech-mono/400.css'

import './globals.css'

export const metadata: Metadata = {
  title: 'ARDI Hockey Patín 3.0 — Pista Viva',
  description: 'Sistema profesional de marcador y control de tiempo para Hockey Patín',
  generator: 'v0.app',
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
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
