import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Seguridad 360 Colombia',
  description: 'SG-SST, brigadas, inspecciones e indicadores en un solo ecosistema.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
