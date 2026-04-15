'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { collection, query, onSnapshot, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  ArrowRight,
  LogOut,
  Settings,
  CheckCircle2,
  Search,
  FileText,
  PlusCircle,
  AlertCircle,
  PieChart as PieChartIcon
} from 'lucide-react';
import { format } from 'date-fns';
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
      setAthletes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubscribeTransactions();
      unsubscribeAthletes();
    };
  }, []);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const currentMonth = new Date().getMonth() + 1;

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
    .map(athlete => {
      const pendingMonths = [];
      for (let i = 1; i <= currentMonth; i++) {
        if (!athlete.paidMonths?.includes(i)) {
          pendingMonths.push(monthAbbr[i - 1]);
        }
      }
      return { ...athlete, pendingMonths };
    })
    .filter(a => a.pendingMonths.length >= 2)
    .sort((a, b) => a.pendingMonths.length - b.pendingMonths.length);

  const COLORS = ['#06b6d4', '#ef4444', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#8b5cf6'];

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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-cyan-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-cyan-500" />
              </div>
              <span className="text-xs font-medium text-cyan-500 bg-cyan-50 px-2 py-1 rounded-full">+12%</span>
            </div>
            <p className="text-sm font-medium text-gray-500">Total de Entradas</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">-5%</span>
            </div>
            <p className="text-sm font-medium text-gray-500">Total de Saídas</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-cyan-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">Saldo Atual</p>
            <h3 className={`text-2xl font-bold ${balance >= 0 ? 'text-cyan-600' : 'text-red-600'}`}>
              {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-black rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">Atletas Ativos</p>
            <h3 className="text-2xl font-bold text-gray-800">{athletes.length}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Expenses by Category Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <PieChartIcon className="h-5 w-5 mr-2 text-cyan-500" /> Saídas por Categoria
              </h3>
            </div>
            <div className="h-[300px] w-full">
              {expensesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {expensesByCategory.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => value ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
                  Nenhuma saída registrada.
                </div>
              )}
            </div>
          </div>

          {/* Critical Athletes List */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-red-500" /> Atletas Críticos
              </h3>
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                {criticalAthletes.length} Pendentes
              </span>
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {criticalAthletes.length > 0 ? (
                criticalAthletes.map((athlete: any) => (
                  <div key={athlete.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-red-100 transition-colors">
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
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm italic">
                  Nenhum atleta com pendências críticas.
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
