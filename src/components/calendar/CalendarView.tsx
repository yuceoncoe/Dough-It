import React, { useEffect, useRef, useState } from 'react';
import { Task } from '../../types';
import { getTaskColor } from '../../utils/task';
import { Settings, ChevronLeft, ChevronRight } from 'lucide-react';

export const CalendarView = ({
  tasksByDate,
  onOpenSettings,
  onSelectDate,
}: {
  tasksByDate: Record<string, Task[]>;
  onOpenSettings: () => void;
  onSelectDate: (date: string) => void;
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const totalDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const buildDateKey = (day: number) => `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return (
    <section className="flex h-full flex-col overflow-hidden bg-[#f6f6f8] p-4 md:p-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-hand text-4xl text-stone-800 md:text-5xl">달력 보기</h1>
          <p className="text-sm text-stone-500">날짜를 누르면 그날의 24시간 원형 시계로 이동합니다.</p>
        </div>
        <button onClick={onOpenSettings} className="rounded-full border border-stone-300 bg-white p-3 text-stone-600 shadow-sm transition-colors hover:bg-stone-50">
          <Settings size={22} />
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-[1.8rem] border border-white/70 bg-white/65 px-3 py-2 shadow-sm backdrop-blur">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="rounded-full p-2 text-stone-600 transition-colors hover:bg-stone-100">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center text-lg font-medium text-stone-800 md:text-2xl">
          {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="rounded-full p-2 text-stone-600 transition-colors hover:bg-stone-100">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.2em] text-stone-500 md:text-sm">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day}>{day}</div>)}
      </div>

      <div className="mt-3 grid flex-1 grid-cols-7 gap-2 overflow-y-auto pb-safe">
        {Array.from({ length: firstDay }, (_, index) => <div key={`empty-${index}`} />)}
        {Array.from({ length: totalDays }, (_, index) => {
          const day = index + 1;
          const dateKey = buildDateKey(day);
          const dayTasks = tasksByDate[dateKey] ?? [];
          const nonRoutine = dayTasks.filter((task) => !task.isRoutine);
          const now = new Date();
          const isToday = now.getFullYear() === currentMonth.getFullYear() && now.getMonth() === currentMonth.getMonth() && now.getDate() === day;

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              className={`min-h-[92px] rounded-[1.6rem] border p-2 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white ${isToday ? 'border-amber-400 bg-amber-50' : 'border-white/70 bg-white/65'}`}
            >
              <div className="flex items-start justify-between">
                <span className={`text-base font-semibold md:text-lg ${isToday ? 'text-amber-700' : 'text-stone-800'}`}>{day}</span>
                {isToday && <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] tracking-[0.18em] text-amber-800">오늘</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {nonRoutine.slice(0, 6).map((task) => (
                  <span key={task.id} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: task.completed ? '#d6d3d1' : getTaskColor(task.tags) }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CalendarView;
