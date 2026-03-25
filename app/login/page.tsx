'use client';

import React, { useEffect, useState } from 'react';
import { loginWithGoogle, logout } from '@/firebase';
import { useAuth, ADMIN_EMAIL } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogIn, AlertCircle } from 'lucide-react';

import Image from 'next/image';

export default function LoginPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (isAdmin) {
        router.push('/admin');
      } else if (!error) {
        setTimeout(() => {
          setError(`Acesso restrito. Apenas ${ADMIN_EMAIL} pode acessar o painel.`);
          logout();
        }, 0);
      }
    }
  }, [user, isAdmin, router, error]);

  const handleLogin = async () => {
    setError(null);
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
      setError('Falha na autenticação com o Google.');
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <Image 
              src="/logo.png" 
              alt="Logo Baba das Seis" 
              width={260} 
              height={104} 
              className="h-24 w-auto"
              priority
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Baba das Seis</h1>
          <p className="text-gray-500 text-center mt-2">Acesse o painel administrativo para gerenciar as finanças do grupo.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
        >
          <Image 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            width={20} 
            height={20} 
            className="h-5 w-5"
            referrerPolicy="no-referrer"
          />
          <span>Entrar com Google</span>
        </button>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            Apenas administradores autorizados podem realizar alterações.
          </p>
        </div>
      </div>
      
      <button 
        onClick={() => router.push('/')}
        className="mt-8 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
      >
        Voltar para o Dashboard
      </button>
    </div>
  );
}
