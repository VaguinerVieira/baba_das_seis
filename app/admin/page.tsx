'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { normalizeGoogleDriveUrl } from '@/lib/utils';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  where,
  getDocs,
  Timestamp,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { db, logout } from '@/firebase';
import { 
  Users, 
  DollarSign, 
  Tag, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Save, 
  ChevronRight, 
  LayoutDashboard, 
  LogOut,
  AlertCircle,
  CheckCircle2,
  Search,
  Menu,
  MessageCircle,
  ExternalLink,
  FileSearch,
  BarChart3,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Download,
  Calculator,
  FileText
} from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const monthAbbr = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function AdminPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'athletes' | 'categories' | 'transactions' | 'reports'>('athletes');
  
  // Report states
  const [reportYear, setReportYear] = useState<string>('all');
  const [reportType, setReportType] = useState<'all' | 'income' | 'expense'>('all');
  const [reportSearchTerm, setReportSearchTerm] = useState<string>('');
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Data states
  const [athletes, setAthletes] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const enrichedTransactions = useMemo(() => {
    const sortedAsc = [...transactions].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      const getTimestampValue = (t: any) => {
        if (!t.createdAt) return 0;
        if (typeof t.createdAt.toMillis === 'function') return t.createdAt.toMillis();
        if (t.createdAt.seconds !== undefined) return t.createdAt.seconds * 1000 + (t.createdAt.nanoseconds || 0) / 1000000;
        if (t.createdAt instanceof Date) return t.createdAt.getTime();
        if (typeof t.createdAt === 'number') return t.createdAt;
        if (typeof t.createdAt === 'string') return new Date(t.createdAt).getTime();
        return 0;
      };
      return getTimestampValue(a) - getTimestampValue(b);
    });

    let running = 0;
    const balances: Record<string, number> = {};
    sortedAsc.forEach((t) => {
      if (t.type === 'income') {
        running += t.amount || 0;
      } else {
        running -= t.amount || 0;
      }
      balances[t.id] = running;
    });

    return transactions.map(t => ({
      ...t,
      runningBalance: balances[t.id] || 0
    }));
  }, [transactions]);
  const [categories, setCategories] = useState<any[]>([]);
  const [athleteSearchTerm, setAthleteSearchTerm] = useState('');

  const availableReportYears = useMemo(() => {
    const yearsSet = new Set<string>();
    transactions.forEach((t: any) => {
      if (t.date && typeof t.date === 'string' && t.date.length >= 4) {
        yearsSet.add(t.date.substring(0, 4));
      }
    });
    const currentYr = new Date().getFullYear().toString();
    yearsSet.add(currentYr);
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const reportData = useMemo(() => {
    const baseYearFiltered = enrichedTransactions.filter((t: any) => {
      return reportYear === 'all' || (t.date && t.date.startsWith(reportYear));
    });

    const totalIncome = baseYearFiltered
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    const athleteIncome = baseYearFiltered
      .filter((t: any) => t.type === 'income' && (t.isMonthlyFee || t.athleteId))
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    const otherIncome = totalIncome - athleteIncome;

    const totalExpense = baseYearFiltered
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    const netBalance = totalIncome - totalExpense;

    const incomeCount = baseYearFiltered.filter((t: any) => t.type === 'income').length;
    const expenseCount = baseYearFiltered.filter((t: any) => t.type === 'expense').length;
    const athleteFeeCount = baseYearFiltered.filter((t: any) => t.type === 'income' && (t.isMonthlyFee || t.athleteId)).length;

    // Filtered list for detailed report table
    const filteredList = baseYearFiltered.filter((t: any) => {
      const typeMatch = reportType === 'all' || t.type === reportType;
      const searchLower = reportSearchTerm.toLowerCase();
      const athlete = athletes.find((a: any) => a.id === t.athleteId);
      const athleteName = athlete ? `${athlete.name} ${athlete.nickname}`.toLowerCase() : '';
      const searchMatch = !reportSearchTerm || 
        (t.description || '').toLowerCase().includes(searchLower) ||
        (t.category || '').toLowerCase().includes(searchLower) ||
        athleteName.includes(searchLower);

      return typeMatch && searchMatch;
    });

    // Category breakdown
    const incomeCatMap: Record<string, number> = {};
    const expenseCatMap: Record<string, number> = {};

    baseYearFiltered.forEach((t: any) => {
      if (t.type === 'income') {
        const cat = (t.category || (t.isMonthlyFee ? 'Mensalidades' : 'Outras Entradas')).trim();
        incomeCatMap[cat] = (incomeCatMap[cat] || 0) + (t.amount || 0);
      } else {
        const cat = (t.category || 'Outras Saídas').trim();
        expenseCatMap[cat] = (expenseCatMap[cat] || 0) + (t.amount || 0);
      }
    });

    const incomeCatList = Object.entries(incomeCatMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    const expenseCatList = Object.entries(expenseCatMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      filteredList,
      totalIncome,
      athleteIncome,
      otherIncome,
      totalExpense,
      netBalance,
      incomeCount,
      expenseCount,
      athleteFeeCount,
      incomeCatList,
      expenseCatList
    };
  }, [enrichedTransactions, reportYear, reportType, reportSearchTerm, athletes]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin) {
        router.push('/login');
      }
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (!user) return;

    const unsubAthletes = onSnapshot(query(collection(db, 'athletes'), orderBy('name')), (snap) => {
      const data = snap.docs.map(doc => {
        const rawData: any = { id: doc.id, ...doc.data() };
        if (rawData.photoUrl) {
          rawData.photoUrl = normalizeGoogleDriveUrl(rawData.photoUrl);
        }
        return rawData;
      });
      setAthletes(data);
    });

    const unsubTransactions = onSnapshot(query(collection(db, 'transactions'), orderBy('date', 'desc'), orderBy('createdAt', 'desc')), (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubCategories = onSnapshot(query(collection(db, 'categories'), orderBy('name')), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubAthletes();
      unsubTransactions();
      unsubCategories();
    };
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const collectionName = activeTab;
      
      // Duplicate number check for athletes
      if (activeTab === 'athletes') {
        const isDuplicate = athletes.some(a => 
          a.number === formData.number && a.id !== editingItem?.id
        );
        if (isDuplicate) {
          alert(`O número ${formData.number} já está em uso por outro atleta!`);
          return;
        }
      }

      if (editingItem) {
        await updateDoc(doc(db, collectionName, editingItem.id), formData);
      } else {
        await addDoc(collection(db, collectionName), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }

      // Auto-mark month as paid if it's a monthly fee
      if (activeTab === 'transactions' && formData.isMonthlyFee && formData.athleteId && formData.referenceMonth) {
        await updateDoc(doc(db, 'athletes', formData.athleteId), {
          paidMonths: arrayUnion(parseInt(formData.referenceMonth))
        });
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({});
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleDelete = async (id: string, collectionName: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const amount = Number(value) / 100;
    setFormData({ ...formData, amount });
  };

  const openModal = (item: any = null) => {
    setEditingItem(item);
    if (item) {
      setFormData(item);
    } else {
      // Default values
      if (activeTab === 'athletes') {
        setFormData({ name: '', nickname: '', number: '', birthdayDay: 1, birthdayMonth: 1, photoUrl: '', whatsapp: '', uniformSize: 'M', paidMonths: [], isBoardMember: false, isExempt: false, status: 'Ativo', entryDate: '' });
      } else if (activeTab === 'transactions') {
        setFormData({ type: 'income', category: 'mensalidade', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), description: '', isMonthlyFee: false, athleteId: '', referenceMonth: '', externalLink: '' });
      } else if (activeTab === 'categories') {
        setFormData({ name: '', type: 'income' });
      }
    }
    setIsModalOpen(true);
  };

  if (authLoading || !user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className={`md:hidden bg-white border-b border-gray-200 flex flex-col items-center sticky top-0 z-30 transition-all duration-300 ${scrolled ? 'p-2 pt-2' : 'p-4 pt-[20px]'}`}>
        <div className={`w-full flex justify-between items-center transition-all duration-300 ${scrolled ? 'mb-0' : 'mb-4'}`}>
          <div className="w-10"></div> {/* Spacer */}
          <div className="flex flex-col items-center">
            <Image 
              src="https://drive.google.com/uc?id=1sDOSLfcrEqrfhcVEMSDrQGLAnnD0p-b6" 
              alt="Logo Baba das Seis" 
              width={320} 
              height={128} 
              className={`w-auto transition-all duration-300 ${scrolled ? 'h-10' : 'h-24'}`}
              priority
              referrerPolicy="no-referrer"
            />
            <span className={`text-cyan-600 font-bold text-lg transition-all duration-300 overflow-hidden ${scrolled ? 'h-0 opacity-0 mt-0' : 'h-auto opacity-100 mt-2'}`}>Gestão Financeira</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`w-64 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen z-40 transition-all duration-300 ${isMobileMenuOpen ? 'fixed inset-y-0 left-0 flex shadow-2xl' : 'hidden md:flex'}`}>
        <div className="p-6 border-b border-gray-200 hidden md:flex items-center justify-center">
          <Image 
            src="https://drive.google.com/uc?id=1sDOSLfcrEqrfhcVEMSDrQGLAnnD0p-b6" 
            alt="Logo Baba das Seis" 
            width={480} 
            height={192} 
            className="h-40 w-auto"
            priority
            referrerPolicy="no-referrer"
          />
        </div>
        <nav className="flex-1 p-4 space-y-2">
            <button 
              onClick={() => {
                setActiveTab('athletes');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer hover:scale-105 active:scale-95 duration-200 ${activeTab === 'athletes' ? 'bg-cyan-50 text-cyan-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Users className="h-5 w-5 mr-3" /> Atletas
            </button>
            <button 
              onClick={() => {
                setActiveTab('categories');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer hover:scale-105 active:scale-95 duration-200 ${activeTab === 'categories' ? 'bg-cyan-50 text-cyan-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Tag className="h-5 w-5 mr-3" /> Categorias
            </button>
            <button 
              onClick={() => {
                setActiveTab('transactions');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer hover:scale-105 active:scale-95 duration-200 ${activeTab === 'transactions' ? 'bg-cyan-50 text-cyan-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <DollarSign className="h-5 w-5 mr-3" /> Transações
            </button>
            <button 
              onClick={() => {
                setActiveTab('reports');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer hover:scale-105 active:scale-95 duration-200 ${activeTab === 'reports' ? 'bg-cyan-50 text-cyan-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <BarChart3 className="h-5 w-5 mr-3 text-cyan-600" /> Relatórios
            </button>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={() => logout()}
            className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all cursor-pointer hover:scale-105 active:scale-95 duration-200"
          >
            <LogOut className="h-5 w-5 mr-3" /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center sticky top-0 z-20 gap-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 capitalize">
            {activeTab === 'athletes' && 'Gerenciar Atletas'}
            {activeTab === 'transactions' && 'Gerenciar Transações'}
            {activeTab === 'categories' && 'Gerenciar Categorias'}
            {activeTab === 'reports' && 'Relatórios e Balanço Financeiro'}
          </h2>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 items-stretch sm:items-center w-full sm:w-auto">
            {activeTab === 'athletes' && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Buscar atleta..."
                  value={athleteSearchTerm}
                  onChange={(e) => setAthleteSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                />
              </div>
            )}
            <div className="flex space-x-3">
              <button 
                onClick={() => router.push('/')}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 active:scale-95 duration-200"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
              </button>
              {activeTab === 'reports' ? (
                <button 
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-none bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center hover:bg-cyan-700 transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95 duration-200"
                >
                  <Printer className="h-4 w-4 mr-2" /> Exportar PDF
                </button>
              ) : (
                <button 
                  onClick={() => openModal()}
                  className="flex-1 sm:flex-none bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center hover:bg-cyan-600 transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95 duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" /> Novo
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8">
          {/* Content based on activeTab */}
          {activeTab === 'reports' ? (
            <div className="space-y-6 printable-report">
              {/* Print CSS rules */}
              <style>{`
                @media print {
                  body {
                    background-color: white !important;
                    color: black !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  aside, header, nav, button {
                    display: none !important;
                  }
                  main {
                    padding: 0 !important;
                    margin: 0 !important;
                    overflow: visible !important;
                  }
                  .printable-report {
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  .print-header {
                    display: block !important;
                  }
                  .print-shadow-none {
                    box-shadow: none !important;
                    border: 1px solid #e5e7eb !important;
                  }
                }
              `}</style>

              {/* Printable Header - Visible when printing */}
              <div className="hidden print-header mb-6 pb-4 border-b border-gray-300">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">BABA DAS SEIS</h1>
                    <p className="text-sm text-gray-600">Relatório e Balanço Financeiro Geral</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>Gerado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    <p>Filtro Ano: {reportYear === 'all' ? 'Todos os Anos' : reportYear}</p>
                  </div>
                </div>
              </div>

              {/* Controls and Filter Bar */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  {/* Year Filter */}
                  <div className="flex items-center space-x-2 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-200">
                    <Calendar className="h-4 w-4 text-cyan-600" />
                    <span className="text-xs font-bold text-gray-500 uppercase">Ano:</span>
                    <select 
                      value={reportYear}
                      onChange={(e) => setReportYear(e.target.value)}
                      className="bg-transparent text-sm font-bold text-gray-800 outline-none cursor-pointer"
                    >
                      <option value="all">Todos os Anos</option>
                      {availableReportYears.map(yr => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>

                  {/* Type Filter */}
                  <div className="flex items-center space-x-2 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-200">
                    <Filter className="h-4 w-4 text-cyan-600" />
                    <span className="text-xs font-bold text-gray-500 uppercase">Tipo:</span>
                    <select 
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value as any)}
                      className="bg-transparent text-sm font-bold text-gray-800 outline-none cursor-pointer"
                    >
                      <option value="all">Todas as Transações</option>
                      <option value="income">Apenas Entradas</option>
                      <option value="expense">Apenas Saídas</option>
                    </select>
                  </div>

                  {/* Search */}
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Buscar por descrição, atleta ou categoria..."
                      value={reportSearchTerm}
                      onChange={(e) => setReportSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <button 
                  onClick={() => window.print()}
                  className="w-full md:w-auto bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 active:scale-95 duration-200"
                >
                  <Printer className="h-4 w-4 mr-2" /> Exportar PDF
                </button>
              </div>

              {/* Balanço / KPI Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Entradas */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 print-shadow-none relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Entradas Totais</span>
                    <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <ArrowUpRight className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-emerald-600">
                    R$ {reportData.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2 font-medium">
                    {reportData.incomeCount} lançamentos de entrada
                  </p>
                </div>

                {/* Entradas Atletas (Somadas/Integral) */}
                <div className="bg-gradient-to-br from-cyan-900 to-[#002874] text-white p-6 rounded-2xl shadow-md print-shadow-none relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-cyan-200 uppercase tracking-wider">Mensalidades Atletas (Integral)</span>
                    <span className="p-2 bg-white/10 text-cyan-300 rounded-xl backdrop-blur-sm">
                      <Users className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white">
                    R$ {reportData.athleteIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-cyan-200/90 mt-2 font-medium">
                    {reportData.athleteFeeCount} mensalidades somadas
                  </p>
                </div>

                {/* Total Saídas */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 print-shadow-none relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Saídas Totais</span>
                    <span className="p-2 bg-red-50 text-red-600 rounded-xl">
                      <ArrowDownRight className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-red-600">
                    R$ {reportData.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2 font-medium">
                    {reportData.expenseCount} lançamentos de saída
                  </p>
                </div>

                {/* Balanço Líquido */}
                <div className={`p-6 rounded-2xl shadow-sm border print-shadow-none relative overflow-hidden ${
                  reportData.netBalance >= 0 
                    ? 'bg-emerald-50/50 border-emerald-200' 
                    : 'bg-red-50/50 border-red-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Balanço Final (Saldo)</span>
                    <span className={`p-2 rounded-xl ${
                      reportData.netBalance >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      <Calculator className="h-5 w-5" />
                    </span>
                  </div>
                  <div className={`text-2xl font-black ${
                    reportData.netBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    R$ {reportData.netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className={`text-[11px] mt-2 font-bold uppercase tracking-wider ${
                    reportData.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {reportData.netBalance >= 0 ? 'Superávit Acumulado' : 'Déficit Acumulado'}
                  </p>
                </div>
              </div>

              {/* Resumo por Categoria */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Entradas por Categoria */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 print-shadow-none">
                  <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-emerald-600" /> Detalhamento de Entradas por Categoria
                  </h3>
                  <div className="space-y-3">
                    {reportData.incomeCatList.map((item) => (
                      <div key={item.category} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-gray-700">
                          <span className="capitalize">{item.category}</span>
                          <span>R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({item.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, item.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {reportData.incomeCatList.length === 0 && (
                      <p className="text-xs text-gray-400 italic">Nenhuma entrada cadastrada no período.</p>
                    )}
                  </div>
                </div>

                {/* Saídas por Categoria */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 print-shadow-none">
                  <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center">
                    <TrendingDown className="h-5 w-5 mr-2 text-red-600" /> Detalhamento de Saídas por Categoria
                  </h3>
                  <div className="space-y-3">
                    {reportData.expenseCatList.map((item) => (
                      <div key={item.category} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-gray-700">
                          <span className="capitalize">{item.category}</span>
                          <span>R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({item.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-red-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, item.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {reportData.expenseCatList.length === 0 && (
                      <p className="text-xs text-gray-400 italic">Nenhuma saída cadastrada no período.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista Detalhada de Transações (Entradas e Saídas) */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 print-shadow-none overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Extrato Consolidado de Transações</h3>
                    <p className="text-xs text-gray-500">Listagem de todas as entradas e saídas registradas ({reportData.filteredList.length} itens)</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[700px] sm:min-w-full">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                        <th className="px-6 py-4 font-medium">Data</th>
                        <th className="px-4 py-4 font-medium">Tipo</th>
                        <th className="px-6 py-4 font-medium">Descrição / Atleta</th>
                        <th className="px-6 py-4 font-medium">Categoria</th>
                        <th className="px-6 py-4 font-medium text-right">Valor</th>
                        <th className="px-6 py-4 font-medium text-right">Saldo Acumulado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportData.filteredList.map((t: any) => {
                        const athlete = athletes.find((a: any) => a.id === t.athleteId);
                        return (
                          <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                              {format(new Date(t.date + 'T12:00:00'), 'dd/MM/yyyy')}
                            </td>
                            <td className="px-4 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                t.type === 'income' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : 'bg-red-50 text-red-700 border border-red-100'
                              }`}>
                                {t.type === 'income' ? 'Entrada' : 'Saída'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="flex flex-col">
                                <span className="font-semibold">{t.description || '-'}</span>
                                {t.isMonthlyFee && athlete && (
                                  <span className="text-[10px] text-cyan-600 font-bold uppercase">
                                    Atleta: {athlete.nickname || athlete.name}
                                    {t.referenceMonth && ` • Ref: ${monthAbbr[parseInt(t.referenceMonth) - 1]}`}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                              {t.category || (t.isMonthlyFee ? 'Mensalidade' : '-')}
                            </td>
                            <td className={`px-6 py-4 text-sm font-bold text-right ${
                              t.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {t.type === 'income' ? '+' : '-'} R$ {(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`px-6 py-4 text-sm font-bold text-right ${
                              (t.runningBalance || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              R$ {(t.runningBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                      {reportData.filteredList.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                            Nenhuma transação encontrada com os filtros selecionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px] sm:min-w-full">
                {activeTab === 'athletes' && (
                  <>
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-medium">Foto</th>
                        <th className="px-6 py-4 font-medium">Nome</th>
                        <th className="px-6 py-4 font-medium">Apelido</th>
                        <th className="px-6 py-4 font-medium">Aniversário</th>
                        <th className="px-6 py-4 font-medium">WhatsApp</th>
                        <th className="px-6 py-4 font-medium">Meses Pagos</th>
                        <th className="px-6 py-4 font-medium text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {athletes
                        .filter(a => 
                          a.name?.toLowerCase().includes(athleteSearchTerm.toLowerCase()) || 
                          a.nickname?.toLowerCase().includes(athleteSearchTerm.toLowerCase())
                        )
                        .map(a => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            {a.photoUrl ? (
                              <div className="relative h-10 w-10 rounded-full overflow-hidden border border-gray-200">
                                <Image 
                                  src={a.photoUrl} 
                                  alt={a.nickname} 
                                  fill
                                  className="object-cover" 
                                  referrerPolicy="no-referrer" 
                                />
                              </div>
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                <Users className="h-5 w-5" />
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-800 flex items-center">
                                {a.name}
                                {a.isBoardMember && (
                                  <span className="ml-2 px-1.5 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] font-bold rounded uppercase tracking-wider">
                                    Diretoria
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{a.nickname}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{a.birthdayDay}/{monthAbbr[a.birthdayMonth - 1]}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {a.whatsapp ? (
                              <a 
                                href={`https://wa.me/${a.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-700 flex items-center transition-colors font-medium"
                              >
                                <svg className="h-5 w-5 mr-1.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                                {a.whatsapp}
                              </a>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="grid grid-cols-6 gap-1 w-fit">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                                const isPaid = a.paidMonths?.includes(m);
                                return (
                                  <div 
                                    key={m} 
                                    className={`flex flex-col items-center p-1 rounded-lg border transition-all ${isPaid ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100 opacity-40'}`}
                                    title={monthAbbr[m - 1]}
                                  >
                                    <span className={`text-[8px] font-bold uppercase mb-0.5 ${isPaid ? 'text-green-700' : 'text-gray-400'}`}>{monthAbbr[m - 1]}</span>
                                    {isPaid ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                    ) : (
                                      <div className="h-3.5 w-3.5 rounded-full border border-gray-200" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => openModal(a)} className="text-cyan-600 hover:text-cyan-800 cursor-pointer hover:scale-125 active:scale-90 transition-all duration-200"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(a.id, 'athletes')} className="text-red-600 hover:text-red-800 cursor-pointer hover:scale-125 active:scale-90 transition-all duration-200"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {activeTab === 'transactions' && (
                  <>
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-medium">Data</th>
                        <th className="px-2 py-4 font-medium text-center w-16">CP</th>
                        <th className="px-6 py-4 font-medium">Descrição</th>
                        <th className="px-6 py-4 font-medium text-right">Valor</th>
                        <th className="px-6 py-4 font-medium text-right">Saldo</th>
                        <th className="px-6 py-4 font-medium text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {enrichedTransactions.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-600">{format(new Date(t.date + 'T12:00:00'), 'dd/MM/yyyy')}</td>
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
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="flex flex-col">
                              <span>{t.description}</span>
                              {t.isMonthlyFee && t.athleteId && (
                                <span className="text-[10px] text-cyan-600 font-bold uppercase">
                                  Atleta: {athletes.find(a => a.id === t.athleteId)?.nickname || athletes.find(a => a.id === t.athleteId)?.name || 'Desconhecido'}
                                  {t.referenceMonth && ` • Ref: ${monthAbbr[parseInt(t.referenceMonth) - 1]}`}
                                </span>
                              )}
                              {t.externalLink && (
                                <a 
                                  href={t.externalLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-cyan-600 font-bold uppercase flex items-center hover:underline mt-1"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" /> Ver Comprovante
                                </a>
                              )}
                            </div>
                          </td>
                          <td className={`px-6 py-4 text-sm font-bold text-right ${t.type === 'income' ? 'text-cyan-600' : 'text-red-600'}`}>
                            {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`px-6 py-4 text-sm font-bold text-right ${t.runningBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {t.runningBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => openModal(t)} className="text-cyan-600 hover:text-cyan-800 cursor-pointer hover:scale-125 active:scale-90 transition-all duration-200"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(t.id, 'transactions')} className="text-red-600 hover:text-red-800 cursor-pointer hover:scale-125 active:scale-90 transition-all duration-200"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {activeTab === 'categories' && (
                  <>
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-medium">Nome</th>
                        <th className="px-6 py-4 font-medium">Tipo</th>
                        <th className="px-6 py-4 font-medium text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {categories.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 capitalize">{c.type === 'income' ? 'Entrada' : 'Saída'}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => openModal(c)} className="text-cyan-600 hover:text-cyan-800 cursor-pointer hover:scale-125 active:scale-90 transition-all duration-200"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(c.id, 'categories')} className="text-red-600 hover:text-red-800 cursor-pointer hover:scale-125 active:scale-90 transition-all duration-200"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

              </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">
                {editingItem ? 'Editar' : 'Novo'} {activeTab === 'athletes' ? 'Atleta' : activeTab === 'transactions' ? 'Transação' : 'Categoria'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto flex-1">
              {activeTab === 'athletes' && (
                <>
                  {/* Visualização da Foto no Topo Centro */}
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="relative w-28 h-28 rounded-full border-4 border-cyan-500/20 overflow-hidden bg-gray-100 flex items-center justify-center shadow-md">
                      {formData.photoUrl ? (
                        <Image 
                          src={formData.photoUrl} 
                          alt={formData.nickname || formData.name || "Foto do Atleta"}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Users className="h-12 w-12 text-gray-300" />
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 mt-2 uppercase tracking-wider">
                      {formData.nickname || "Foto do Atleta"}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nome Completo</label>
                    <input 
                      type="text" required value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Apelido</label>
                      <input 
                        type="text" required value={formData.nickname || ''} 
                        onChange={e => setFormData({...formData, nickname: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Número</label>
                      <input 
                        type="number" required value={formData.number || ''} 
                        onChange={e => setFormData({...formData, number: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Dia Nasc.</label>
                      <select 
                        required value={formData.birthdayDay || 1} 
                        onChange={e => setFormData({...formData, birthdayDay: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mês Nasc.</label>
                      <select 
                        required value={formData.birthdayMonth || 1} 
                        onChange={e => setFormData({...formData, birthdayMonth: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                      >
                        {monthAbbr.map((abbr, i) => (
                          <option key={i} value={i + 1}>{abbr}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tamanho Uniforme</label>
                      <select 
                        required value={formData.uniformSize || 'M'} 
                        onChange={e => setFormData({...formData, uniformSize: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                      >
                        <option value="P">P</option>
                        <option value="M">M</option>
                        <option value="G">G</option>
                        <option value="GG">GG</option>
                        <option value="XG">XG</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Status</label>
                      <select 
                        required value={formData.status || 'Ativo'} 
                        onChange={e => setFormData({...formData, status: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                        <option value="Afastado">Afastado</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">URL da Foto</label>
                      <input 
                        type="url" value={formData.photoUrl || ''} 
                        onChange={e => setFormData({...formData, photoUrl: e.target.value})}
                        placeholder="https://exemplo.com/foto.jpg"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Desde (Data de Entrada)</label>
                      <input 
                        type="date" value={formData.entryDate || ''} 
                        onChange={e => setFormData({...formData, entryDate: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">WhatsApp</label>
                    <input 
                      type="text" value={formData.whatsapp || ''} 
                      onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                      placeholder="(00) 00000-0000"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Meses Pagos (2026)</label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                        <label key={m} className="flex items-center space-x-2 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            checked={!!formData.paidMonths?.includes(m)} 
                            onChange={e => {
                              const current = formData.paidMonths || [];
                              if (e.target.checked) {
                                setFormData({...formData, paidMonths: [...current, m]});
                              } else {
                                setFormData({...formData, paidMonths: current.filter((month: number) => month !== m)});
                              }
                            }}
                            className="rounded text-cyan-600 focus:ring-cyan-500"
                          />
                          <span className="text-xs text-gray-600">{monthAbbr[m - 1]}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                        <label className="block text-sm font-bold text-gray-800">Diretoria?</label>
                        <p className="text-xs text-gray-500">Membro da diretoria</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, isBoardMember: !formData.isBoardMember})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.isBoardMember ? 'bg-cyan-500' : 'bg-gray-200'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isBoardMember ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                        <label className="block text-sm font-bold text-gray-800">Novo?</label>
                        <p className="text-xs text-gray-500">Atleta novato</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, isNew: !formData.isNew})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.isNew ? 'bg-cyan-500' : 'bg-gray-200'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isNew ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                        <label className="block text-sm font-bold text-gray-800">Isento?</label>
                        <p className="text-xs text-gray-500">Isento de mensalidades</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, isExempt: !formData.isExempt})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.isExempt ? 'bg-cyan-500' : 'bg-gray-200'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isExempt ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'transactions' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tipo</label>
                      <select 
                        value={formData.type || 'income'} 
                        onChange={e => setFormData({...formData, type: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                      >
                        <option value="income">Entrada</option>
                        <option value="expense">Saída</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Categoria</label>
                      <select 
                        value={formData.category || ''} 
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                      >
                        {categories.filter(c => c.type === formData.type).map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                        <option value="mensalidade">Mensalidade</option>
                        <option value="Material Esportivo">Material Esportivo</option>
                        <option value="Resenha">Resenha</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mensalidade?</label>
                      <div className="flex items-center space-x-4 py-2">
                        <label className="flex items-center cursor-pointer group">
                          <input 
                            type="radio" 
                            name="isMonthlyFee" 
                            checked={formData.isMonthlyFee === true}
                            onChange={() => setFormData({...formData, isMonthlyFee: true, category: 'mensalidade'})}
                            className="w-4 h-4 text-cyan-600 border-gray-300 focus:ring-cyan-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 group-hover:text-cyan-600 transition-colors">Sim</span>
                        </label>
                        <label className="flex items-center cursor-pointer group">
                          <input 
                            type="radio" 
                            name="isMonthlyFee" 
                            checked={formData.isMonthlyFee === false}
                            onChange={() => setFormData({...formData, isMonthlyFee: false, athleteId: ''})}
                            className="w-4 h-4 text-cyan-600 border-gray-300 focus:ring-cyan-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 group-hover:text-cyan-600 transition-colors">Não</span>
                        </label>
                      </div>
                    </div>
                    {formData.isMonthlyFee && (
                      <div className="grid grid-cols-2 gap-4 col-span-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Atleta</label>
                          <select 
                            required={formData.isMonthlyFee}
                            value={formData.athleteId || ''} 
                            onChange={e => setFormData({...formData, athleteId: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                          >
                            <option value="">Selecionar Atleta</option>
                            {athletes.map(a => (
                              <option key={a.id} value={a.id}>{a.nickname || a.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mês Referência</label>
                          <select 
                            required={formData.isMonthlyFee}
                            value={formData.referenceMonth || ''} 
                            onChange={e => setFormData({...formData, referenceMonth: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                          >
                            <option value="">Selecionar Mês</option>
                            {monthAbbr.map((abbr, i) => (
                              <option key={i} value={i + 1}>{abbr}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Valor (R$)</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.amount !== undefined ? formatCurrency(formData.amount) : ''} 
                        onChange={handleCurrencyChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                        placeholder="R$ 0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Data</label>
                      <input 
                        type="date" required value={formData.date || ''} 
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descrição</label>
                    <textarea 
                      value={formData.description || ''} 
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all h-24"
                    />
                  </div>
                  {formData.type === 'expense' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Link Externo (Comprovante)</label>
                      <input 
                        type="url" 
                        value={formData.externalLink || ''} 
                        onChange={e => setFormData({...formData, externalLink: e.target.value})}
                        placeholder="https://exemplo.com/comprovante"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  )}
                </>
              )}

              {activeTab === 'categories' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nome da Categoria</label>
                    <input 
                      type="text" required value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tipo</label>
                    <select 
                      value={formData.type || 'income'} 
                      onChange={e => setFormData({...formData, type: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                    >
                      <option value="income">Entrada</option>
                      <option value="expense">Saída</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex space-x-4 pt-4">
                {editingItem && (
                  <button 
                    type="button" 
                    onClick={() => {
                      handleDelete(editingItem.id, activeTab);
                      setIsModalOpen(false);
                    }}
                    className="px-6 py-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 duration-200"
                  >
                    <Trash2 className="h-5 w-5 mr-2" /> Excluir
                  </button>
                )}
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all cursor-pointer hover:scale-105 active:scale-95 duration-200"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-xl bg-cyan-500 text-white font-bold hover:bg-cyan-600 transition-all shadow-lg shadow-cyan-100 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 duration-200"
                >
                  <Save className="h-5 w-5 mr-2" /> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
