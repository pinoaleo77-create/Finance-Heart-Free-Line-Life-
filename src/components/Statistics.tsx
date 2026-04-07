import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { X } from 'lucide-react';
import { motion } from 'motion/react';

interface StatisticsProps {
  records: Record<string, any>;
  onClose: () => void;
}

export function Statistics({ records, onClose }: StatisticsProps) {
  // Prepare data for the chart
  const data = Object.entries(records)
    .filter(([_, value]) => value && (value === 'green' || value.status === 'green'))
    .map(([date, value]) => {
      const earnings = typeof value === 'object' && value.earnings !== undefined ? value.earnings : 2500;
      return {
        date,
        parsedDate: parseISO(date),
        earnings,
        displayDate: format(parseISO(date), 'dd MMM', { locale: ru })
      };
    })
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
    .slice(-14); // Last 14 working days

  const totalEarnings = data.reduce((sum, item) => sum + item.earnings, 0);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex flex-col p-6"
    >
      <div className="flex justify-between items-center mb-8 pt-4">
        <h2 className="text-2xl font-black text-zinc-100 uppercase tracking-widest">Статистика</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 p-2 rounded-full">
          <X size={24} />
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-6">
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Заработано (последние 14 смен)</div>
        <div className="text-4xl font-black tracking-tighter text-emerald-400">
          {totalEarnings.toLocaleString('ru-RU')} ₽
        </div>
      </div>

      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 min-h-[300px]">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">График дохода</h3>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="displayDate" 
                stroke="#52525b" 
                fontSize={10} 
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="#52525b" 
                fontSize={10} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}₽`}
              />
              <Tooltip 
                cursor={{ fill: '#27272a' }}
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontSize: '12px' }}
                formatter={(value: number) => [`${value} ₽`, 'Заработано']}
              />
              <Bar dataKey="earnings" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#10b981" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-600 font-medium text-sm">
            Нет данных для графика
          </div>
        )}
      </div>
    </motion.div>
  );
}
