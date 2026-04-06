import { useState, useEffect } from 'react';
import { 
  format, 
  getDaysInMonth, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  parseISO
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from './lib/utils';

const DAILY_RATE = 2500;
const CRITICAL_THRESHOLD = 40000;

type RecordStatus = 'green' | 'red';
type Records = Record<string, RecordStatus>;

export default function App() {
  const [records, setRecords] = useState<Records>(() => {
    const saved = localStorage.getItem('4hours_records');
    return saved ? JSON.parse(saved) : {};
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    localStorage.setItem('4hours_records', JSON.stringify(records));
  }, [records]);

  const handleRecord = (status: RecordStatus) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setRecords(prev => ({
      ...prev,
      [dateStr]: status
    }));
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = getDaysInMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate stats for the current month
  let greenDays = 0;
  let redDays = 0;

  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    if (records[dateStr] === 'green') greenDays++;
    if (records[dateStr] === 'red') redDays++;
  });

  const currentEarnings = greenDays * DAILY_RATE;
  const potentialMax = (daysInMonth - redDays) * DAILY_RATE;
  const isCritical = potentialMax < CRITICAL_THRESHOLD;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 flex flex-col max-w-md mx-auto relative overflow-hidden">
      {/* Header / Telemetry */}
      <header className="p-6 pb-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex justify-between items-end mb-2">
          <h1 className="text-xl font-bold tracking-tight text-zinc-400">
            {format(currentDate, 'LLLL yyyy', { locale: ru }).toUpperCase()}
          </h1>
          <div className="text-right">
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Заработано</div>
            <div className="text-3xl font-black tracking-tighter text-emerald-400">
              {currentEarnings.toLocaleString('ru-RU')} ₽
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-zinc-900/50">
          <div>
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Потенциал</div>
            <div className={cn(
              "text-lg font-bold tracking-tight",
              isCritical ? "text-red-500" : "text-zinc-300"
            )}>
              {potentialMax.toLocaleString('ru-RU')} ₽
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Крит. зона</div>
            <div className="text-sm font-medium text-zinc-500">
              &lt; {CRITICAL_THRESHOLD.toLocaleString('ru-RU')} ₽
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-zinc-900 rounded-full mt-4 overflow-hidden flex">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500" 
            style={{ width: `${(currentEarnings / (daysInMonth * DAILY_RATE)) * 100}%` }}
          />
          <div 
            className="h-full bg-red-500 transition-all duration-500" 
            style={{ width: `${(redDays / daysInMonth) * 100}%` }}
          />
        </div>
      </header>

      {/* Calendar Grid */}
      <main className="flex-1 overflow-y-auto p-6 pb-32">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(day => (
            <div key={day} className="text-center text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for offset */}
          {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const status = records[dateStr];
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentDay = isToday(day);
            
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all relative",
                  "border-2",
                  isSelected ? "border-zinc-100 scale-110 z-10 shadow-lg shadow-black/50" : "border-transparent",
                  !status && "bg-zinc-900 text-zinc-500 hover:bg-zinc-800",
                  status === 'green' && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                  status === 'red' && "bg-red-500/20 text-red-400 border-red-500/30",
                  isCurrentDay && !isSelected && "ring-2 ring-zinc-700 ring-offset-2 ring-offset-zinc-950"
                )}
              >
                {format(day, 'd')}
                {isCurrentDay && (
                  <div className="absolute -bottom-1 w-1 h-1 bg-zinc-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* Controls */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent">
        <div className="max-w-md mx-auto flex gap-3">
          <button
            onClick={() => handleRecord('green')}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-black uppercase tracking-wider py-5 rounded-2xl shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex flex-col items-center justify-center gap-1"
          >
            <span className="text-lg">Норма</span>
            <span className="text-[10px] opacity-80 font-bold">4 часа / 2500₽</span>
          </button>
          
          <button
            onClick={() => handleRecord('red')}
            className="flex-1 bg-red-500 hover:bg-red-400 active:bg-red-600 text-zinc-950 font-black uppercase tracking-wider py-5 rounded-2xl shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)] transition-all active:scale-95 flex flex-col items-center justify-center gap-1"
          >
            <span className="text-lg">Проеб</span>
            <span className="text-[10px] opacity-80 font-bold">-2500₽ от макс.</span>
          </button>
        </div>
      </div>
    </div>
  );
}
