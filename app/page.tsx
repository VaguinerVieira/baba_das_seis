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
  const [statementSearchTerm, setStatementSearchTerm] = useState('');
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
        // Ignore Jan (1), Feb (2), Mar (3) for "New" (isNew) athletes
        if (athlete.isNew && i <= 3) continue;
        
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

  // Compliant Athletes (Paid until current month depending on the day of the month, excluding board members, new athletes, and exempt athletes)
  const compliantAthletes = athletes
    .filter(athlete => {
      if (athlete.status === 'Afastado' || athlete.status === 'Inativo') return false;
      if (athlete.isBoardMember || athlete.isNew || athlete.isExempt) return false;
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Navbar */}
      <nav className={`bg-white border-b border-gray-300 sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'py-2' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex flex-col sm:flex-row justify-between items-center transition-all duration-300 ${scrolled ? 'h-auto sm:h-28' : 'h-auto sm:h-40 py-4 sm:py-0'}`}>
            <div className={`flex flex-col items-center sm:flex-row sm:items-center transition-all duration-300 ${scrolled ? 'pt-0' : 'pt-5 sm:pt-0'}`}>
              <Image 
                src="https://drive.google.com/uc?id=1sDOSLfcrEqrfhcVEMSDrQGLAnnD0p-b6" 
                alt="Logo Baba das Seis" 
                width={800} 
                height={320} 
                className={`w-auto transition-all duration-300 sm:mr-4 ${scrolled ? 'h-12 sm:h-24' : 'h-32 sm:h-32'}`}
                priority
                referrerPolicy="no-referrer"
              />
              <span className={`text-cyan-600 font-bold text-xl mt-2 sm:hidden transition-all duration-300 overflow-hidden ${scrolled ? 'h-0 opacity-0 mt-0' : 'h-auto opacity-100'}`}>Gestão Financeira</span>
            </div>
            <div className={`flex items-center space-x-2 sm:space-x-4 transition-all duration-300 ${scrolled ? 'mt-2 sm:mt-0' : 'mt-4 sm:mt-0'}`}>
              <a 
                href="https://babadasseis.netlify.app/" 
                className="text-xs sm:text-sm font-medium text-gray-600 hover:text-cyan-500 flex items-center cursor-pointer"
              >
                Início
              </a>
              <a 
                href="https://drive.google.com/file/d/15IdR0y2pQZdLiaF60dPTaNDR1PMTWZLT/view?usp=sharing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs sm:text-sm font-medium text-gray-600 hover:text-cyan-500 flex items-center cursor-pointer"
              >
                Regulamento
              </a>
              <Link 
                href="/presenca" 
                className="text-xs sm:text-sm font-medium text-gray-600 hover:text-cyan-500 flex items-center cursor-pointer"
              >
                Presença
              </Link>
              {user && isAdmin ? (
                <>
                  <Link href="/admin" className="text-xs sm:text-sm font-medium text-gray-600 hover:text-cyan-500 flex items-center cursor-pointer">
                    <Settings className="h-4 w-4 mr-1" />
                    <span className="hidden xs:inline">Painel</span>
                  </Link>
                  <button 
                    onClick={() => logout()}
                    className="text-xs sm:text-sm font-medium text-red-600 hover:text-red-700 flex items-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    <span className="hidden xs:inline">Sair</span>
                  </button>
                </>
              ) : user ? (
                <button 
                  onClick={() => logout()}
                  className="text-xs sm:text-sm font-medium text-red-600 hover:text-red-700 flex items-center cursor-pointer hover:scale-105 active:scale-95 duration-200"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  <span className="hidden xs:inline">Sair</span>
                </button>
              ) : (
                <Link href="/login" className="text-xs sm:text-sm font-medium text-cyan-500 hover:text-cyan-600 cursor-pointer">
                  Entrar
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Financeiro</h1>
            <p className="text-sm text-gray-500 mt-1">Resumo das finanças do grupo Baba das Seis</p>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-3 w-full sm:w-auto">
            <Link 
              href="/atletas"
              className="flex items-center justify-center px-4 sm:px-6 py-3 bg-cyan-500 text-white rounded-xl font-bold hover:bg-cyan-600 transition-all shadow-lg shadow-cyan-100 cursor-pointer hover:scale-105 active:scale-95 duration-200 text-sm sm:text-base"
            >
              <Users className="h-5 w-5 mr-2" /> Atletas
            </Link>
            <button 
              onClick={() => setIsStatementModalOpen(true)}
              className="flex items-center justify-center px-4 sm:px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-900 transition-all shadow-lg shadow-gray-200 cursor-pointer hover:scale-105 active:scale-95 duration-200 text-sm sm:text-base"
            >
              <FileText className="h-5 w-5 mr-2" /> Extrato
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 p-6 rounded-2xl shadow-sm border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/80 rounded-lg shadow-sm">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-white/80 px-2 py-1 rounded-full">+12%</span>
            </div>
            <p className="text-sm font-medium text-blue-600/70">Total de Entradas</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>

          <div className="bg-red-50/50 p-6 rounded-2xl shadow-sm border border-red-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/80 rounded-lg shadow-sm">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <span className="text-xs font-medium text-red-600 bg-white/80 px-2 py-1 rounded-full">-5%</span>
            </div>
            <p className="text-sm font-medium text-red-600/70">Total de Saídas</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>

          <div className="bg-emerald-50 p-6 rounded-2xl shadow-sm border border-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/80 rounded-lg shadow-sm">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-emerald-600/70">Saldo Atual</p>
            <h3 className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>

          <div className="bg-amber-50 p-6 rounded-2xl shadow-sm border border-amber-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/80 rounded-lg shadow-sm">
                <Users className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-amber-600/70">Atletas Ativos</p>
            <h3 className="text-2xl font-bold text-gray-800">{athletes.filter(a => a.status !== 'Afastado' && a.status !== 'Inativo').length}</h3>
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
                      <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center text-green-700 text-sm font-black">
                        {athlete.paidCount}
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
                          <span className="text-[9px] font-black text-white bg-cyan-500 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
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
                        <span className="text-sm font-bold text-gray-800 line-clamp-1 group-hover:text-cyan-600 transition-colors">
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
                <Cake className="h-5 w-5 mr-2 text-cyan-500" /> Niver da Semana
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {weeklyBirthdays.length > 0 ? (
                weeklyBirthdays.map((athlete: any) => (
                  <div key={athlete.id} className="flex items-center justify-between p-3 bg-cyan-50/30 rounded-xl border border-cyan-100/50 hover:bg-cyan-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg overflow-hidden border-2 border-white shadow-sm bg-cyan-100 flex-shrink-0">
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
                          <div className="h-full w-full flex items-center justify-center text-cyan-600 font-bold text-lg">
                            {athlete.nickname?.charAt(0) || athlete.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 leading-tight">{athlete.nickname || athlete.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-medium line-clamp-1">{athlete.name}</p>
                      </div>
                    </div>
                    <div className="bg-white px-2 py-1 rounded-lg border border-cyan-100 shadow-sm flex flex-col items-center min-w-[50px] flex-shrink-0 ml-2">
                       <span className="text-[10px] font-bold text-cyan-400 uppercase leading-none mb-1">DATA</span>
                       <span className="text-sm font-black text-cyan-600">
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
              className="px-4 py-2 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-xl text-sm font-semibold transition-all flex items-center border border-cyan-100 shadow-sm cursor-pointer hover:scale-105 active:scale-95 duration-200"
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
                          <span className="text-[10px] text-cyan-600 font-bold uppercase">
                            Atleta: {athletes.find(a => a.id === t.athleteId)?.nickname || athletes.find(a => a.id === t.athleteId)?.name || 'Desconhecido'}
                            {t.referenceMonth && ` • Ref: ${monthAbbr[parseInt(t.referenceMonth) - 1]}`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${
                      t.type === 'income' ? 'text-cyan-600' : 'text-red-600'
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
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none transition-all"
                  />
                </div>
                <button onClick={() => { setIsStatementModalOpen(false); setStatementSearchTerm(''); }} className="text-gray-400 hover:text-gray-600 p-2 cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200">
                  <PlusCircle className="h-6 w-6 rotate-45" />
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
                    .filter(t => 
                      (t.description?.toLowerCase().includes(statementSearchTerm.toLowerCase())) || 
                      (t.category?.toLowerCase().includes(statementSearchTerm.toLowerCase()))
                    )
                    .map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">{format(new Date(t.date + 'T12:00:00'), 'dd/MM/yyyy')}</td>
                        <td className="px-2 py-4 text-center">
                          {t.externalLink ? (
                            <a 
                              href={t.externalLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center p-1.5 bg-cyan-50 text-cyan-600 rounded-lg hover:bg-cyan-100 transition-colors border border-cyan-100"
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
                              <span className="text-[10px] text-cyan-600 font-bold uppercase">
                                Atleta: {athletes.find(a => a.id === t.athleteId)?.nickname || athletes.find(a => a.id === t.athleteId)?.name || 'Desconhecido'}
                                {t.referenceMonth && ` • Ref: ${monthAbbr[parseInt(t.referenceMonth) - 1]}`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${
                          t.type === 'income' ? 'text-cyan-600' : 'text-red-600'
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

      {/* Athletes Modal */}
      {/* Removed as per request */}

    </div>
  );
}
