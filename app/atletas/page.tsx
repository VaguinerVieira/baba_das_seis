'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
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
  FileDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AthletesReportPage() {
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);

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
        const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             a.nickname?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesMonth = selectedMonth === 'all' || a.birthdayMonth === selectedMonth;
        const matchesDay = selectedDay === 'all' || a.birthdayDay === selectedDay;
        
        return matchesSearch && matchesMonth && matchesDay;
      })
      .map(athlete => {
        const row = [athlete.nickname || athlete.name];
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

  useEffect(() => {
    const qAthletes = query(collection(db, 'athletes'), orderBy('nickname', 'asc'));
    const unsubscribe = onSnapshot(qAthletes, (snapshot) => {
      setAthletes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
            <div className="flex items-center">
              <button 
                onClick={exportToPDF}
                className="flex items-center px-3 sm:px-4 py-2 bg-cyan-500 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-cyan-600 transition-all cursor-pointer hover:scale-105 active:scale-95 duration-200 shadow-sm"
              >
                <FileDown className="h-4 w-4 mr-1 sm:mr-2" /> <span className="hidden xs:inline">Exportar</span> PDF
              </button>
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
                <option value="all">Nascidos no Mês</option>
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
                <option value="all">no dia</option>
                {selectedMonth !== 'all' && Array.from({ length: getDaysInMonth(selectedMonth) }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div className="relative w-full lg:w-80 sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input 
                type="text"
                placeholder="Buscar por nome ou apelido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Athletes List */}
        <div className="grid grid-cols-1 gap-4">
          {athletes
            .filter(a => {
              const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                   a.nickname?.toLowerCase().includes(searchTerm.toLowerCase());
              
              const matchesMonth = selectedMonth === 'all' || a.birthdayMonth === selectedMonth;
              const matchesDay = selectedDay === 'all' || a.birthdayDay === selectedDay;
              
              return matchesSearch && matchesMonth && matchesDay;
            })
            .map(athlete => {
              const paidCount = months.filter(m => athlete.paidMonths?.includes(m.id)).length;
              
              return (
                <div key={athlete.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4 min-w-[250px]">
                    <div className="h-14 w-14 flex-shrink-0">
                      {athlete.photoUrl ? (
                        <div className="relative h-14 w-14">
                          <Image 
                            className="rounded-full object-cover border-2 border-cyan-100" 
                            src={athlete.photoUrl} 
                            alt={athlete.name}
                            fill
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 font-bold text-xl">
                          {athlete.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{athlete.nickname || athlete.name}</h3>
                        {athlete.isBoardMember && (
                          <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] font-bold rounded uppercase tracking-wider">
                            Diretoria
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{athlete.name}</p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700">
                          Nasc: {athlete.birthdayDay}/{months[athlete.birthdayMonth - 1]?.label}
                        </span>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          {paidCount} Pagos
                        </span>
                        <span className="text-xs font-bold text-red-400 bg-red-50 px-2 py-0.5 rounded-full">
                          {12 - paidCount} Pendentes
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Grid */}
                  <div className="flex-1 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 sm:gap-2">
                    {months.map(month => {
                      const isPaid = athlete.paidMonths?.includes(month.id);
                      return (
                        <div key={month.id} className={`flex flex-col items-center p-1.5 sm:p-2 rounded-xl border transition-all ${isPaid ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100 opacity-40'}`}>
                          <span className={`text-[8px] sm:text-[10px] font-bold uppercase mb-0.5 sm:mb-1 ${isPaid ? 'text-green-700' : 'text-gray-400'}`}>{month.label}</span>
                          {isPaid ? (
                            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                          ) : (
                            <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-gray-200" />
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
              <div className="absolute -bottom-12 left-8">
                <div className="h-24 w-24 rounded-3xl border-4 border-white overflow-hidden bg-white shadow-lg">
                  {selectedAthlete.photoUrl ? (
                    <div className="relative h-full w-full">
                      <Image 
                        src={selectedAthlete.photoUrl} 
                        alt={selectedAthlete.name}
                        fill
                        className="object-cover"
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

            <div className="pt-16 p-8">
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedAthlete.nickname || selectedAthlete.name}</h3>
                  {selectedAthlete.isBoardMember && (
                    <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs font-bold rounded-lg uppercase tracking-wider">
                      Diretoria
                    </span>
                  )}
                </div>
                <p className="text-gray-500">{selectedAthlete.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
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
                      selectedAthlete.status === 'Ativo' ? 'bg-green-500 text-white' : 
                      selectedAthlete.status === 'Inativo' ? 'bg-red-500 text-white' : 
                      'bg-amber-500 text-white'
                    }`}>
                      {selectedAthlete.status || 'Ativo'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <button 
                  onClick={() => setSelectedAthlete(null)}
                  className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 duration-200"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
