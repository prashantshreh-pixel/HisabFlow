import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'HisabFlow | Digital Khata & Retail Inventory Ledger',
  description: 'Fast, offline-resilient digital khata credit ledger, inventory tracking, and point of sale terminal for retail shops.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://hisabflow.com'),
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'HisabFlow | Digital Khata & Retail Inventory Ledger',
    description: 'Fast, offline-resilient digital khata credit ledger, inventory tracking, and point of sale terminal for retail shops.',
    url: 'https://hisabflow.com',
    siteName: 'HisabFlow',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'HisabFlow | Digital Khata & Retail Inventory Ledger',
    description: 'Fast, offline-resilient digital khata credit ledger, inventory tracking, and point of sale terminal for retail shops.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
