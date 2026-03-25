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
  PlusCircle,
  LogOut,
  Settings,
  PieChart as PieChartIcon,
  LayoutDashboard,
  CheckCircle2,
  Search,
  Trash2,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logout } from '@/firebase';

export default function Dashboard() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  const [statementSearchTerm, setStatementSearchTerm] = useState('');

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

  // Monthly data for chart
  const monthlyData = transactions.reduce((acc: any[], t) => {
    const month = format(new Date(t.date), 'MMM', { locale: ptBR });
    const existing = acc.find(d => d.month === month);
    if (existing) {
      if (t.type === 'income') existing.income += t.amount;
      else existing.expense += t.amount;
    } else {
      acc.push({ 
        month, 
        income: t.type === 'income' ? t.amount : 0, 
        expense: t.type === 'expense' ? t.amount : 0 
      });
    }
    return acc;
  }, []).reverse();

  // Category data for pie chart
  const categoryData = transactions.reduce((acc: any[], t) => {
    const existing = acc.find(d => d.name === t.category);
    if (existing) {
      existing.value += t.amount;
    } else {
      acc.push({ name: t.category, value: t.amount, type: t.type });
    }
    return acc;
  }, []);

  const COLORS = ['#0095ff', '#000000', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

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
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Image 
                src="/logo.png" 
                alt="Logo Baba das Seis" 
                width={195} 
                height={78} 
                className="h-16 w-auto mr-4"
                priority
              />
            </div>
            <div className="flex items-center space-x-4">
              {user && isAdmin ? (
                <>
                  <Link href="/admin" className="text-sm font-medium text-gray-600 hover:text-cyan-500 flex items-center">
                    <Settings className="h-4 w-4 mr-1" />
                    Painel
                  </Link>
                  <button 
                    onClick={() => logout()}
                    className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Sair
                  </button>
                </>
              ) : user ? (
                <button 
                  onClick={() => logout()}
                  className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sair
                </button>
              ) : (
                <Link href="/login" className="text-sm font-medium text-cyan-500 hover:text-cyan-600">
                  Entrar (Admin)
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
            <h1 className="text-3xl font-bold text-gray-800">Financeiro</h1>
            <p className="text-gray-500 mt-1">Resumo das finanças do grupo Baba das Seis</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center justify-center px-6 py-3 bg-cyan-500 text-white rounded-xl font-bold hover:bg-cyan-600 transition-all shadow-lg shadow-cyan-100"
            >
              <Users className="h-5 w-5 mr-2" /> Atletas
            </button>
            <button 
              onClick={() => setIsStatementModalOpen(true)}
              className="flex items-center justify-center px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-900 transition-all shadow-lg shadow-gray-200"
            >
              <FileText className="h-5 w-5 mr-2" /> Extrato
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-cyan-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-cyan-500" />
              </div>
              <span className="text-xs font-medium text-cyan-500 bg-cyan-50 px-2 py-1 rounded-full">+12%</span>
            </div>
            <p className="text-sm font-medium text-gray-500">Total de Entradas</p>
            <h3 className="text-2xl font-bold text-gray-800">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">-5%</span>
            </div>
            <p className="text-sm font-medium text-gray-500">Total de Saídas</p>
            <h3 className="text-2xl font-bold text-gray-800">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-cyan-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">Saldo Atual</p>
            <h3 className={`text-2xl font-bold ${balance >= 0 ? 'text-cyan-600' : 'text-red-600'}`}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-black rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">Atletas Ativos</p>
            <h3 className="text-2xl font-bold text-gray-800">{athletes.length}</h3>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Fluxo de Caixa Mensal</h3>
            <div className="h-80 min-h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(val) => `R$${val}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, '']}
                  />
                  <Bar dataKey="income" name="Entrada" fill="#0095ff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Saída" fill="#000000" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Distribuição por Categoria</h3>
            <div className="h-80 min-h-[320px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col space-y-2 ml-4">
                {categoryData.slice(0, 5).map((entry, index) => (
                  <div key={entry.name} className="flex items-center text-xs text-gray-600">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="truncate w-24">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Transações Recentes</h3>
            <button 
              onClick={() => setIsStatementModalOpen(true)}
              className="text-sm text-cyan-600 hover:text-cyan-700 font-medium flex items-center"
            >
              Ver todas <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Categoria</th>
                  <th className="px-6 py-4 font-medium">Descrição</th>
                  <th className="px-6 py-4 font-medium text-right">Valor</th>
                  {isAdmin && <th className="px-6 py-4 font-medium text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.slice(0, 5).map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">{format(new Date(t.date), 'dd/MM/yyyy')}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        t.type === 'income' ? 'bg-cyan-50 text-cyan-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {t.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">{t.description || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${
                      t.type === 'income' ? 'text-cyan-600' : 'text-red-600'
                    }`}>
                      {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="text-red-600 hover:text-red-800 p-1 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">Nenhuma transação encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Atletas Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Atletas - Pagamentos 2026</h3>
                <p className="text-sm text-gray-500">Status de mensalidades por atleta</p>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Filtrar por nome..."
                    value={reportSearchTerm}
                    onChange={(e) => setReportSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                  />
                </div>
                <button onClick={() => { setIsReportModalOpen(false); setReportSearchTerm(''); }} className="text-gray-400 hover:text-gray-600 p-2">
                  <PlusCircle className="h-6 w-6 rotate-45" />
                </button>
              </div>
            </div>
            
            <div className="overflow-auto p-6">
              <div className="min-w-full inline-block align-middle">
                <div className="border rounded-2xl overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Atleta</th>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                          <th key={m} className="px-2 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {format(new Date(2024, m - 1, 1), 'MMM', { locale: ptBR })}
                          </th>
                        ))}
                        {isAdmin && <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {athletes
                        .filter(a => 
                          (a.name?.toLowerCase().includes(reportSearchTerm.toLowerCase())) || 
                          (a.nickname?.toLowerCase().includes(reportSearchTerm.toLowerCase()))
                        )
                        .sort((a, b) => (a.nickname || a.name).localeCompare(b.nickname || b.name))
                        .map(athlete => (
                        <tr key={athlete.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800 sticky left-0 bg-white group-hover:bg-gray-50 border-r border-gray-100">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-cyan-50 text-cyan-700 flex items-center justify-center mr-3 text-xs font-bold">
                                {athlete.nickname?.substring(0, 2).toUpperCase()}
                              </div>
                              {athlete.nickname}
                            </div>
                          </td>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                            <td key={m} className="px-2 py-3 whitespace-nowrap text-center">
                              {athlete.paidMonths?.includes(m) ? (
                                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white shadow-sm">
                                  <CheckCircle2 className="h-4 w-4" />
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white shadow-sm">
                                  <PlusCircle className="h-4 w-4 opacity-20" />
                                </div>
                              )}
                            </td>
                          ))}
                          {isAdmin && (
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <button 
                                onClick={() => handleDeleteAthlete(athlete.id)}
                                className="text-red-600 hover:text-red-800 p-1 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <div className="flex space-x-4 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-gray-600">Pago</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                  <span className="text-gray-600">Pendente</span>
                </div>
              </div>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="px-6 py-2 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Statement Modal */}
      {isStatementModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Extrato</h3>
                <p className="text-sm text-gray-500">Histórico completo de entradas e saídas</p>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Filtrar descrição ou categoria..."
                    value={statementSearchTerm}
                    onChange={(e) => setStatementSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none transition-all"
                  />
                </div>
                <button onClick={() => { setIsStatementModalOpen(false); setStatementSearchTerm(''); }} className="text-gray-400 hover:text-gray-600 p-2">
                  <PlusCircle className="h-6 w-6 rotate-45" />
                </button>
              </div>
            </div>
            
            <div className="overflow-auto p-6">
              <div className="min-w-full inline-block align-middle">
                <div className="border rounded-2xl overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Categoria</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Descrição</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Valor</th>
                        {isAdmin && <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions
                        .filter(t => 
                          (t.description?.toLowerCase().includes(statementSearchTerm.toLowerCase())) || 
                          (t.category?.toLowerCase().includes(statementSearchTerm.toLowerCase()))
                        )
                        .map(t => (
                          <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{format(new Date(t.date), 'dd/MM/yyyy')}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                t.type === 'income' ? 'bg-cyan-50 text-cyan-700' : 'bg-red-50 text-red-700'
                              }`}>
                                {t.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-800">{t.description || '-'}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${
                              t.type === 'income' ? 'text-cyan-600' : 'text-red-600'
                            }`}>
                              {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            {isAdmin && (
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => handleDeleteTransaction(t.id)}
                                  className="text-red-600 hover:text-red-800 p-1 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setIsStatementModalOpen(false)}
                className="px-6 py-2 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
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
