'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
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
  serverTimestamp
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
  Search
} from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'athletes' | 'transactions' | 'categories'>('athletes');
  
  // Data states
  const [athletes, setAthletes] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [athleteSearchTerm, setAthleteSearchTerm] = useState('');
  
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
      setAthletes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
      if (editingItem) {
        await updateDoc(doc(db, collectionName, editingItem.id), formData);
      } else {
        await addDoc(collection(db, collectionName), {
          ...formData,
          createdAt: serverTimestamp()
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

  const openModal = (item: any = null) => {
    setEditingItem(item);
    if (item) {
      setFormData(item);
    } else {
      // Default values
      if (activeTab === 'athletes') {
        setFormData({ name: '', nickname: '', number: '', birthdayDay: 1, birthdayMonth: 1, photoUrl: '', uniformSize: 'M', paidMonths: [] });
      } else if (activeTab === 'transactions') {
        setFormData({ type: 'income', category: 'mensalidade', amount: 0, date: new Date().toISOString().split('T')[0], description: '' });
      } else if (activeTab === 'categories') {
        setFormData({ name: '', type: 'income' });
      }
    }
    setIsModalOpen(true);
  };

  if (authLoading || !user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-200 flex items-center justify-center">
          <Image 
            src="/logo.png" 
            alt="Logo Baba das Seis" 
            width={195} 
            height={78} 
            className="h-16 w-auto"
            priority
          />
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('athletes')}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'athletes' ? 'bg-cyan-50 text-cyan-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Users className="h-5 w-5 mr-3" /> Atletas
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'categories' ? 'bg-cyan-50 text-cyan-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Tag className="h-5 w-5 mr-3" /> Categorias
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'bg-cyan-50 text-cyan-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <DollarSign className="h-5 w-5 mr-3" /> Transações
          </button>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={() => logout()}
            className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 p-6 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900 capitalize">
            {activeTab === 'athletes' && 'Gerenciar Atletas'}
            {activeTab === 'transactions' && 'Gerenciar Transações'}
            {activeTab === 'categories' && 'Gerenciar Categorias'}
          </h2>
          <div className="flex space-x-3 items-center">
            {activeTab === 'athletes' && (
              <div className="relative w-64">
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
            <button 
              onClick={() => router.push('/')}
              className="px-4 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center shadow-sm"
            >
              <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
            </button>
            <button 
              onClick={() => openModal()}
              className="bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center hover:bg-cyan-600 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" /> Novo
            </button>
          </div>
        </header>

        <div className="p-8">
          {/* Content based on activeTab */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              {activeTab === 'athletes' && (
                <>
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-medium">Foto</th>
                      <th className="px-6 py-4 font-medium">Nome</th>
                      <th className="px-6 py-4 font-medium">Apelido</th>
                      <th className="px-6 py-4 font-medium">Número</th>
                      <th className="px-6 py-4 font-medium">Tam.</th>
                      <th className="px-6 py-4 font-medium">Aniversário</th>
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
                            <div className="h-10 w-10 rounded-full overflow-hidden border border-gray-200">
                              <img src={a.photoUrl} alt={a.nickname} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                              <Users className="h-5 w-5" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">{a.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{a.nickname}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{a.number}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{a.uniformSize || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{a.birthdayDay}/{a.birthdayMonth}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                              <div 
                                key={m} 
                                className={`w-4 h-4 rounded-full text-[8px] flex items-center justify-center ${a.paidMonths?.includes(m) ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                                title={format(new Date(2024, m - 1, 1), 'MMMM', { locale: ptBR })}
                              >
                                {m}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => openModal(a)} className="text-cyan-600 hover:text-cyan-800"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(a.id, 'athletes')} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
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
                      <th className="px-6 py-4 font-medium">Categoria</th>
                      <th className="px-6 py-4 font-medium">Descrição</th>
                      <th className="px-6 py-4 font-medium text-right">Valor</th>
                      <th className="px-6 py-4 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">{format(new Date(t.date), 'dd/MM/yyyy')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-cyan-50 text-cyan-700' : 'bg-red-50 text-red-700'}`}>
                            {t.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{t.description}</td>
                        <td className={`px-6 py-4 text-sm font-bold text-right ${t.type === 'income' ? 'text-cyan-600' : 'text-red-600'}`}>
                          R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => openModal(t)} className="text-cyan-600 hover:text-cyan-800"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(t.id, 'transactions')} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
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
                          <button onClick={() => openModal(c)} className="text-cyan-600 hover:text-cyan-800"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(c.id, 'categories')} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

            </table>
          </div>
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">
                {editingItem ? 'Editar' : 'Novo'} {activeTab === 'athletes' ? 'Atleta' : activeTab === 'transactions' ? 'Transação' : 'Categoria'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              {activeTab === 'athletes' && (
                <>
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
                      <input 
                        type="number" min="1" max="31" required value={formData.birthdayDay || ''} 
                        onChange={e => setFormData({...formData, birthdayDay: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mês Nasc.</label>
                      <input 
                        type="number" min="1" max="12" required value={formData.birthdayMonth || ''} 
                        onChange={e => setFormData({...formData, birthdayMonth: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                      />
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
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">URL da Foto</label>
                      <input 
                        type="url" value={formData.photoUrl || ''} 
                        onChange={e => setFormData({...formData, photoUrl: e.target.value})}
                        placeholder="https://exemplo.com/foto.jpg"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
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
                          <span className="text-xs text-gray-600">{format(new Date(2024, m - 1, 1), 'MMM', { locale: ptBR })}</span>
                        </label>
                      ))}
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
                        <option value="Material Esportivos">Material Esportivos</option>
                        <option value="Resenha">Resenha</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Valor (R$)</label>
                      <input 
                        type="number" step="0.01" required value={formData.amount || ''} 
                        onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
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
                    className="px-6 py-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-all flex items-center justify-center"
                  >
                    <Trash2 className="h-5 w-5 mr-2" /> Excluir
                  </button>
                )}
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-xl bg-cyan-500 text-white font-bold hover:bg-cyan-600 transition-all shadow-lg shadow-cyan-100 flex items-center justify-center"
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
