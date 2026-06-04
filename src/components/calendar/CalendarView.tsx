import React, { useState } from 'react';
import { Task, Tag } from '../../types';
import { Icon } from '../../components/ui/Icon';

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
  const getQuadrants = (tasks: Task[]) => ({
    urgentImportant: tasks.some((task) => task.tags.includes('urgent') && task.tags.includes('important')),
    normal: tasks.some((task) => !task.tags.includes('urgent') && !task.tags.includes('important')),
    urgent: tasks.some((task) => task.tags.includes('urgent') && !task.tags.includes('important')),
    important: tasks.some((task) => task.tags.includes('important') && !task.tags.includes('urgent')),
  });

  return (
    <section className="flex h-full flex-col overflow-y-auto bg-[#f0f0f4] p-4 md:p-8">
      <div className="sticky top-0 z-30 mb-4 flex items-center justify-between gap-3 bg-[#f0f0f4]/95 pb-3 backdrop-blur">
        <div>
          <h1 className="font-hand text-3xl text-stone-800 md:text-5xl">달력 보기</h1>
        </div>
        <button onClick={onOpenSettings} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm transition-colors hover:bg-stone-50">
          <Icon name="settings" size={18} />
        </button>
      </div>


      <div className="mb-3 flex items-center justify-between rounded-xl bg-white px-2 py-2 shadow-sm shrink-0">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-stone-100">
          <Icon name="chevron_left" size={18} />
        </button>
        <div className="text-center text-lg font-medium text-stone-800 md:text-2xl">
          {`${currentMonth.getFullYear()} ${currentMonth.getMonth() + 1}월`}
        </div>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-stone-100">
          <Icon name="chevron_right" size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400 md:text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day}>{day}</div>)}
      </div>

      <div className="mt-2 grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-1 overflow-hidden pb-safe">
        {Array.from({ length: firstDay }, (_, index) => <div key={`empty-${index}`} />)}
        {Array.from({ length: totalDays }, (_, index) => {
          const day = index + 1;
          const dateKey = buildDateKey(day);
          const dayTasks = tasksByDate[dateKey] ?? [];
          const nonRoutine = dayTasks.filter((task) => !task.isRoutine);
          const quadrants = getQuadrants(nonRoutine);
          const now = new Date();
          const isToday = now.getFullYear() === currentMonth.getFullYear() && now.getMonth() === currentMonth.getMonth() && now.getDate() === day;

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              className={`flex min-h-[54px] flex-col justify-between rounded-lg p-1.5 shadow-sm text-left transition-colors md:min-h-[76px] md:p-2 overflow-hidden border-2 ${isToday ? 'bg-blue-50 border-blue-500' : 'bg-white border-transparent'}`}
            >
              <span className={`text-xs font-semibold md:text-sm ${isToday ? 'text-blue-700' : 'text-stone-700'}`}>{day}</span>
              <div className="mt-1 grid flex-1 w-full grid-cols-2 grid-rows-2 gap-[2px] rounded-[2px] overflow-hidden" aria-hidden="true">
                <div className={quadrants.urgentImportant ? 'bg-rose-500' : (isToday ? 'bg-blue-200/40' : 'bg-stone-100')} />
                <div className={quadrants.important ? 'bg-sky-500' : (isToday ? 'bg-blue-200/40' : 'bg-stone-100')} />
                <div className={quadrants.urgent ? 'bg-yellow-400' : (isToday ? 'bg-blue-200/40' : 'bg-stone-100')} />
                <div className={quadrants.normal ? 'bg-emerald-400' : (isToday ? 'bg-blue-200/40' : 'bg-stone-100')} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CalendarView;
