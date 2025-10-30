import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TradeTron Token Generator',
  description: 'Automated multi-user token generation for TradeTron brokers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}

