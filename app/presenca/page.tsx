'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { 
  ArrowLeft, 
  Check, 
  Calendar, 
  Users,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { 
  format, 
  addWeeks, 
  nextSunday,
  startOfSunday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AttendancePage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [baseDate, setBaseDate] = useState<Date>(() => {
    const today = new Date();
    // If today is Sunday, start from today, otherwise next Sunday
    return today.getDay() === 0 ? startOfSunday(today) : nextSunday(today);
  });

  // Calculate 4 Sundays starting from baseDate
  const sundays = Array.from({ length: 4 }, (_, i) => addWeeks(baseDate, i));

  useEffect(() => {
    const qAthletes = query(collection(db, 'athletes'), orderBy('nickname', 'asc'));
    const unsubAthletes = onSnapshot(qAthletes, (snapshot) => {
      setAthletes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const data: Record<string, string[]> = {};
      snapshot.docs.forEach(doc => {
        data[doc.id] = doc.data().presentAthletes || [];
      });
      setAttendance(data);
    });

    return () => {
      unsubAthletes();
      unsubAttendance();
    };
  }, []);

  const toggleAttendance = async (athleteId: string, date: Date) => {
    if (!isAdmin) return;

    const dateId = format(date, 'yyyy-MM-dd');
    const currentPresent = attendance[dateId] || [];
    let newPresent: string[];

    if (currentPresent.includes(athleteId)) {
      newPresent = currentPresent.filter(id => id !== athleteId);
    } else {
      newPresent = [...currentPresent, athleteId];
    }

    try {
      await setDoc(doc(db, 'attendance', dateId), {
        date: dateId,
        presentAthletes: newPresent,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  if (loading || authLoading) {
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
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">Presença</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Controle de Presença</h2>
              <p className="text-sm text-gray-500 mt-1">Marque a presença dos atletas nos domingos</p>
            </div>
            <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
              <button 
                onClick={() => setBaseDate(addWeeks(baseDate, -4))}
                className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600 cursor-pointer"
                title="Semanas anteriores"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="px-4 py-1 flex flex-col items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Período</span>
                <span className="text-xs font-bold text-gray-700">
                  {format(sundays[0], 'dd/MM')} - {format(sundays[3], 'dd/MM')}
                </span>
              </div>
              <button 
                onClick={() => setBaseDate(addWeeks(baseDate, 4))}
                className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600 cursor-pointer"
                title="Próximas semanas"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 sticky left-0 bg-gray-50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Atleta</th>
                  {sundays.map(sunday => (
                    <th key={sunday.toISOString()} className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 text-center min-w-[100px]">
                      <div className="flex flex-col items-center">
                        <span className="text-cyan-600 text-sm">{format(sunday, 'dd/MM')}</span>
                        <span className="text-[10px] font-medium text-gray-400">{format(sunday, 'EEE', { locale: ptBR })}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {athletes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-400 italic">
                      Nenhum atleta cadastrado.
                    </td>
                  </tr>
                ) : (
                  athletes.map((athlete, idx) => (
                    <tr key={athlete.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-cyan-50/30 transition-colors group`}>
                      <td className="p-4 border-b border-gray-100 sticky left-0 bg-inherit z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-xs mr-3 shrink-0 group-hover:scale-110 transition-transform">
                            {athlete.number || athlete.nickname?.charAt(0) || athlete.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate max-w-[120px]">{athlete.nickname || athlete.name}</p>
                            <p className="text-[10px] text-gray-400 truncate max-w-[120px]">{athlete.name}</p>
                          </div>
                        </div>
                      </td>
                      {sundays.map(sunday => {
                        const dateId = format(sunday, 'yyyy-MM-dd');
                        const isPresent = (attendance[dateId] || []).includes(athlete.id);
                        return (
                          <td key={dateId} className="p-4 border-b border-gray-100 text-center">
                            <button
                              onClick={() => toggleAttendance(athlete.id, sunday)}
                              disabled={!isAdmin}
                              className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all mx-auto ${
                                isPresent 
                                  ? 'bg-green-500 text-white shadow-lg shadow-green-100 scale-110' 
                                  : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                              } ${!isAdmin ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-90'}`}
                            >
                              {isPresent ? <Check className="h-5 w-5 stroke-[3px]" /> : <Users className="h-4 w-4" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
