import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CoST Admin Dashboard',
  description: 'Manage CoST Knowledge Hub resources',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}
