import React, { useEffect, useRef, useState } from 'react';
import { Task, Tag, HarvestedCrop } from '../../types';
import { Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { calculateCropState } from '../../utils/crop';
import { PixelCrop } from '../ui/PixelCrop';
import { CropArchiveModal } from '../ui/CropArchiveModal';

export const CalendarView = ({
  tasksByDate,
  onOpenSettings,
  onSelectDate,
  harvestedCrops = [],
}: {
  tasksByDate: Record<string, Task[]>;
  onOpenSettings: () => void;
  onSelectDate: (date: string) => void;
  harvestedCrops?: HarvestedCrop[];
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [archiveOpen, setArchiveOpen] = useState(false);
  
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const totalDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const buildDateKey = (day: number) => `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const getQuadrants = (tasks: Task[]) => ({
    urgentImportant: tasks.some((task) => task.tags.includes('urgent') && task.tags.includes('important')),
    normal: tasks.some((task) => !task.tags.includes('urgent') && !task.tags.includes('important')),
    urgent: tasks.some((task) => task.tags.includes('urgent') && !task.tags.includes('important')),
    important: tasks.some((task) => task.tags.includes('important') && !task.tags.includes('urgent')),
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const cropState = calculateCropState(tasksByDate, todayStr);

  const getStageName = (stage: number, name: string) => {
    if (stage === 1) return `씨앗 단계 🌱`;
    if (stage === 2) return `새싹 단계 🌿`;
    if (stage === 3) return `성장 단계 🌳`;
    if (stage === 4) return `개화 단계 🌸`;
    return `${name} 수확기! 🎉`;
  };

  return (
    <section className="flex h-full flex-col overflow-y-auto bg-[#f6f6f8] p-4 md:p-8">
      <div className="sticky top-0 z-30 mb-4 flex items-center justify-between gap-3 bg-[#f6f6f8]/95 pb-3 backdrop-blur">
        <div>
          <h1 className="font-hand text-3xl text-stone-800 md:text-5xl">달력 보기</h1>
        </div>
        <button onClick={onOpenSettings} className="rounded-full border border-stone-300 bg-white p-3 text-stone-600 shadow-sm transition-colors hover:bg-stone-50">
          <Settings size={22} />
        </button>
      </div>

      <CropArchiveModal
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        harvestedCrops={harvestedCrops}
      />

      {/* 작물 대시보드 카드 */}
      <div className="mb-4 flex flex-col rounded-3xl border border-stone-200 bg-white p-4 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0 rounded-2xl bg-stone-50 border border-stone-100 p-1">
            <PixelCrop cropState={cropState} size={84} interactive={true} />
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-stone-900 px-2 py-0.5 text-[9px] font-bold text-white whitespace-nowrap shadow-sm">
              {cropState.cropName} {cropState.emoji}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-hand text-xl text-stone-800 md:text-2xl truncate">
                {getStageName(cropState.evolutionStage, cropState.cropName)}
              </h2>
              <button
                onClick={() => setArchiveOpen(true)}
                className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full shrink-0 hover:bg-amber-100 transition-colors shadow-sm"
              >
                보관함 🧺
              </button>
            </div>
          </div>
        </div>

        {/* 4대 작물 능력치 게이지 */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 pt-3.5 border-t border-stone-100">
          {[
            { label: '줄기 성장', value: cropState.stats.growthQ1, max: 10, color: 'bg-rose-500' },
            { label: '수확량', value: cropState.stats.yieldQ2, max: 10, color: 'bg-sky-500' },
            { label: '퀄리티', value: cropState.stats.qualityQ3, max: 10, color: 'bg-yellow-400' },
            { label: '건강도', value: cropState.stats.healthQ4, max: 10, color: 'bg-emerald-400' },
          ].map((stat, i) => {
            const displayMax = Math.max(10, cropState.stats.growthQ1, cropState.stats.yieldQ2, cropState.stats.qualityQ3, cropState.stats.healthQ4);
            const percentage = (stat.value / displayMax) * 100;
            return (
              <div key={i} className="flex flex-col">
                <div className="flex justify-between items-center text-xs mb-0.5">
                  <span className="text-stone-500 font-medium flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${stat.color}`} />
                    {stat.label}
                  </span>
                  <span className="text-stone-700 font-semibold">{stat.value}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className={`h-full ${stat.color} transition-all duration-500 ease-out`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>


      <div className="mb-3 flex items-center justify-between rounded-[8px] border border-stone-200 bg-white px-2 py-2 shadow-sm shrink-0">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="rounded-full p-2 text-stone-600 transition-colors hover:bg-stone-100">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center text-lg font-medium text-stone-800 md:text-2xl">
          {`${currentMonth.getFullYear()} ${currentMonth.getMonth() + 1}월`}
        </div>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="rounded-full p-2 text-stone-600 transition-colors hover:bg-stone-100">
          <ChevronRight size={18} />
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
              className={`flex min-h-[54px] flex-col justify-between rounded-[8px] border p-1.5 text-left transition-colors md:min-h-[76px] md:p-2 ${isToday ? 'border-amber-400 bg-amber-50' : 'border-stone-200 bg-white'}`}
            >
              <span className={`text-xs font-semibold md:text-sm ${isToday ? 'text-amber-700' : 'text-stone-700'}`}>{day}</span>
              <div className="grid h-5 w-5 grid-cols-2 grid-rows-2 gap-[2px] self-end md:h-7 md:w-7">
                <div className={`rounded-tl-[3px] ${quadrants.urgentImportant ? 'bg-rose-500' : 'bg-stone-100'}`} />
                <div className={`rounded-tr-[3px] ${quadrants.urgent ? 'bg-yellow-400' : 'bg-stone-100'}`} />
                <div className={`rounded-bl-[3px] ${quadrants.important ? 'bg-sky-500' : 'bg-stone-100'}`} />
                <div className={`rounded-br-[3px] ${quadrants.normal ? 'bg-emerald-400' : 'bg-stone-100'}`} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CalendarView;
