'use client';

import React, { useEffect, useState } from 'react';
import { loginWithGoogle, loginWithEmail, registerWithEmail, logout } from '@/firebase';
import { useAuth, ADMIN_EMAILS } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogIn, AlertCircle, Mail, Lock, UserPlus } from 'lucide-react';

import Image from 'next/image';

export default function LoginPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (isAdmin) {
        router.push('/admin');
      } else if (!error) {
        setTimeout(() => {
          setError(`Acesso restrito. Apenas administradores autorizados (${ADMIN_EMAILS.join(', ')}) podem acessar o painel.`);
          logout();
        }, 0);
      }
    }
  }, [user, isAdmin, router, error]);

  const handleGoogleLogin = async () => {
    setError(null);
    setAuthLoading(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      console.error('Login failed:', error);
      setError(error.message || 'Falha na autenticação com o Google.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAuthLoading(true);
    try {
      if (isRegistering) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (error: any) {
      console.error('Auth failed:', error);
      if (error.code === 'auth/user-not-found') {
        setError('Usuário não encontrado. Verifique o e-mail ou cadastre-se.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Senha incorreta.');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (error.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (error.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else {
        setError(error.message || 'Falha na autenticação.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 p-4 z-50">
        <div className="max-w-7xl mx-auto flex justify-end items-center space-x-6">
          <a 
            href="https://babadasseis.netlify.app/" 
            className="text-sm font-medium text-gray-600 hover:text-cyan-500 transition-colors"
          >
            Início
          </a>
          <a 
            href="https://drive.google.com/file/d/15IdR0y2pQZdLiaF60dPTaNDR1PMTWZLT/view?usp=sharing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-600 hover:text-cyan-500 transition-colors"
          >
            Regulamento
          </a>
        </div>
      </div>
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100 mt-16">
        <div className="flex flex-col items-center mb-8 pt-[20px] sm:pt-0">
          <div className="mb-4">
            <Image 
              src="https://drive.google.com/uc?id=1sDOSLfcrEqrfhcVEMSDrQGLAnnD0p-b6" 
              alt="Logo Baba das Seis" 
              width={1280} 
              height={512} 
              className="h-40 sm:h-48 w-auto"
              priority
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-cyan-600 font-bold text-xl mb-1">Gestão Financeira</span>
          <h1 className="text-2xl font-bold text-gray-800">Baba das Seis</h1>
          <p className="text-gray-500 text-center mt-2 text-sm">Acesse o painel administrativo para gerenciar as finanças do grupo.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input 
                type="email" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                placeholder="exemplo@email.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input 
                type="password" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={authLoading}
            className="w-full bg-cyan-500 text-white font-bold py-3 px-4 rounded-xl hover:bg-cyan-600 transition-all shadow-lg shadow-cyan-100 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {authLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>{isRegistering ? 'Cadastrar' : 'Entrar'}</>
            )}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-400">ou</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={authLoading}
          className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
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

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
          >
            {isRegistering ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Cadastre-se'}
          </button>
        </div>

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
