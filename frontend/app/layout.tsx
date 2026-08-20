import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'HisabFlow - Digital Khata & Retail Inventory Ledger',
  description: 'HisabFlow - Modern Digital Credit Ledger (Khata), Retail Inventory Management, and Shop Analytics.',
  openGraph: {
    title: 'HisabFlow - Digital Khata & Retail Inventory Ledger',
    description: 'HisabFlow - Modern Digital Credit Ledger (Khata), Retail Inventory Management, and Shop Analytics.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HisabFlow - Digital Khata & Retail Inventory Ledger',
    description: 'HisabFlow - Modern Digital Credit Ledger (Khata), Retail Inventory Management, and Shop Analytics.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
