import './globals.css';
import { Oswald, Source_Sans_3 } from 'next/font/google';

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-oswald',
  display: 'swap',
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-source',
  display: 'swap',
});

export const metadata = {
  title: 'La Sacra Gemma — Diario di allenamento',
  description: 'Volume, intensità e progressi di ogni sessione in palestra.',
};

export const viewport = {
  themeColor: '#0a0a0b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="it" className={`${oswald.variable} ${sourceSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
