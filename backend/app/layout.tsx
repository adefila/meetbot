import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, DM_Mono } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MeetBot — AI Meeting Notes',
  description: 'MeetBot automatically joins your Zoom, Google Meet, and Teams calls, transcribes the conversation, and sends you AI-generated notes.',
  icons: { icon: '/favicon.ico' },
  verification: { google: 'dV-qlnmYkCZn01ebmUQPYQuek9y0XBMuSjCZXSLosEg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
