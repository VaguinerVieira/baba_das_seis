'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  arrayUnion 
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  Info, 
  X,
  User,
  Calendar,
  Hash,
  Shirt,
  FileDown,
  PlusCircle,
  ChevronDown,
  DollarSign,
  Save,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AthletesReportPage() {
  const { user, isAdmin } = useAuth();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [transactionData, setTransactionData] = useState<any>({
    type: 'income',
    category: 'mensalidade',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    isMonthlyFee: true,
    referenceMonth: ''
  });

  useEffect(() => {
    const unsubCategories = onSnapshot(query(collection(db, 'categories'), orderBy('name')), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qAthletes = query(collection(db, 'athletes'), orderBy('nickname', 'asc'));
    const unsubAthletes = onSnapshot(qAthletes, (snapshot) => {
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

    return () => {
      unsubCategories();
      unsubAthletes();
    };
  }, []);

  const currentMonth = new Date().getMonth() + 1;

  const exportDebtorsToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38); // red-600
    doc.text('Relatório de Inadimplentes - Mensalidades 2026', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 21);
    doc.text(`Referência: Janeiro até ${months[currentMonth - 1]?.label}`, 14, 26);

    const head = [['Atleta', ...months.slice(0, currentMonth).map(m => m.label)]];
    
    const debtors = athletes.filter(athlete => {
      if (athlete.status === 'Afastado' || athlete.status === 'Inativo') return false;
      for (let i = 1; i <= currentMonth; i++) {
        // Ignore Jan-Mar for new athletes
        if (athlete.isNew && i <= 3) continue;
        if (!athlete.paidMonths?.includes(i)) return true;
      }
      return false;
    });

    const tableData = debtors.map(athlete => {
      const name = athlete.isBoardMember ? `${athlete.nickname || athlete.name} (Diretor)` : (athlete.nickname || athlete.name);
      const row = [name];
      for (let i = 1; i <= currentMonth; i++) {
        // Ignore Jan-Mar for new athletes
        if (athlete.isNew && i <= 3) {
          row.push('ISENTO');
          continue;
        }
        const isPaid = athlete.paidMonths?.includes(i);
        row.push(isPaid ? 'OK' : 'PENDENTE');
      }
      return row;
    });

    autoTable(doc, {
      startY: 32,
      head: head,
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], halign: 'center', textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, halign: 'center', valign: 'middle', cellPadding: 2 },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index > 0) {
          if (data.cell.raw === 'OK') {
            data.cell.styles.textColor = [22, 163, 74]; // green-600
          } else if (data.cell.raw === 'PENDENTE') {
            data.cell.styles.textColor = [220, 38, 38]; // red-600
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'ISENTO') {
            data.cell.styles.textColor = [156, 163, 175]; // light gray
          }
        }
      }
    });

    doc.save('relatorio-inadimplentes-baba-das-seis.pdf');
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for better grid fit
    
    // Title
    doc.setFontSize(14);
    doc.text('Relatório de Atletas - Mensalidades 2026', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 21);

    const head = [['Atleta', ...months.map(m => m.label)]];
    
    const tableData = athletes
      .filter(a => {
        if (a.status === 'Afastado' || a.status === 'Inativo') return false;
        const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             a.nickname?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesMonth = selectedMonth === 'all' || a.birthdayMonth === selectedMonth;
        const matchesDay = selectedDay === 'all' || a.birthdayDay === selectedDay;
        
        return matchesSearch && matchesMonth && matchesDay;
      })
      .map(athlete => {
        const name = athlete.isBoardMember ? `${athlete.nickname || athlete.name} (Diretor)` : (athlete.nickname || athlete.name);
        const row = [name];
        months.forEach(m => {
          const isPaid = athlete.paidMonths?.includes(m.id);
          row.push(isPaid ? 'OK' : '-');
        });
        return row;
      });

    autoTable(doc, {
      startY: 25,
      head: head,
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212], halign: 'center', textColor: [255, 255, 255], fontStyle: 'bold' }, // cyan-500
      styles: { fontSize: 7, halign: 'center', valign: 'middle', cellPadding: 1 },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 35 }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index > 0) {
          if (data.cell.raw === 'OK') {
            data.cell.text = ['']; // Clear text to draw icon
          } else {
            data.cell.text = ['']; // Clear '-' to draw empty circle
          }
        }
      },
      didDrawCell: function(data) {
        if (data.section === 'body' && data.column.index > 0) {
          const isPaid = tableData[data.row.index][data.column.index] === 'OK';
          const xc = data.cell.x + data.cell.width / 2;
          const yc = data.cell.y + data.cell.height / 2;
          const radius = 1.8;

          if (isPaid) {
            // Draw Green Circle
            doc.setFillColor(22, 163, 74); // green-600
            doc.circle(xc, yc, radius, 'F');
            
            // Draw White Checkmark
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.3);
            doc.line(xc - 0.8, yc, xc - 0.2, yc + 0.7);
            doc.line(xc - 0.2, yc + 0.7, xc + 0.8, yc - 0.7);
          } else {
            // Draw Empty Gray Circle
            doc.setDrawColor(209, 213, 219); // gray-300
            doc.setLineWidth(0.1);
            doc.circle(xc, yc, radius, 'S');
          }
        }
      }
    });

    doc.save('relatorio-atletas-baba-das-seis.pdf');
  };

  const months = [
    { id: 1, label: 'Jan', days: 31 },
    { id: 2, label: 'Fev', days: 29 }, // Leap year safe enough for birthdays
    { id: 3, label: 'Mar', days: 31 },
    { id: 4, label: 'Abr', days: 30 },
    { id: 5, label: 'Mai', days: 31 },
    { id: 6, label: 'Jun', days: 30 },
    { id: 7, label: 'Jul', days: 31 },
    { id: 8, label: 'Ago', days: 31 },
    { id: 9, label: 'Set', days: 30 },
    { id: 10, label: 'Out', days: 31 },
    { id: 11, label: 'Nov', days: 30 },
    { id: 12, label: 'Dez', days: 31 }
  ];

  const getDaysInMonth = (monthId: number | 'all') => {
    if (monthId === 'all') return 0;
    return months.find(m => m.id === monthId)?.days || 0;
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
    setTransactionData({ ...transactionData, amount });
  };

  if (loading) {
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
              <Link href="/" className="mr-2 sm:mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer hover:scale-110 active:scale-90 duration-200">
                <ArrowLeft className="h-5 w-5 sm:h-6 w-6 text-gray-600" />
              </Link>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">Relatório</h1>
            </div>
            <div className="flex items-center gap-2 relative">
              <div className="relative">
                <button 
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="flex items-center px-3 sm:px-4 py-2 bg-cyan-500 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-cyan-600 transition-all cursor-pointer hover:scale-105 active:scale-95 duration-200 shadow-sm"
                >
                  <FileDown className="h-4 w-4 mr-1 sm:mr-2" /> Exportar <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isExportMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsExportMenuOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 animate-in fade-in zoom-in duration-200 origin-top-right">
                      <button
                        onClick={() => {
                          exportDebtorsToPDF();
                          setIsExportMenuOpen(false);
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <FileDown className="h-4 w-4 mr-2" /> Inadimplentes
                      </button>
                      <button
                        onClick={() => {
                          exportToPDF();
                          setIsExportMenuOpen(false);
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-cyan-50 transition-colors"
                      >
                        <FileDown className="h-4 w-4 mr-2" /> Situação Geral
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Search and Header */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Mensalidades 2026</h2>
            <p className="text-sm text-gray-500 mt-1">Acompanhamento detalhado de pagamentos e dados dos atletas</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3 w-full lg:w-auto">
            {/* Month Filter */}
            <div className="relative w-full lg:w-44">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
                  setSelectedMonth(val);
                  setSelectedDay('all'); // Reset day when month changes
                }}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all shadow-sm appearance-none"
              >
                <option value="all">Niver do Mês</option>
                {months.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Day Filter */}
            <div className="relative w-full lg:w-36">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedDay}
                disabled={selectedMonth === 'all'}
                onChange={(e) => setSelectedDay(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className={`w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all shadow-sm appearance-none ${selectedMonth === 'all' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="all">Niver do Dia</option>
                {selectedMonth !== 'all' && Array.from({ length: getDaysInMonth(selectedMonth) }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div className="relative w-full lg:w-80 sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input 
                type="text"
                placeholder="Buscar Atleta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-cyan-50/50 border border-cyan-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all shadow-sm font-medium placeholder:text-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Athletes List */}
        <div className="grid grid-cols-1 gap-4">
          {athletes
            .filter(a => {
              if (a.status === 'Afastado' || a.status === 'Inativo') return false;
              const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                   a.nickname?.toLowerCase().includes(searchTerm.toLowerCase());
              
              const matchesMonth = selectedMonth === 'all' || a.birthdayMonth === selectedMonth;
              const matchesDay = selectedDay === 'all' || a.birthdayDay === selectedDay;
              
              return matchesSearch && matchesMonth && matchesDay;
            })
            .map(athlete => {
              return (
                <div key={athlete.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{athlete.nickname || athlete.name}</h3>
                        {athlete.isBoardMember && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                            Diretor
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{athlete.name}</p>
                    </div>
                  </div>

                  {/* Payment Grid */}
                  <div className="flex-1 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 sm:gap-2">
                    {months.map(month => {
                      const isPaid = athlete.paidMonths?.includes(month.id);
                      const isPastOrCurrent = month.id <= currentMonth;
                      const isIgnoredForNew = athlete.isNew && month.id <= 3;
                      const isUnpaidPast = !isPaid && isPastOrCurrent && !isIgnoredForNew;
                      
                      return (
                        <div key={month.id} className={`flex flex-col items-center p-1.5 sm:p-2 rounded-xl border transition-all ${
                          isPaid ? 'bg-green-50 border-green-100' : 
                          isUnpaidPast ? 'bg-red-50 border-red-100' :
                          isIgnoredForNew ? 'bg-gray-50 border-gray-100 opacity-60' :
                          'bg-gray-50 border-gray-100 opacity-40'
                        }`}>
                          <span className={`text-[8px] sm:text-[10px] font-bold uppercase mb-0.5 sm:mb-1 ${
                            isPaid ? 'text-green-700' : 
                            isUnpaidPast ? 'text-red-700' :
                            'text-gray-400'
                          }`}>{month.label}</span>
                          {isPaid ? (
                            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                          ) : (
                            <div className={`h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 ${isUnpaidPast ? 'border-red-200 bg-red-100/50' : 'border-gray-200'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end">
                    <button 
                      onClick={() => setSelectedAthlete(athlete)}
                      className="flex items-center justify-center px-4 py-2 bg-cyan-50 text-cyan-700 rounded-xl text-sm font-bold hover:bg-cyan-100 transition-all cursor-pointer hover:scale-105 active:scale-95 duration-200 border border-cyan-100"
                    >
                      <Info className="h-4 w-4 mr-2" /> Detalhes
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 italic">
            &quot;Os atletas da diretoria e os goleiros são isentos do pagamento da mensalidade.&quot;
          </p>
        </div>
      </main>

      {/* Athlete Details Modal */}
      {selectedAthlete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="relative h-32 bg-cyan-500">
              <button 
                onClick={() => setSelectedAthlete(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all cursor-pointer hover:scale-110 active:scale-90"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="absolute -bottom-12 right-8">
                <div className="h-24 w-24 rounded-3xl border-4 border-white overflow-hidden bg-white shadow-lg">
                  {selectedAthlete.photoUrl ? (
                    <div className="relative h-full w-full">
                      <Image 
                        src={selectedAthlete.photoUrl} 
                        alt={selectedAthlete.name}
                        fill
                        className="object-cover object-top"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="h-full w-full bg-cyan-100 flex items-center justify-center text-cyan-600 font-bold text-3xl">
                      {selectedAthlete.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-8 p-6">
              <div className="mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-2.5xl font-bold text-gray-900">{selectedAthlete.nickname || selectedAthlete.name}</h3>
                  {selectedAthlete.isBoardMember && (
                    <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs font-bold rounded-lg uppercase tracking-wider">
                      Diretoria
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{selectedAthlete.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <Hash className="h-3 w-3 mr-1" /> Número
                  </div>
                  <p className="text-lg font-bold text-gray-800">{selectedAthlete.number || '-'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <Shirt className="h-3 w-3 mr-1" /> Uniforme
                  </div>
                  <p className="text-lg font-bold text-gray-800">{selectedAthlete.uniformSize || '-'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <Calendar className="h-3 w-3 mr-1" /> Aniversário
                  </div>
                  <p className="text-lg font-bold text-gray-800">
                    {selectedAthlete.birthdayDay && selectedAthlete.birthdayMonth 
                      ? `${selectedAthlete.birthdayDay}/${months[selectedAthlete.birthdayMonth - 1]?.label}` 
                      : '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <User className="h-3 w-3 mr-1" /> Status
                  </div>
                  <div className="flex items-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider ${
                      (selectedAthlete.status === 'Ativo' || !selectedAthlete.status) ? 'bg-green-500 text-white' : 
                      selectedAthlete.status === 'Inativo' ? 'bg-red-500 text-white' : 
                      'bg-amber-500 text-white'
                    }`}>
                      {selectedAthlete.status || 'Ativo'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <svg className="h-3 w-3 mr-1 fill-current text-green-500" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg> WhatsApp
                  </div>
                  {selectedAthlete.whatsapp ? (
                    <a 
                      href={`https://wa.me/${selectedAthlete.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-bold text-green-600 hover:text-green-700 flex items-center transition-colors"
                    >
                      {selectedAthlete.whatsapp}
                      <svg className="h-5 w-5 ml-2 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </a>
                  ) : (
                    <p className="text-lg font-bold text-gray-400">Não informado</p>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                {user && isAdmin && (
                  <button 
                    onClick={() => {
                      setTransactionData({
                        ...transactionData,
                        athleteId: selectedAthlete.id,
                        description: 'Mensalidade',
                        date: format(new Date(), 'yyyy-MM-dd')
                      });
                      setIsTransactionModalOpen(true);
                    }}
                    className="w-full py-2.5 bg-cyan-500 text-white rounded-xl font-bold hover:bg-cyan-600 transition-all cursor-pointer hover:scale-[1.01] active:scale-98 duration-200 flex items-center justify-center"
                  >
                    <DollarSign className="h-5 w-5 mr-2" /> Lançar Entrada
                  </button>
                )}
                <button 
                  onClick={() => setSelectedAthlete(null)}
                  className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all cursor-pointer hover:scale-[1.01] active:scale-98 duration-200"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Transaction Modal */}
      {isTransactionModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-cyan-500" /> Lançar Mensalidade
              </h3>
              <button onClick={() => setIsTransactionModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await addDoc(collection(db, 'transactions'), {
                    ...transactionData,
                    createdAt: serverTimestamp()
                  });
                  
                  if (transactionData.isMonthlyFee && transactionData.athleteId && transactionData.referenceMonth) {
                    await updateDoc(doc(db, 'athletes', transactionData.athleteId), {
                      paidMonths: arrayUnion(parseInt(transactionData.referenceMonth))
                    });
                  }
                  
                  setIsTransactionModalOpen(false);
                  setSelectedAthlete(null);
                  alert('Transação lançada com sucesso!');
                } catch (error) {
                  console.error('Error saving transaction:', error);
                  alert('Erro ao salvar transação.');
                }
              }} 
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Valor (R$)</label>
                  <input 
                    type="text" 
                    required 
                    value={transactionData.amount !== undefined ? formatCurrency(transactionData.amount) : ''} 
                    onChange={handleCurrencyChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mês Ref.</label>
                  <select 
                    required 
                    value={transactionData.referenceMonth || ''} 
                    onChange={e => setTransactionData({...transactionData, referenceMonth: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="">Selecionar</option>
                    {months.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Data do Pagamento</label>
                <input 
                  type="date" required 
                  value={transactionData.date || ''} 
                  onChange={e => setTransactionData({...transactionData, date: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descrição</label>
                <input 
                  type="text" required 
                  value={transactionData.description || ''} 
                  onChange={e => setTransactionData({...transactionData, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-cyan-500 text-white rounded-xl font-bold hover:bg-cyan-600 transition-all shadow-lg shadow-cyan-100 flex items-center justify-center cursor-pointer hover:scale-[1.02] active:scale-95 duration-200"
              >
                <Save className="h-5 w-5 mr-2" /> Confirmar Lançamento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
