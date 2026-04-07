import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, CheckCircle, AlertCircle } from 'lucide-react';

interface ShiftTimerProps {
  onComplete: (amount: number) => void;
  onCancel: () => void;
}

const SHIFT_DURATION = 4 * 60 * 60; // 4 hours in seconds

export function ShiftTimer({ onComplete, onCancel }: ShiftTimerProps) {
  const [state, setState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
  const [remaining, setRemaining] = useState(SHIFT_DURATION);
  const [earnedInput, setEarnedInput] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Load state from local storage
    const savedState = localStorage.getItem('4hours_shift_state');
    const savedEndTime = localStorage.getItem('4hours_shift_end');
    const savedRemaining = localStorage.getItem('4hours_shift_remaining');

    if (savedState === 'running' && savedEndTime) {
      const end = parseInt(savedEndTime, 10);
      const now = Date.now();
      if (now >= end) {
        setState('finished');
        setRemaining(0);
      } else {
        setState('running');
        setRemaining(Math.floor((end - now) / 1000));
      }
    } else if (savedState === 'paused' && savedRemaining) {
      setState('paused');
      setRemaining(parseInt(savedRemaining, 10));
    } else if (savedState === 'finished') {
      setState('finished');
      setRemaining(0);
    }
  }, []);

  useEffect(() => {
    let interval: number;
    if (state === 'running') {
      interval = window.setInterval(() => {
        const savedEndTime = localStorage.getItem('4hours_shift_end');
        if (savedEndTime) {
          const end = parseInt(savedEndTime, 10);
          const now = Date.now();
          if (now >= end) {
            setState('finished');
            setRemaining(0);
            playAlarm();
          } else {
            setRemaining(Math.floor((end - now) / 1000));
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state]);

  useEffect(() => {
    localStorage.setItem('4hours_shift_state', state);
    if (state === 'paused') {
      localStorage.setItem('4hours_shift_remaining', remaining.toString());
    }
  }, [state, remaining]);

  const playAlarm = () => {
    if (!audioRef.current) {
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
      audio.loop = true;
      audioRef.current = audio;
    }
    audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 500, 500, 500, 500]);
    }
  };

  const stopAlarm = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  };

  const startTimer = () => {
    const end = Date.now() + remaining * 1000;
    localStorage.setItem('4hours_shift_end', end.toString());
    setState('running');
  };

  const pauseTimer = () => {
    setState('paused');
  };

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleComplete = () => {
    const amount = parseInt(earnedInput, 10);
    if (!isNaN(amount) && amount >= 0) {
      stopAlarm();
      localStorage.removeItem('4hours_shift_state');
      localStorage.removeItem('4hours_shift_end');
      localStorage.removeItem('4hours_shift_remaining');
      onComplete(amount);
    }
  };

  if (state === 'finished') {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="w-full max-w-sm bg-zinc-900 border border-red-500/50 rounded-3xl p-8 shadow-[0_0_50px_-10px_rgba(239,68,68,0.5)] flex flex-col items-center"
        >
          <AlertCircle size={64} className="text-red-500 mb-4 animate-pulse" />
          <h1 className="text-3xl font-black text-red-500 uppercase tracking-widest mb-8 text-center">Смена закрыта</h1>
          
          <div className="w-full mb-8">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block text-center">Сколько заработано?</label>
            <div className="relative">
              <input 
                type="number" 
                value={earnedInput}
                onChange={(e) => setEarnedInput(e.target.value)}
                className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-2xl px-6 py-4 text-3xl text-center text-emerald-400 font-black focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="0"
                autoFocus
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl text-zinc-600 font-black">₽</span>
            </div>
          </div>

          <button 
            onClick={handleComplete}
            disabled={!earnedInput}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-black uppercase tracking-widest py-5 rounded-xl transition-all active:scale-95 text-lg"
          >
            Сохранить день
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <h2 className="text-zinc-500 font-bold uppercase tracking-widest text-sm mb-12">Рабочая смена</h2>
        
        <div className="text-7xl font-black text-emerald-400 tracking-tighter mb-16 tabular-nums drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          {formatTime(remaining)}
        </div>

        <div className="flex gap-4 w-full">
          {state === 'idle' || state === 'paused' ? (
            <button 
              onClick={startTimer}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black uppercase tracking-widest py-6 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 text-xl shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)]"
            >
              <Play fill="currentColor" size={24} />
              {state === 'idle' ? 'Начать' : 'Продолжить'}
            </button>
          ) : (
            <button 
              onClick={pauseTimer}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black uppercase tracking-widest py-6 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 text-xl shadow-[0_0_40px_-10px_rgba(245,158,11,0.4)]"
            >
              <Pause fill="currentColor" size={24} />
              Пауза
            </button>
          )}
        </div>
        
        <button 
          onClick={onCancel}
          className="mt-8 text-zinc-600 hover:text-zinc-400 font-bold uppercase tracking-widest text-xs transition-colors"
        >
          Закрыть таймер
        </button>
      </div>
    </div>
  );
}
