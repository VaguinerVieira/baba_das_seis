'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { loginWithGoogle, loginWithEmail, registerWithEmail, logout } from '@/firebase';
import { useAuth, ADMIN_EMAILS } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogIn, AlertCircle, Mail, Lock, UserPlus, FileText, X } from 'lucide-react';

import Image from 'next/image';

export default function LoginPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

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
          <button 
            onClick={() => setIsRulesModalOpen(true)}
            className="text-sm font-medium text-gray-600 hover:text-cyan-500 transition-colors cursor-pointer border-none bg-transparent outline-none"
          >
            Regras
          </button>
          <Link 
            href="/presenca" 
            className="text-sm font-medium text-gray-600 hover:text-cyan-500 transition-colors"
          >
            Presença
          </Link>
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
        className="mt-8 text-sm text-cyan-600 hover:text-cyan-700 font-medium animate-in fade-in duration-200"
      >
        Voltar para o Dashboard
      </button>

      {/* Rules Modal */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-in fade-in duration-200">
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-300 animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#002874]/10 text-[#002874] rounded-xl">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Regras do Baba</h3>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Regulamento Interno - Baba das Seis</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRulesModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-2 cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200"
                title="Fechar"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-sm text-gray-700 leading-relaxed text-left">
              <div className="space-y-3.5">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-gray-900 font-bold block mb-1">Art. 1º</strong>
                  Só poderá jogar atletas escritos no Grupo Baba das Seis.
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-gray-900 font-bold block mb-1">Art. 2º</strong>
                  Não é permitido, participar de qualquer baba, o atleta que apresentar qualquer indício de embriaguez.
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-gray-900 font-bold block mb-1">Art. 3º</strong>
                  Estará sujeito a punições, o atleta que fizer críticas a diretoria do grupo ou ao presente regulamento.
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-gray-900 font-bold block mb-1">Art. 4º</strong>
                  Cada atleta, com exceção da diretoria, deverá contribuir mensalmente, com um valor ora acordado, tendo como base o dia 10 (dez) de cada mês. O mesmo poderá ser automaticamente desligado caso apresente 2 (dois) meses de inadimplência.
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-gray-900 font-bold block mb-1">Art. 5º</strong>
                  O atleta poderá ser automaticamente desligado caso apresente ausência em quatro babas consecutivos.
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-gray-900 font-bold block mb-1">Art. 6º</strong>
                  Para participar de cada baba, é obrigatório colocar o nome na relação de presença do dia, até as <span className="font-extrabold text-[#002874]">06:15h (Seis horas e quinze minutos) em ponto!</span>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-gray-900 font-bold block mb-1">Art. 7º</strong>
                  O atleta que agredir moralmente o companheiro, será julgado e punido.
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-gray-900 font-bold block mb-1">Art. 8º</strong>
                  O atleta que agredir fisicamente o companheiro, será automaticamente desligado.
                </div>
                
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                  <strong className="text-amber-900 font-bold block mb-1.5">Art. 9º</strong>
                  O atleta que receber cartão amarelo:
                  <ul className="list-disc pl-5 mt-1.5 space-y-1 text-gray-700">
                    <li><span className="font-semibold text-gray-900">1º Cartão Amarelo:</span> Descansa 5 (cinco) minutos</li>
                    <li><span className="font-semibold text-gray-900">2º Cartão Amarelo:</span> Descansa 10 (dez) minutos</li>
                    <li><span className="font-semibold text-gray-900">3º Cartão Amarelo:</span> Descansa 15 (quinze) minutos</li>
                  </ul>
                  <p className="mt-2 text-xs italic text-amber-800 font-semibold bg-white p-2 rounded border border-amber-100">
                    Obs.: Caso o árbitro julgue o lance procedente a vermelho, assim será feito!
                  </p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-gray-900 font-bold block mb-1">Art. 10º</strong>
                  O atleta que receber cartão vermelho, cumprirá suspension automática de 1 (um) baba. O mesmo será julgado se necessário.
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-gray-900 font-bold block mb-1">Art. 11º</strong>
                  O atleta que entrar na partida até 10 (dez) minutos do primeiro tempo, entrará no sorteio do segundo tempo.
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-gray-900 font-bold block mb-1">Art. 12º</strong>
                  Só poderá jogar o atleta que estiver devidamente uniformizado.
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-gray-900 font-bold block mb-1">Art. 13º</strong>
                  O baba deverá ser dividido pelos responsáveis do dia e entregue até as 5:50h. A escolha dos reservas acontece no intervalo entre os tempos!
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-2">
                <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-xs font-semibold text-center border border-blue-100">
                  Qualquer alteração no regulamento interno será imediatamente informada!!
                </div>
                <div className="text-right text-[11px] text-gray-400 font-medium">
                  Última alteração: 13/07/2026 às 17:55
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button 
                onClick={() => setIsRulesModalOpen(false)}
                className="px-6 py-2 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all cursor-pointer hover:scale-105 active:scale-95 duration-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
