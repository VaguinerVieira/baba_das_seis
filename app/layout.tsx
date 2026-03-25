import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { AuthProvider } from '@/hooks/use-auth';

export const metadata: Metadata = {
  title: 'Baba das Seis - Gestão Financeira',
  description: 'Gestão financeira e mensalidades do grupo Baba das Seis.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
