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

  const getQuadrantFeedback = (state: typeof cropState) => {
    const { stats } = state;
    const feedbackList: string[] = [];

    // 1사분면 (Q1 - 줄기 성장)
    if (stats.growthQ1 >= 7) {
      feedbackList.push("줄기가 단단하게 자라고 있어요! 💪");
    } else if (stats.growthQ1 <= 1) {
      feedbackList.push("줄기가 가늘어요. 중요·긴급한 일에 힘써보세요. 🩹");
    }

    // 2사분면 (Q2 - 수확량)
    if (stats.yieldQ2 >= 7) {
      feedbackList.push("열매 맺을 준비가 아주 든든해요! 🧺");
    } else if (stats.yieldQ2 <= 1) {
      feedbackList.push("수확 예정량이 조금 부족한 편이에요. 💧");
    }

    // 3사분면 (Q3 - 퀄리티)
    if (stats.qualityQ3 >= 7) {
      feedbackList.push("햇빛 영양이 풍부해 윤기가 돌아요! ☀️");
    } else if (stats.qualityQ3 <= 1) {
      feedbackList.push("영양이 불균형해요. 신속한 일정 해결이 필요합니다. 🕶️");
    }

    // 4사분면 (Q4 - 건강도)
    if (stats.healthQ4 >= 7) {
      feedbackList.push("토양이 비옥해 뿌리가 매우 튼튼해요! 🌸");
    } else if (stats.healthQ4 <= 1) {
      feedbackList.push("토양이 조금 척박해요. 일상 루틴을 정돈해봐요. 🩹");
    }

    if (feedbackList.length > 0) {
      return " " + feedbackList.slice(0, 2).join(" ");
    }
    return "";
  };

  const getStageComment = (state: typeof cropState) => {
    const { evolutionStage, health, yieldCount, quality, cropName } = state;
    let baseComment = "";

    // 1단계: 씨앗
    if (evolutionStage === 1) {
      if (health >= 80) {
        baseComment = `흙의 상태가 비옥하고 아주 좋아요. 싹 틔울 준비가 완벽히 되었습니다! 🌱`;
      } else if (health < 40) {
        baseComment = `흙이 많이 건조하고 목말라해요. 물(일정 완료)을 듬뿍 주세요! 💧`;
      } else {
        baseComment = `아직은 소중한 씨앗 상태예요. 일정을 실천해 새싹을 틔워보세요! 🌱`;
      }
    }
    // 2단계: 새싹
    else if (evolutionStage === 2) {
      if (health >= 80) {
        baseComment = `새싹이 파릇파릇하고 건강해요! 기특하게 잘 자라는 중입니다. 🌿`;
      } else if (health < 40) {
        baseComment = `새싹이 지쳐 보여요. 시들지 않게 물주기(일정 완료)로 가꿔주세요. 🩹`;
      } else {
        baseComment = `${cropName}의 새싹이 얼굴을 내밀었어요. 성실하게 돌봐주세요! 🌿`;
      }
    }
    // 3단계: 성장
    else if (evolutionStage === 3) {
      if (health >= 80) {
        baseComment = `줄기와 잎에 윤기가 자르르 흘러요. 아주 튼튼하게 자랄 것 같은 기분 좋은 예감! 🌳✨`;
      } else if (health < 40) {
        baseComment = `성장이 살짝 지체되어 보여요. 중요 일정(줄기 성장)으로 생기를 더해주세요! 💪`;
      } else {
        baseComment = `줄기가 곧게 뻗어 오르고 있어요. 오늘도 성실하게 내실을 다져봐요! 🌳`;
      }
    }
    // 4단계: 개화
    else if (evolutionStage === 4) {
      if (health >= 80) {
        if (yieldCount >= 7) {
          baseComment = `튼실한 꽃망울이 맺혔어요. 수확이 아주 잘 될 것 같은 예감입니다! 🌸✨`;
        } else {
          baseComment = `꽃이 곧 필 것 같아요. 식물의 상태가 매우 싱싱하고 튼튼합니다! 😊`;
        }
      } else if (health < 40) {
        baseComment = `꽃필 준비 중인데 조금 시들해요. 평점(하루 만족도)을 높여 힘을 주세요! 🩹`;
      } else {
        baseComment = `개화할 준비를 순조롭게 마쳤어요. 곧 기분 좋은 결실을 맺을 것 같네요! 🌸`;
      }
    }
    // 5단계: 수확 (Mature)
    else {
      if (health >= 80) {
        if (quality === '최상급') {
          baseComment = `대성공! 아주 탐스러운 최상급 열매가 ${yieldCount}개나 가득 열렸습니다! 🏆🎉`;
        } else {
          baseComment = `작물 상태가 매우 건강해요! 풍성한 수확을 거둘 준비를 마쳤습니다. 🧺`;
        }
      } else if (health < 40) {
        baseComment = `조금 힘겨웠지만 대견하게 버텨준 열매들을 기쁘게 수확해 주세요! 🩹`;
      } else {
        baseComment = `축하해요! 무사히 다 자랐으니 보관함으로 기쁘게 수확해 주세요! 🎉`;
      }
    }

    return baseComment + getQuadrantFeedback(state);
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
        {/* 상단 row: 식물 이미지, 단계명, 보관함 버튼 */}
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

        {/* 하단 row: 실시간 상태 코멘트 (전체 가로폭 사용) */}
        <div className="mt-3.5 pt-3 border-t border-stone-100/80 text-left">
          <p className="text-[12px] text-stone-600 leading-relaxed font-medium">
            {getStageComment(cropState)}
          </p>
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
