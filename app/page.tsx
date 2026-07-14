'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { collection, query, onSnapshot, orderBy, limit, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  User,
  Home,
  Cake,
  DollarSign, 
  ArrowRight,
  LogOut,
  Settings,
  CheckCircle2,
  Search,
  FileText,
  FileSearch,
  PlusCircle,
  AlertCircle,
  Calendar,
  Check,
  X,
  PieChart as PieChartIcon
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, previousSunday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logout } from '@/firebase';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';

const monthAbbr = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function Dashboard() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [statementSearchTerm, setStatementSearchTerm] = useState('');
  const [lightboxPhoto, setLightboxPhoto] = useState<{ src: string; name: string } | null>(null);
  const [attendance, setAttendance] = useState<Record<string, string[]>>({});
  const [baseDate] = useState<Date>(() => previousSunday(new Date()));

  // Last 4 Sundays
  const lastFourSundays = Array.from({ length: 4 }, (_, i) => addWeeks(baseDate, i - 3));

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const qTransactions = query(collection(db, 'transactions'), orderBy('date', 'desc'), orderBy('createdAt', 'desc'));
    const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qAthletes = query(collection(db, 'athletes'), orderBy('name', 'asc'));
    const unsubscribeAthletes = onSnapshot(qAthletes, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const rawData: any = { id: doc.id, ...doc.data() };
        if (rawData.photoUrl && rawData.photoUrl.includes('drive.google.com/file/d/')) {
          const parts = rawData.photoUrl.split('/d/');
          if (parts.length > 1) {
            const fileId = parts[1].split('/')[0];
            rawData.photoUrl = `https://drive.google.com/uc?id=${fileId}`;
          }
        }
        return rawData;
      });
      setAthletes(data);
      setLoading(false);
    });

    const unsubscribeAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const data: Record<string, string[]> = {};
      snapshot.docs.forEach(doc => {
        data[doc.id] = doc.data().presentAthletes || [];
      });
      setAttendance(data);
    });

    return () => {
      unsubscribeTransactions();
      unsubscribeAthletes();
      unsubscribeAttendance();
    };
  }, []);

  // Admin Auto-patcher to permanently fix photo links in Firestore
  useEffect(() => {
    if (isAdmin && athletes.length > 0) {
      const targetAthlete = athletes.find(a => a.id === 'bOo59GgrVPGfh2XwQJ7X');
      if (targetAthlete && targetAthlete.photoUrl && targetAthlete.photoUrl.includes('drive.google.com/file/d/')) {
        const parts = targetAthlete.photoUrl.split('/d/');
        if (parts.length > 1) {
          const fileId = parts[1].split('/')[0];
          const correctUrl = `https://drive.google.com/uc?id=${fileId}`;
          console.log('Admin detected. Auto-patching Alfredo photoUrl in Firestore DB...');
          updateDoc(doc(db, 'athletes', targetAthlete.id), { photoUrl: correctUrl })
            .then(() => console.log('Alfredo document updated directly in Firestore.'))
            .catch(err => console.error('Error auto-patching Alfredo document:', err));
        }
      }
    }
  }, [isAdmin, athletes]);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const paymentDueLimit = today.getDate() <= 9 ? currentMonth - 1 : currentMonth;

  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc: any[], t) => {
      const existing = acc.find(item => item.name === (t.category || 'Outros'));
      if (existing) {
        existing.value += t.amount;
      } else {
        acc.push({ name: t.category || 'Outros', value: t.amount });
      }
      return acc;
    }, []);

  const criticalAthletes = athletes
    .filter(athlete => athlete.status !== 'Afastado' && athlete.status !== 'Inativo')
    .filter(athlete => !athlete.isExempt && !athlete.isBoardMember)
    .map(athlete => {
      const pendingMonths = [];
      for (let i = 1; i <= paymentDueLimit; i++) {
        if (!athlete.paidMonths?.includes(i)) {
          pendingMonths.push(monthAbbr[i - 1]);
        }
      }
      return { ...athlete, pendingMonths };
    })
    .filter(a => a.pendingMonths.length >= 1)
    .sort((a, b) => b.pendingMonths.length - a.pendingMonths.length);

  const COLORS = ['#06b6d4', '#ef4444', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#8b5cf6'];

  // Weekly Birthdays (Monday to Sunday)
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
  const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });

  const weeklyBirthdays = athletes
    .filter(athlete => {
      if (athlete.status === 'Afastado' || athlete.status === 'Inativo') return false;
      if (!athlete.birthdayDay || !athlete.birthdayMonth) return false;
      // Normalizing to current year to check if it's within this week
      const bday = new Date(today.getFullYear(), athlete.birthdayMonth - 1, athlete.birthdayDay);
      return bday >= startOfThisWeek && bday <= endOfThisWeek;
    })
    .sort((a, b) => {
      if (a.birthdayMonth !== b.birthdayMonth) return a.birthdayMonth - b.birthdayMonth;
      return a.birthdayDay - b.birthdayDay;
    });

  // Compliant Athletes (Paid until current month depending on the day of the month, excluding board members and exempt athletes)
  const compliantAthletes = athletes
    .filter(athlete => {
      if (athlete.status === 'Afastado' || athlete.status === 'Inativo') return false;
      if (athlete.isBoardMember || athlete.isExempt) return false;
      const requiredMonths = Array.from({ length: paymentDueLimit }, (_, i) => i + 1);
      const paid = athlete.paidMonths || [];
      return requiredMonths.every(m => paid.includes(m));
    })
    .map(athlete => {
      const paid = athlete.paidMonths || [];
      const paidInFormat = [...paid].sort((a, b) => a - b);
      const paidCount = paidInFormat.length;
      const paidRange = paidCount > 0 
        ? `${monthAbbr[paidInFormat[0] - 1]} - ${monthAbbr[paidInFormat[paidInFormat.length - 1] - 1]}`
        : 'Nenhum';
      return { ...athlete, paidCount, paidRange };
    })
    .sort((a, b) => (a.nickname || a.name).localeCompare(b.nickname || b.name));

  const handleDeleteTransaction = async (id: string) => {
    if (!isAdmin) return;
    if (!window.confirm('Tem certeza que deseja excluir esta transação?')) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleDeleteAthlete = async (id: string) => {
    if (!isAdmin) return;
    if (!window.confirm('Tem certeza que deseja excluir este atleta?')) return;
    try {
      await deleteDoc(doc(db, 'athletes', id));
    } catch (error) {
      console.error('Error deleting athlete:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002874]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Navbar */}
      <nav className={`bg-white border-b border-gray-300 sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'py-1 sm:py-2' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex flex-col sm:flex-row justify-between items-center transition-all duration-300 ${scrolled ? 'h-auto sm:h-20' : 'h-auto sm:h-28 py-3 sm:py-0'}`}>
            <div className={`flex flex-col items-center sm:flex-row sm:items-center transition-all duration-300 ${scrolled ? 'pt-0' : 'pt-3 sm:pt-0'}`}>
              <Image 
                src="https://drive.google.com/uc?id=1sDOSLfcrEqrfhcVEMSDrQGLAnnD0p-b6" 
                alt="Logo Baba das Seis" 
                width={800} 
                height={320} 
                className={`w-auto transition-all duration-300 sm:mr-4 ${scrolled ? 'h-10 sm:h-16' : 'h-20 sm:h-24'}`}
                priority
                referrerPolicy="no-referrer"
              />
              <span className={`text-[#002874] font-black text-lg sm:text-2xl mt-1.5 sm:mt-0 transition-all duration-300 overflow-hidden sm:border-l sm:border-gray-300 sm:pl-4 ${scrolled ? 'max-sm:h-0 max-sm:opacity-0 max-sm:mt-0' : 'h-auto opacity-100'}`}>Gestão Financeira</span>
            </div>
            <div className={`flex items-center space-x-2 sm:space-x-4 transition-all duration-300 ${scrolled ? 'mt-2 sm:mt-0' : 'mt-3 sm:mt-0'}`}>
              <a 
                href="https://babadasseis.netlify.app/" 
                className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-[#0069d3] flex items-center cursor-pointer transition-all"
              >
                <Home className="h-4 w-4 mr-1 text-gray-400 group-hover:text-[#0069d3]" />
                <span>Início</span>
              </a>
              <button 
                onClick={() => setIsRulesModalOpen(true)}
                className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-[#0069d3] flex items-center cursor-pointer transition-all border-none bg-transparent outline-none"
              >
                <FileText className="h-4 w-4 mr-1 text-gray-400 group-hover:text-[#0069d3]" />
                <span>Regras</span>
              </button>
              <Link 
                href="/presenca" 
                className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-[#0069d3] flex items-center cursor-pointer transition-all"
              >
                <Calendar className="h-4 w-4 mr-1 text-gray-400 group-hover:text-[#0069d3]" />
                <span>Presença</span>
              </Link>
              {user && isAdmin ? (
                <>
                  <Link href="/admin" className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-[#0069d3] flex items-center cursor-pointer transition-all">
                    <Settings className="h-4 w-4 mr-1" />
                    <span className="hidden xs:inline">Painel</span>
                  </Link>
                  <button 
                    onClick={() => logout()}
                    className="text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 flex items-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    <span className="hidden xs:inline">Sair</span>
                  </button>
                </>
              ) : user ? (
                <button 
                  onClick={() => logout()}
                  className="text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 flex items-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  <span className="hidden xs:inline">Sair</span>
                </button>
              ) : (
                <Link href="/login" className="text-xs sm:text-sm font-bold text-[#002874] hover:text-[#0069d3] flex items-center cursor-pointer transition-all">
                  <User className="h-4 w-4 mr-1" />
                  <span>Entrar</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Header containing action buttons */}
        <div className="mb-6 flex justify-end">
          <div className="grid grid-cols-2 sm:flex gap-3 w-full sm:w-auto">
            <Link 
              href="/atletas"
              className="flex items-center justify-center px-4 sm:px-6 py-3 bg-[#ffba00] text-[#000002] rounded-xl font-black hover:bg-[#ffba00]/90 transition-all shadow-lg shadow-amber-200/50 cursor-pointer hover:scale-105 active:scale-95 duration-200 text-sm sm:text-base border border-[#ffba00]/30"
            >
              <Users className="h-5 w-5 mr-2 text-[#000002]" /> Atletas
            </Link>
            <button 
              onClick={() => setIsStatementModalOpen(true)}
              className="flex items-center justify-center px-4 sm:px-6 py-3 bg-[#002874] text-white rounded-xl font-extrabold hover:bg-[#002874]/90 transition-all shadow-lg shadow-blue-900/10 cursor-pointer hover:scale-105 active:scale-95 duration-200 text-sm sm:text-base border border-[#002874]/20"
            >
              <FileText className="h-5 w-5 mr-2" /> Extrato
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Cartão Financeiro Compacto e Unificado */}
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-gray-400">Resumo Financeiro</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${balance >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${balance >= 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
                  {balance >= 0 ? 'Superávit' : 'Déficit'}
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between border-b border-gray-100 pb-5 mb-5">
                <div>
                  <p className="text-sm font-medium text-gray-500">Saldo Atual</p>
                  <h3 className={`text-3xl sm:text-4xl font-black tracking-tight mt-1 ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    <span className="text-lg sm:text-xl font-bold mr-1">R$</span>
                    {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="mt-3 sm:mt-0 flex items-center gap-2 text-xs text-gray-400">
                  <DollarSign className={`h-5 w-5 ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                  <span>Atualizado em tempo real</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0069d3]/10 hover:bg-[#0069d3]/15 p-4 rounded-xl border border-[#0069d3]/35 shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 mb-1.5">
                  <TrendingUp className="h-4 w-4 text-[#0069d3]" />
                  <span className="text-xs font-bold text-[#0069d3] uppercase">Entradas</span>
                </div>
                <p className="text-lg sm:text-xl font-black text-gray-800">
                  <span className="text-xs font-bold mr-0.5 text-gray-500">R$</span>
                  {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="bg-red-100 hover:bg-red-200/90 p-4 rounded-xl border border-red-300 shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 mb-1.5">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-bold text-red-600 uppercase">Saídas</span>
                </div>
                <p className="text-lg sm:text-xl font-black text-gray-800">
                  <span className="text-xs font-bold mr-0.5 text-gray-500">R$</span>
                  {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Cartão Atletas */}
          <div className="bg-amber-100/90 p-6 rounded-2xl shadow-md border border-amber-300 flex flex-col justify-between transition-all duration-300">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-amber-300/60">
                <div className="p-1.5 bg-amber-500 text-white rounded-lg shadow-sm">
                  <Users className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-gray-800 text-lg">Atletas</h4>
              </div>

              <div className="space-y-3">
                {/* Ativos */}
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl shadow-sm border border-amber-300/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-sm font-semibold text-gray-600">Ativos</span>
                  </div>
                  <span className="text-lg font-black text-gray-800">
                    {athletes.filter(a => a.status !== 'Afastado' && a.status !== 'Inativo').length}
                  </span>
                </div>

                {/* Inativo */}
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl shadow-sm border border-amber-300/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="text-sm font-semibold text-gray-600">Inativo</span>
                  </div>
                  <span className="text-lg font-black text-gray-800">
                    {athletes.filter(a => a.status === 'Inativo').length}
                  </span>
                </div>

                {/* Afastado */}
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl shadow-sm border border-amber-300/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-sm font-semibold text-gray-600">Afastado</span>
                  </div>
                  <span className="text-lg font-black text-gray-800">
                    {athletes.filter(a => a.status === 'Afastado').length}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-300 text-right">
              <span className="text-[10px] font-bold text-amber-800 uppercase">
                Total: {athletes.length} cadastrados
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Adimplentes */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col h-[480px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                 <User className="h-5 w-5 mr-2 text-green-500" /> Adimplentes
              </h3>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                {compliantAthletes.length} Regulares
              </span>
            </div>
            <p className="text-[11px] text-green-700/80 mb-6 -mt-4 bg-green-50/30 p-2 rounded-lg border border-green-50">
              Atletas regulares, com pagamentos em dia até o {paymentDueLimit === currentMonth ? 'mês atual' : 'mês anterior (limite dia 09)'}.
            </p>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {compliantAthletes.length > 0 ? (
                compliantAthletes.map((athlete: any) => (
                  <div key={athlete.id} className="flex items-center justify-between p-3 bg-green-50/5 rounded-xl border border-green-200 hover:border-green-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={() => {
                          if (athlete.photoUrl) {
                            setLightboxPhoto({ src: athlete.photoUrl, name: athlete.nickname || athlete.name });
                          }
                        }}
                        className={`h-10 w-10 rounded-xl border border-gray-150 overflow-hidden bg-white shadow-sm flex-shrink-0 flex items-center justify-center ${athlete.photoUrl ? 'cursor-pointer hover:scale-[1.08] hover:shadow-md hover:border-[#0069d3]/40 active:scale-95 transition-all duration-200' : ''}`}
                        title={athlete.photoUrl ? "Visualizar foto" : undefined}
                      >
                        {athlete.photoUrl ? (
                          <div className="relative h-full w-full">
                            <Image 
                              src={athlete.photoUrl} 
                              alt={athlete.name}
                              fill
                              className="object-cover object-top"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-blue-50 text-[#002874] font-bold text-sm">
                            {athlete.name?.charAt(0) || 'A'}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800">{athlete.nickname || athlete.name}</span>
                        <span className="text-[10px] font-bold text-green-600/70 uppercase">
                          {athlete.paidRange}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                       <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm italic py-8">
                  <DollarSign className="h-8 w-8 mb-2 opacity-20" />
                  Nenhum atleta regular até {monthAbbr[paymentDueLimit - 1] || 'mês anterior'}.
                </div>
              )}
            </div>
          </div>

          {/* Inadimplentes */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col h-[480px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <User className="h-5 w-5 mr-2 text-red-500" /> Inadimplentes
              </h3>
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                {criticalAthletes.length} Pendentes
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mb-6 -mt-4 bg-red-50/30 p-2 rounded-lg border border-red-50">
              Atletas irregulares com qualquer pendência até o {paymentDueLimit === currentMonth ? 'mês atual' : 'mês anterior  (limite dia 09)'}.
            </p>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {criticalAthletes.length > 0 ? (
                criticalAthletes.map((athlete: any) => (
                  <div key={athlete.id} className="flex items-center justify-between p-3 bg-red-50/5 rounded-xl border border-red-200 hover:border-red-300 transition-colors">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{athlete.nickname || athlete.name}</span>
                        {athlete.isNew && (
                          <span className="text-[9px] font-black text-white bg-[#0069d3] px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                            Novo
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {athlete.pendingMonths.map((month: string) => (
                          <span key={month} className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase">
                            {month}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Total</span>
                      <span className="text-sm font-bold text-red-600">{athlete.pendingMonths.length} meses</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">
                  Nenhum atleta com pendências críticas.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Presença (Relatório de Presença) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col h-[480px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2 text-amber-500" /> Presença
              </h3>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-center">
                Últimos 4 Domingos
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mb-6 -mt-4 bg-amber-50/30 p-2 rounded-lg border border-amber-100/50">
              Confira a frequência dos atletas nos últimos 4 babas.
            </p>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 px-2">Atleta</th>
                    {lastFourSundays.map(s => (
                      <th key={s.toISOString()} className="pb-3 text-center px-1 font-black">{format(s, 'dd/MM')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...athletes]
                    .filter(a => a.status !== 'Afastado' && a.status !== 'Inativo')
                    .sort((a, b) => (a.nickname || a.name).localeCompare(b.nickname || b.name))
                    .map(athlete => (
                    <tr key={athlete.id} className="hover:bg-gray-50 group">
                      <td className="py-2.5 px-2">
                        <span className="text-sm font-bold text-gray-800 line-clamp-1 group-hover:text-[#0069d3] transition-colors">
                          {athlete.nickname || athlete.name}
                        </span>
                      </td>
                      {lastFourSundays.map(sunday => {
                        const dateId = format(sunday, 'yyyy-MM-dd');
                        const isPresent = (attendance[dateId] || []).includes(athlete.id);
                        return (
                          <td key={dateId} className="py-2.5 text-center px-1">
                            {isPresent ? (
                              <div className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-green-100 text-green-600 border border-green-200">
                                <Check className="h-3 w-3 stroke-[4px]" />
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-red-50 text-red-300 border border-red-100 opacity-60">
                                <X className="h-3 w-3 stroke-[4px]" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>


          {/* Niver da Semana */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-[480px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Cake className="h-5 w-5 mr-2 text-[#ffba00]" /> Niver da Semana
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {weeklyBirthdays.length > 0 ? (
                weeklyBirthdays.map((athlete: any) => (
                  <div key={athlete.id} className="flex items-center justify-between p-3 bg-[#002874]/5 rounded-xl border border-[#002874]/15 hover:bg-[#002874]/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg overflow-hidden border-2 border-white shadow-sm bg-[#002874]/10 flex-shrink-0">
                        {athlete.photoUrl ? (
                          <div className="relative h-full w-full">
                            <Image 
                              src={athlete.photoUrl} 
                              alt={athlete.nickname || athlete.name}
                              fill
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[#002874] font-bold text-lg">
                            {athlete.nickname?.charAt(0) || athlete.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 leading-tight">{athlete.nickname || athlete.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-medium line-clamp-1">{athlete.name}</p>
                      </div>
                    </div>
                    <div className="bg-white px-2 py-1 rounded-lg border border-[#002874]/20 shadow-sm flex flex-col items-center min-w-[50px] flex-shrink-0 ml-2">
                       <span className="text-[10px] font-bold text-[#0069d3] uppercase leading-none mb-1">DATA</span>
                       <span className="text-sm font-black text-[#002874]">
                         {String(athlete.birthdayDay).padStart(2, '0')}/{String(athlete.birthdayMonth).padStart(2, '0')}
                       </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm italic">
                  <Calendar className="h-8 w-8 mb-2 opacity-20" />
                  Nenhum aniversariante nesta semana.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Transações Recentes</h3>
            <button 
              onClick={() => setIsStatementModalOpen(true)}
              className="px-4 py-2 bg-blue-50 text-[#002874] hover:bg-blue-100 rounded-xl text-sm font-bold transition-all flex items-center border border-blue-100 shadow-sm cursor-pointer hover:scale-105 active:scale-95 duration-200"
            >
              Ver todas <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Descrição</th>
                  <th className="px-6 py-4 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.slice(0, 5).map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">{format(new Date(t.date + 'T12:00:00'), 'dd/MM/yyyy')}</td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      <div className="flex flex-col">
                        <span>{t.description || '-'}</span>
                        {t.isMonthlyFee && t.athleteId && (
                          <span className="text-[10px] text-[#002874] font-bold uppercase">
                            Atleta: {athletes.find(a => a.id === t.athleteId)?.nickname || athletes.find(a => a.id === t.athleteId)?.name || 'Desconhecido'}
                            {t.referenceMonth && ` • Ref: ${monthAbbr[parseInt(t.referenceMonth) - 1]}`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${
                      t.type === 'income' ? 'text-[#002874]' : 'text-red-600'
                    }`}>
                      {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500">Nenhuma transação encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Transaction Statement Modal */}
      {isStatementModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-300">
            <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Extrato</h3>
                <p className="text-sm text-gray-500">Histórico completo de entradas e saídas</p>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Filtrar transações..."
                    value={statementSearchTerm}
                    onChange={(e) => setStatementSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border-2 border-[#002874] rounded-xl text-sm focus:ring-2 focus:ring-[#0069d3] outline-none transition-all"
                  />
                </div>
                <button onClick={() => { setIsStatementModalOpen(false); setStatementSearchTerm(''); }} className="text-gray-400 hover:text-gray-600 p-2 cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-2 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-16">CP</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Descrição</th>
                    <th className="px-4 sm:px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Valor</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-300">
                  {transactions
                    .filter(t => {
                      const term = statementSearchTerm.toLowerCase();
                      const desc = (t.description || '').toLowerCase();
                      const cat = (t.category || '').toLowerCase();
                      
                      let athleteMatch = false;
                      let refMonthMatch = false;
                      
                      if (t.isMonthlyFee && t.athleteId) {
                        const athlete = athletes.find(a => a.id === t.athleteId);
                        if (athlete) {
                          const name = (athlete.name || '').toLowerCase();
                          const nickname = (athlete.nickname || '').toLowerCase();
                          athleteMatch = name.includes(term) || nickname.includes(term);
                        }
                        
                        if (t.referenceMonth) {
                          const monthIdx = parseInt(t.referenceMonth) - 1;
                          if (monthIdx >= 0 && monthIdx < 12) {
                            const abbr = monthAbbr[monthIdx].toLowerCase();
                            const fullMonths = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                            const full = fullMonths[monthIdx];
                            refMonthMatch = abbr.includes(term) || full.includes(term);
                          }
                        }
                      }
                      
                      return desc.includes(term) || cat.includes(term) || athleteMatch || refMonthMatch;
                    })
                    .map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">{format(new Date(t.date + 'T12:00:00'), 'dd/MM/yyyy')}</td>
                        <td className="px-2 py-4 text-center">
                          {t.externalLink ? (
                            <a 
                              href={t.externalLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center p-1.5 bg-blue-50 text-[#002874] rounded-lg hover:bg-blue-100 transition-colors border border-blue-100"
                              title="Ver Comprovante"
                            >
                              <FileSearch className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="text-gray-200">-</span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-800">
                          <div className="flex flex-col">
                            <span>{t.description || '-'}</span>
                            {t.isMonthlyFee && t.athleteId && (
                              <span className="text-[10px] text-[#002874] font-bold uppercase">
                                Atleta: {athletes.find(a => a.id === t.athleteId)?.nickname || athletes.find(a => a.id === t.athleteId)?.name || 'Desconhecido'}
                                {t.referenceMonth && ` • Ref: ${monthAbbr[parseInt(t.referenceMonth) - 1]}`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${
                          t.type === 'income' ? 'text-[#002874]' : 'text-red-600'
                        }`}>
                          {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button 
                onClick={() => setIsStatementModalOpen(false)}
                className="px-6 py-2 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all cursor-pointer hover:scale-105 active:scale-95 duration-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
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
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-sm text-gray-700 leading-relaxed">
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
                  O atleta que receber cartão vermelho, cumprirá suspensão automática de 1 (um) baba. O mesmo será julgado se necessário.
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

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div 
          onClick={() => setLightboxPhoto(null)} 
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center z-[100] p-4 cursor-zoom-out animate-in fade-in duration-200"
        >
          <div className="absolute top-4 right-4 z-[110]">
            <button 
              onClick={() => setLightboxPhoto(null)} 
              className="p-3 bg-white/10 hover:bg-white/20 active:scale-90 text-white rounded-full transition-all duration-150 cursor-pointer shadow-lg backdrop-blur-sm border border-white/10"
              title="Fechar"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-sm w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200 p-3.5 flex flex-col cursor-default animate-in zoom-in-95 duration-200"
          >
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-gray-950 border border-gray-100">
              <Image 
                src={lightboxPhoto.src} 
                alt={lightboxPhoto.name}
                fill
                className="object-cover object-top"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="pt-4 pb-2 px-3 flex flex-col items-center text-center">
              <h4 className="text-xl font-black text-gray-900">{lightboxPhoto.name}</h4>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Atleta Adimplente</p>
            </div>
          </div>
        </div>
      )}

      {/* Athletes Modal */}
      {/* Removed as per request */}

    </div>
  );
}
