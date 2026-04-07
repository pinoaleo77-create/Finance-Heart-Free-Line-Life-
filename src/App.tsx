import { useState, useEffect } from 'react';
import { 
  format, 
  getDaysInMonth, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { Settings, ChevronLeft, ChevronRight, Gift, X, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { ShiftTimer } from './components/ShiftTimer';
import { Statistics } from './components/Statistics';

const DAILY_RATE = 2500;
const CRITICAL_THRESHOLD = 40000;

type RecordStatus = 'green' | 'red';
type RecordData = {
  status: RecordStatus;
  earnings?: number;
};
type Records = Record<string, RecordData | RecordStatus>;

export default function App() {
  // Database: Records
  const [records, setRecords] = useState<Records>(() => {
    const saved = localStorage.getItem('4hours_records');
    return saved ? JSON.parse(saved) : {};
  });

  // Database: Settings & Prizes
  const [prizes, setPrizes] = useState<string[]>(() => {
    const saved = localStorage.getItem('4hours_prizes');
    return saved ? JSON.parse(saved) : ['Шаурма', 'Выходной', 'Новая игра', 'Поход в кино', 'Вкусный ужин'];
  });

  // Database: Claimed Months
  const [claimedMonths, setClaimedMonths] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('4hours_claimed');
    return saved ? JSON.parse(saved) : {};
  });

  const [currentDate] = useState(new Date());
  const [viewingDate, setViewingDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isTimerVisible, setIsTimerVisible] = useState(() => {
    const savedState = localStorage.getItem('4hours_shift_state');
    if (savedState) return true;
    
    const savedRecords = localStorage.getItem('4hours_records');
    const parsed = savedRecords ? JSON.parse(savedRecords) : {};
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return !parsed[todayStr];
  });

  const [wheelState, setWheelState] = useState<'hidden' | 'ready' | 'spinning' | 'revealing'>('hidden');
  const [wonPrize, setWonPrize] = useState<string | null>(null);
  const [spinDegrees, setSpinDegrees] = useState(0);

  // Persist data
  useEffect(() => {
    localStorage.setItem('4hours_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('4hours_prizes', JSON.stringify(prizes));
  }, [prizes]);

  useEffect(() => {
    localStorage.setItem('4hours_claimed', JSON.stringify(claimedMonths));
  }, [claimedMonths]);

  // Check for perfect month completion
  useEffect(() => {
    const monthKey = format(viewingDate, 'yyyy-MM');
    if (claimedMonths[monthKey]) return;

    const monthStart = startOfMonth(viewingDate);
    const monthEnd = endOfMonth(viewingDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    let filledCount = 0;
    let redCount = 0;
    
    days.forEach(day => {
      const record = records[format(day, 'yyyy-MM-dd')];
      if (record) {
        filledCount++;
        const status = typeof record === 'string' ? record : record.status;
        if (status === 'red') redCount++;
      }
    });

    if (filledCount === days.length && redCount === 0) {
      setWheelState('ready');
    } else {
      setWheelState('hidden');
    }
  }, [records, viewingDate, claimedMonths]);

  const handleRecord = (status: RecordStatus) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setRecords(prev => ({
      ...prev,
      [dateStr]: { status, earnings: status === 'green' ? DAILY_RATE : 0 }
    }));
  };

  const handleShiftComplete = (amount: number) => {
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    setRecords(prev => ({
      ...prev,
      [dateStr]: { status: 'green', earnings: amount }
    }));
    setIsTimerVisible(false);
  };

  const spinWheel = () => {
    setWheelState('spinning');
    const prizeIndex = Math.floor(Math.random() * 5);
    // Calculate rotation to land on the specific prize (5 extra full spins)
    const targetRotation = spinDegrees + (360 * 5) - (prizeIndex * 72 + 36) + (spinDegrees % 360 === 0 ? 0 : 360 - (spinDegrees % 360));
    setSpinDegrees(targetRotation);
    
    setTimeout(() => {
      setWonPrize(prizes[prizeIndex]);
      setWheelState('revealing');
      const monthKey = format(viewingDate, 'yyyy-MM');
      setClaimedMonths(prev => ({ ...prev, [monthKey]: true }));
    }, 3000);
  };

  const closePrize = () => {
    setWheelState('hidden');
    // Move to next month automatically
    setViewingDate(prev => addMonths(prev, 1));
  };

  const monthStart = startOfMonth(viewingDate);
  const monthEnd = endOfMonth(viewingDate);
  const daysInMonth = getDaysInMonth(viewingDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate stats for the viewed month
  let greenDays = 0;
  let redDays = 0;
  let currentEarnings = 0;

  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const record = records[dateStr];
    if (record) {
      const status = typeof record === 'string' ? record : record.status;
      const earnings = typeof record === 'object' && record.earnings !== undefined ? record.earnings : (status === 'green' ? DAILY_RATE : 0);
      
      if (status === 'green') {
        greenDays++;
        currentEarnings += earnings;
      }
      if (status === 'red') redDays++;
    }
  });

  const potentialMax = (daysInMonth - redDays) * DAILY_RATE;
  const isCritical = potentialMax < CRITICAL_THRESHOLD;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 flex flex-col max-w-md mx-auto relative overflow-hidden">
      
      {isTimerVisible && (
        <ShiftTimer 
          onComplete={handleShiftComplete} 
          onCancel={() => setIsTimerVisible(false)} 
        />
      )}

      <AnimatePresence>
        {showStats && (
          <Statistics records={records} onClose={() => setShowStats(false)} />
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-zinc-100">Призы в рулетке</h2>
                <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                {prizes.map((prize, i) => (
                  <div key={i}>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Приз {i + 1}</label>
                    <input 
                      type="text" 
                      value={prize}
                      onChange={(e) => {
                        const newPrizes = [...prizes];
                        newPrizes[i] = e.target.value;
                        setPrizes(newPrizes);
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full mt-8 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black uppercase tracking-widest py-4 rounded-xl transition-colors"
              >
                Сохранить
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wheel of Fortune Modal */}
      <AnimatePresence>
        {wheelState !== 'hidden' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
          >
            {wheelState === 'ready' || wheelState === 'spinning' ? (
              <div className="flex flex-col items-center w-full max-w-sm">
                <h2 className="text-3xl font-black text-emerald-400 mb-2 text-center uppercase tracking-tight">Идеальный месяц!</h2>
                <p className="text-zinc-400 mb-12 text-center font-medium">Ни одного проеба. Крути колесо фортуны!</p>
                
                <div className="relative w-72 h-72 mb-16">
                  {/* Pointer */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                    <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[24px] border-t-white" />
                  </div>
                  
                  {/* Wheel */}
                  <div 
                    className="w-full h-full rounded-full overflow-hidden border-4 border-zinc-800 shadow-[0_0_50px_-10px_rgba(16,185,129,0.3)] relative"
                    style={{
                      background: `conic-gradient(
                        #ef4444 0deg 72deg,
                        #f59e0b 72deg 144deg,
                        #10b981 144deg 216deg,
                        #3b82f6 216deg 288deg,
                        #8b5cf6 288deg 360deg
                      )`,
                      transform: `rotate(${spinDegrees}deg)`,
                      transition: wheelState === 'spinning' ? 'transform 3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
                    }}
                  >
                    {prizes.map((prize, i) => (
                      <div key={i} className="absolute inset-0 flex items-start justify-center pt-8"
                           style={{ transform: `rotate(${i * 72 + 36}deg)` }}>
                           <span className="text-sm font-black text-white drop-shadow-md truncate w-24 text-center">
                               {prize}
                           </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={spinWheel}
                  disabled={wheelState === 'spinning'}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-black uppercase tracking-widest py-5 px-12 rounded-2xl shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] transition-all active:scale-95 text-xl"
                >
                  {wheelState === 'spinning' ? 'Крутится...' : 'Крутить!'}
                </button>
              </div>
            ) : (
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="flex flex-col items-center bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-sm relative shadow-2xl"
              >
                <button onClick={closePrize} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
                
                <motion.div 
                  animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="mb-6"
                >
                  <Gift size={80} className="text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]" />
                </motion.div>
                
                <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-2">Твой приз</h3>
                <h2 className="text-3xl font-black text-white text-center mb-8 leading-tight">{wonPrize}</h2>
                
                <button 
                  onClick={closePrize}
                  className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-black py-4 rounded-xl transition-colors uppercase tracking-widest"
                >
                  Забрать
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header / Telemetry */}
      <header className="p-6 pb-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setShowSettings(true)} className="text-zinc-500 hover:text-zinc-300 transition-colors p-2 -ml-2">
            <Settings size={22} />
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => setViewingDate(subMonths(viewingDate, 1))} className="text-zinc-500 hover:text-zinc-300 p-1 transition-colors">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-sm font-bold tracking-widest text-zinc-200 uppercase w-32 text-center">
              {format(viewingDate, 'LLLL yyyy', { locale: ru })}
            </h1>
            <button onClick={() => setViewingDate(addMonths(viewingDate, 1))} className="text-zinc-500 hover:text-zinc-300 p-1 transition-colors">
              <ChevronRight size={24} />
            </button>
          </div>
          <button onClick={() => setShowStats(true)} className="text-zinc-500 hover:text-zinc-300 transition-colors p-2 -mr-2">
            <BarChart2 size={22} />
          </button>
        </div>

        <div className="flex justify-between items-end mb-2">
          <div>
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Заработано</div>
            <div className="text-4xl font-black tracking-tighter text-emerald-400">
              {currentEarnings.toLocaleString('ru-RU')} ₽
            </div>
          </div>
          <div className="text-right pb-1">
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Потенциал</div>
            <div className={cn(
              "text-xl font-bold tracking-tight",
              isCritical ? "text-red-500" : "text-zinc-300"
            )}>
              {potentialMax.toLocaleString('ru-RU')} ₽
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-zinc-900 rounded-full mt-5 overflow-hidden flex">
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
            const record = records[dateStr];
            const status = record ? (typeof record === 'string' ? record : record.status) : null;
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentDay = isToday(day);
            
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all relative",
                  "border-2",
                  isSelected ? "border-zinc-100 scale-110 z-10 shadow-xl shadow-black/50" : "border-transparent",
                  !status && "bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800",
                  status === 'green' && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                  status === 'red' && "bg-red-500/20 text-red-400 border-red-500/30",
                  isCurrentDay && !isSelected && "ring-2 ring-zinc-700 ring-offset-2 ring-offset-zinc-950"
                )}
              >
                {format(day, 'd')}
                {isCurrentDay && (
                  <div className="absolute -bottom-1.5 w-1.5 h-1.5 bg-zinc-400 rounded-full" />
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

