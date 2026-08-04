import './globals.css';
import AppShell from './AppShell';

export const metadata = {
  title: 'Pusat Operasi Toko',
  description: 'Dashboard operasional katalog Shopee, iklan, gudang, dan tindakan.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
