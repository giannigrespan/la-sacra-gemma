import './globals.css';

export const metadata = {
  title: 'La Sacra Gemma - Diario di Allenamento',
  description: 'Traccia volume, intensità e progressi in palestra',
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
