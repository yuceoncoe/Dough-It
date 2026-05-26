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
    if (stage === 1) return `씨앗 단계 🌱 (1/5)`;
    if (stage === 2) return `새싹 단계 🌿 (2/5)`;
    if (stage === 3) return `성장 단계 🌳 (3/5)`;
    if (stage === 4) return `개화 단계 🌸 (4/5)`;
    return `${name} 수확기! 🎉 (5/5)`;
  };

  const getStageComment = (state: typeof cropState) => {
    const { evolutionStage, health, yieldCount, quality, cropName } = state;

    // 1단계: 씨앗
    if (evolutionStage === 1) {
      if (health >= 80) {
        return `비옥한 토양에서 싹을 틔울 준비를 마쳤어요. 식물의 상태가 아주 좋아요! 🌱`;
      }
      if (health < 40) {
        return `흙이 많이 메말라 있어요. 일정을 완료해서 시원한 물을 듬뿍 주세요! 💧`;
      }
      return `아직은 작고 소중한 씨앗이에요. 일정을 실천해서 새싹을 틔워보세요! 🌱`;
    }

    // 2단계: 새싹
    if (evolutionStage === 2) {
      if (health >= 80) {
        return `새싹이 아주 파릇파릇하고 건강해요! 기특하게 쑥쑥 크고 있습니다. 🌿`;
      }
      if (health < 40) {
        return `새싹이 시들지 않도록 물주기(일정 완료)와 관심이 필요한 상태예요. 🩹`;
      }
      return `${cropName}의 귀여운 새싹이 자라나고 있어요. 애정을 담아 보살펴주세요! 🌿`;
    }

    // 3단계: 성장
    if (evolutionStage === 3) {
      if (health >= 80) {
        return `줄기와 잎에 윤기가 자르르 흘러요! 지금 기세라면 아주 튼튼하게 자랄 것 같아요. 🌳✨`;
      }
      if (health < 40) {
        return `식물의 성장이 조금 지체되고 있어요. 중요한 줄기 성장을 챙겨 생기를 주세요! 💪`;
      }
      return `잎사귀가 튼튼하게 뻗어나가고 있어요. 매일매일 성실하게 물을 주듯 가꿔봐요! 🌳`;
    }

    // 4단계: 개화
    if (evolutionStage === 4) {
      if (health >= 80) {
        if (yieldCount >= 7) {
          return `곧 엄청난 양을 거둘 수 있을 만큼 튼실한 꽃봉오리들이 맺혔어요! 수확이 아주 잘 될 것 같아요. 🌸✨`;
        }
        return `예쁜 꽃망울이 터지기 직전이에요. 식물의 상태가 매우 싱싱하고 좋습니다! 😊`;
      }
      if (health < 40) {
        return `꽃이 필 준비를 하고 있지만 기력이 조금 약해요. 좋은 일정 평점으로 생기를 채워주세요! 🩹`;
      }
      return `꽃봉오리가 맺혀 개화할 준비를 마쳤어요. 조만간 기분 좋은 수확을 할 수 있을 것 같네요! 🌸`;
    }

    // 5단계: 수확 (Mature)
    if (health >= 80) {
      if (quality === '최상급') {
        return `최고의 관리 덕분에 탐스러운 최상급 작물이 ${yieldCount}개나 가득 열렸습니다! 🏆🎉`;
      }
      return `작물 상태가 최상이에요! 풍성한 결실을 맺어 수확 준비를 완벽히 끝마쳤습니다. 🧺`;
    }
    if (health < 40) {
      return `상태는 조금 지쳐 보이지만, 끝까지 자라난 대견한 열매들을 기쁘게 수확해 주세요! 🩹`;
    }
    return `축하해요! ${cropName}가 무사히 잘 자라주었습니다. 보관함으로 기쁘게 수확할 시간이에요! 🎉`;
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
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 text-left">
                <h2 className="font-hand text-xl text-stone-800 md:text-2xl truncate">
                  {getStageName(cropState.evolutionStage, cropState.cropName)}
                </h2>
                <p className="mt-1.5 text-xs text-stone-500 leading-relaxed font-medium">
                  {getStageComment(cropState)}
                </p>
              </div>
              <button
                onClick={() => setArchiveOpen(true)}
                className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full shrink-0 hover:bg-amber-100 transition-colors shadow-sm"
              >
                보관함 🧺
              </button>
            </div>
          </div>
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
