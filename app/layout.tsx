import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { AuthProvider } from '@/hooks/use-auth';
import Footer from '@/components/footer';

export const metadata: Metadata = {
  title: 'Baba das Seis - Gestão Financeira',
  description: 'Gestão financeira e mensalidades do grupo Baba das Seis.',
  icons: {
    icon: 'https://www.gstatic.com/mobilesdk/160503_mobilesdk/logo/2x/firebase_28dp.png', // Generic icon as fallback
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning className="pb-16">
        <AuthProvider>
          {children}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
