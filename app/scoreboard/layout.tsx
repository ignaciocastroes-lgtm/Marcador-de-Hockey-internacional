import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Tablero - Hockey Patín Chile',
  description: 'Vista de tablero para proyección',
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
}

export default function ScoreboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-black overflow-hidden">
      {children}
    </div>
  )
}
