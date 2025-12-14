import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Southern Charm - Sleeper Fantasy',
  description: 'Sleeper Fantasy Football League Manager',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

