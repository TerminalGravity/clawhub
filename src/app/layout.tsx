import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Talon - Agent Command Center',
  description: 'OpenClaw agent workspace management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  )
}
