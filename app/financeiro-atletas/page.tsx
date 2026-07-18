'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  setDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ArrowLeft, 
  Search, 
  Edit2, 
  Check, 
  X, 
  User, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  Shirt,
  Hash,
  Save,
  CheckCircle2,
  Lock,
  FileSpreadsheet,
  ArrowUpDown
} from 'lucide-react';
import { normalizeGoogleDriveUrl } from '@/lib/utils';

interface Athlete {
  id: string;
  name: string;
  nickname?: string;
  number?: string | number;
  uniformSize?: string;
  status?: string;
  photoUrl?: string;
}

interface AthleteFinance {
  athleteId: string;
  devido: number;
  pago: number;
  pendente: number;
}

export default function AthleteFinancesPage() {
  const { user, isAdmin } = useAuth();
  
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [finances, setFinances] = useState<Record<string, AthleteFinance>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    devido: string;
    pago: string;
  }>({ devido: '80', pago: '0' });
  
  // Status message state
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<'nickname' | 'number' | 'uniformSize' | 'pago' | 'pendente'>('nickname');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'nickname' | 'number' | 'uniformSize' | 'pago' | 'pendente') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  useEffect(() => {
    // 1. Fetch athletes
    const qAthletes = query(collection(db, 'athletes'));
    const unsubAthletes = onSnapshot(qAthletes, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const rawData = { id: doc.id, ...doc.data() } as Athlete;
        if (rawData.photoUrl) {
          rawData.photoUrl = normalizeGoogleDriveUrl(rawData.photoUrl);
        }
        return rawData;
      });
      setAthletes(data);
    }, (error) => {
      console.error("Erro ao carregar atletas:", error);
    });

    // 2. Fetch finances
    const qFinances = query(collection(db, 'athleteFinances'));
    const unsubFinances = onSnapshot(qFinances, (snapshot) => {
      const data: Record<string, AthleteFinance> = {};
      snapshot.docs.forEach(doc => {
        data[doc.id] = { id: doc.id, ...doc.data() } as any;
      });
      setFinances(data);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar dados financeiros:", error);
      setLoading(false);
    });

    return () => {
      unsubAthletes();
      unsubFinances();
    };
  }, []);

  // Filter and Sort active athletes based on sortField and sortOrder
  const activeAthletes = useMemo(() => {
    const filtered = athletes
      .filter(a => a.status !== 'Afastado' && a.status !== 'Inativo')
      .filter(a => {
        const queryText = searchTerm.toLowerCase();
        const nickname = (a.nickname || '').toLowerCase();
        const name = (a.name || '').toLowerCase();
        return nickname.includes(queryText) || name.includes(queryText);
      });

    return filtered.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'nickname') {
        valA = (a.nickname || a.name || '').trim();
        valB = (b.nickname || b.name || '').trim();
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base' })
          : valB.localeCompare(valA, 'pt-BR', { sensitivity: 'base' });
      } else if (sortField === 'number') {
        const numA = a.number !== undefined && a.number !== null && a.number !== '' ? parseInt(String(a.number)) : -999999;
        const numB = b.number !== undefined && b.number !== null && b.number !== '' ? parseInt(String(b.number)) : -999999;
        valA = numA;
        valB = numB;
      } else if (sortField === 'uniformSize') {
        const sizeOrder: Record<string, number> = { 'PP': 1, 'P': 2, 'M': 3, 'G': 4, 'GG': 5, 'XG': 6, 'XXG': 7 };
        const sizeA = (a.uniformSize || 'M').toUpperCase();
        const sizeB = (b.uniformSize || 'M').toUpperCase();
        valA = sizeOrder[sizeA] || 99;
        valB = sizeOrder[sizeB] || 99;
      } else if (sortField === 'pago') {
        const finA = finances[a.id];
        const finB = finances[b.id];
        valA = finA ? (finA.pago || 0) : 0;
        valB = finB ? (finB.pago || 0) : 0;
      } else if (sortField === 'pendente') {
        const finA = finances[a.id] || { devido: 80, pago: 0 };
        const finB = finances[b.id] || { devido: 80, pago: 0 };
        const devA = finA.devido !== undefined && finA.devido !== null ? finA.devido : 80;
        const devB = finB.devido !== undefined && finB.devido !== null ? finB.devido : 80;
        valA = devA - (finA.pago || 0);
        valB = devB - (finB.pago || 0);
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;

      // Fallback secondary sort by nickname / name
      const nameA = (a.nickname || a.name || '').trim();
      const nameB = (b.nickname || b.name || '').trim();
      return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
    });
  }, [athletes, searchTerm, sortField, sortOrder, finances]);

  // Totals for top card overview
  const totals = useMemo(() => {
    let dev = 0;
    let pag = 0;
    let pen = 0;

    // Sum values for athletes who are active (filtered list)
    athletes.filter(a => a.status !== 'Afastado' && a.status !== 'Inativo').forEach(a => {
      const fin = finances[a.id];
      const devVal = (fin && fin.devido !== undefined && fin.devido !== null) ? fin.devido : 80;
      const pagVal = fin ? (fin.pago || 0) : 0;
      const penVal = devVal - pagVal;
      dev += devVal;
      pag += pagVal;
      pen += penVal;
    });

    return { dev, pag, pen };
  }, [athletes, finances]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const handleStartEdit = (athleteId: string, currentFinance?: AthleteFinance) => {
    setEditingId(athleteId);
    setEditForm({
      devido: String(currentFinance?.devido ?? 80),
      pago: String(currentFinance?.pago ?? 0),
    });
  };

  const handleSave = async (athleteId: string) => {
    if (!isAdmin) {
      setStatusMessage({ type: 'error', text: 'Permissão negada. Apenas administradores podem salvar.' });
      return;
    }

    try {
      const devVal = parseFloat(editForm.devido.replace(',', '.')) || 0;
      const pagVal = parseFloat(editForm.pago.replace(',', '.')) || 0;
      const penVal = devVal - pagVal;

      await setDoc(doc(db, 'athleteFinances', athleteId), {
        athleteId,
        devido: devVal,
        pago: pagVal,
        pendente: penVal,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setEditingId(null);
      setStatusMessage({ type: 'success', text: 'Dados financeiros salvos com sucesso!' });
      
      // Clear status message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error("Erro ao salvar dados financeiros:", error);
      setStatusMessage({ type: 'error', text: 'Ocorreu um erro ao salvar os dados.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002874]"></div>
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
              <Link href="/" className="mr-2 sm:mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer hover:scale-110 active:scale-90 duration-200">
                <ArrowLeft className="h-5 w-5 sm:h-6 w-6 text-gray-600" />
              </Link>
              <h1 className="text-lg sm:text-xl font-extrabold text-[#002874] flex items-center gap-2">
                <Shirt className="h-5 w-5 text-[#ffba00]" />
                <span>Uniforme</span>
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 animate-in fade-in duration-300">
        {/* Title Block */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-[#002874]">Uniforme dos Atletas</h2>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Valores Devidos, Pagos e Pendentes para os novos uniformes 2026 dos atletas ativos.
          </p>
        </div>

        {/* Totals Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card Devido */}
          <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Total Devido</p>
              <h3 className="text-2xl sm:text-3xl font-black text-[#002874] mt-1">{formatCurrency(totals.dev)}</h3>
            </div>
            <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>

          {/* Card Pago */}
          <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Total Pago</p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{formatCurrency(totals.pag)}</h3>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>

          {/* Card Pendente */}
          <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Total Pendente</p>
              <h3 className="text-2xl sm:text-3xl font-black text-red-700 mt-1">{formatCurrency(totals.pen)}</h3>
            </div>
            <div className="p-4 bg-red-50 rounded-2xl text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Search & Permissions Info */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar atleta pelo apelido ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0069d3] focus:bg-white outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Modo Edição Administrador Ativo
              </span>
            ) : (
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-gray-400" /> Visualização (Apenas Adm edita)
              </span>
            )}
          </div>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 font-semibold text-sm border ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Main Table / Grid Container */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th 
                    onClick={() => handleSort('nickname')}
                    className="px-6 py-4 select-none cursor-pointer hover:bg-gray-100/80 transition-colors rounded-tl-2xl"
                  >
                    <div className="flex items-center gap-1">
                      <span>Atleta</span>
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortField === 'nickname' ? 'text-blue-600' : 'text-gray-300'}`} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('number')}
                    className="px-4 py-4 text-center select-none cursor-pointer hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Número</span>
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortField === 'number' ? 'text-blue-600' : 'text-gray-300'}`} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('uniformSize')}
                    className="px-4 py-4 text-center select-none cursor-pointer hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Uniforme</span>
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortField === 'uniformSize' ? 'text-blue-600' : 'text-gray-300'}`} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right">Devido</th>
                  <th 
                    onClick={() => handleSort('pago')}
                    className="px-6 py-4 text-right select-none cursor-pointer hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Pago</span>
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortField === 'pago' ? 'text-blue-600' : 'text-gray-300'}`} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('pendente')}
                    className="px-6 py-4 text-right select-none cursor-pointer hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Pendente</span>
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortField === 'pendente' ? 'text-blue-600' : 'text-gray-300'}`} />
                    </div>
                  </th>
                  {isAdmin && <th className="px-6 py-4 text-center w-28 rounded-tr-2xl">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeAthletes.length > 0 ? (
                  activeAthletes.map((athlete) => {
                    const fin = finances[athlete.id] || { devido: 80, pago: 0, pendente: 0 };
                    const devidoValue = fin.devido !== undefined && fin.devido !== null ? fin.devido : 80;
                    const pagoValue = fin ? (fin.pago || 0) : 0;
                    const pendenteValue = devidoValue - pagoValue;
                    const isEditing = editingId === athlete.id;

                    const devInput = isEditing ? (parseFloat(editForm.devido.replace(',', '.')) || 0) : devidoValue;
                    const pagInput = isEditing ? (parseFloat(editForm.pago.replace(',', '.')) || 0) : pagoValue;
                    const computedPendente = devInput - pagInput;

                    return (
                      <tr key={athlete.id} className="hover:bg-gray-50/50 transition-colors">
                        {/* Athlete Info */}
                        <td className="px-6 py-4">
                          <span className="font-extrabold text-[#002874] text-sm sm:text-base">
                            {athlete.nickname || athlete.name.split(' ')[0]}
                          </span>
                        </td>

                        {/* Jersey Number */}
                        <td className="px-4 py-4 text-center font-bold text-gray-600 text-sm">
                          <div className="inline-flex items-center justify-center bg-gray-100 rounded-lg px-2 py-1 gap-0.5">
                            <Hash className="h-3 w-3 text-gray-400" />
                            <span>{athlete.number ?? '-'}</span>
                          </div>
                        </td>

                        {/* Uniform Size */}
                        <td className="px-4 py-4 text-center font-extrabold text-gray-600 text-xs sm:text-sm">
                          <div className="inline-flex items-center justify-center bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2 py-1 gap-1">
                            <Shirt className="h-3.5 w-3.5 text-amber-500" />
                            <span>{athlete.uniformSize || 'M'}</span>
                          </div>
                        </td>

                        {/* Column: Devido */}
                        <td className="px-6 py-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end">
                              <span className="text-xs font-semibold text-gray-400 mr-1">R$</span>
                              <input
                                type="text"
                                value={editForm.devido}
                                onChange={(e) => setEditForm({ ...editForm, devido: e.target.value })}
                                className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm text-right focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                            </div>
                          ) : (
                            <span className="font-bold text-blue-600 text-sm sm:text-base">
                              {formatCurrency(devidoValue)}
                            </span>
                          )}
                        </td>

                        {/* Column: Pago */}
                        <td className="px-6 py-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end">
                              <span className="text-xs font-semibold text-gray-400 mr-1">R$</span>
                              <input
                                type="text"
                                value={editForm.pago}
                                onChange={(e) => setEditForm({ ...editForm, pago: e.target.value })}
                                className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm text-right focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                            </div>
                          ) : (
                            <span className="font-bold text-emerald-600 text-sm sm:text-base">
                              {formatCurrency(fin.pago)}
                            </span>
                          )}
                        </td>

                        {/* Column: Pendente */}
                        <td className="px-6 py-4 text-right">
                          <span className={`font-black text-sm sm:text-base ${computedPendente > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {formatCurrency(computedPendente)}
                          </span>
                        </td>

                        {/* Actions (Admin Only) */}
                        {isAdmin && (
                          <td className="px-6 py-4 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleSave(athlete.id)}
                                  className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all cursor-pointer hover:scale-105 active:scale-95"
                                  title="Salvar"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg border border-red-200 transition-all cursor-pointer hover:scale-105 active:scale-95"
                                  title="Cancelar"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleStartEdit(athlete.id, fin)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-[#0069d3] rounded-lg border border-blue-200 transition-all cursor-pointer hover:scale-105 active:scale-95"
                                title="Editar"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                <span>Editar</span>
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-sm text-gray-400 font-medium">
                      Nenhum atleta ativo encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
