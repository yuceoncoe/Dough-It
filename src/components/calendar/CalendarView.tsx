import React, { useEffect, useRef, useState } from 'react';
import { Task, Tag, HarvestedCrop } from '../../types';
import { Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { calculateCropState } from '../../utils/crop';
import { PixelCrop } from '../ui/PixelCrop';
import { CropArchiveModal } from '../ui/CropArchiveModal';
import { CropPokedexModal } from '../ui/CropPokedexModal';

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
  const [pokedexOpen, setPokedexOpen] = useState(false);
  
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

  const getStageName = (stage: number, name: string, month: number) => {
    const isFlowerType = month === 4 || month === 5 || month === 9 || month === 12;

    if (stage === 1) return `씨앗 단계 (1/8)`;
    if (stage === 2) return `발아 단계 (2/8)`;
    if (stage === 3) return `새싹 단계 (3/8)`;
    if (stage === 4) return `묘목 단계 (4/8)`;
    if (stage === 5) return `성장 단계 (5/8)`;
    if (stage === 6) return isFlowerType ? `꽃봉오리 단계 (6/8)` : `아기 열매 단계 (6/8)`;
    if (stage === 7) return isFlowerType ? `개화 단계 (7/8)` : `설익은 열매 단계 (7/8)`;
    return `${name} 수확기! (8/8)`;
  };

  const getStageComment = (state: typeof cropState) => {
    const { evolutionStage, health, stats, cropName, quality, yieldCount, month } = state;
    const isFlowerType = month === 4 || month === 5 || month === 9 || month === 12;

    // 1. 기본 서두 문구 극소화
    let baseComment = "";
    if (evolutionStage === 1) {
      if (health >= 80) baseComment = `씨앗이 싹 틔울 준비를 마쳤어요.`;
      else if (health < 40) baseComment = `흙이 메말라 씨앗이 목말라해요. 물을 주세요!`;
      else baseComment = `씨앗이 하루 일정을 기다리고 있어요.`;
    } else if (evolutionStage === 2) {
      if (health >= 80) baseComment = `작은 싹이 껍질을 깨고 나오려 해요! 힘찬 시작입니다.`;
      else if (health < 40) baseComment = `싹이 나오려 하지만 수분이 매우 부족해요.`;
      else baseComment = `흙 틈 사이로 아주 작은 연둣빛 싹이 삐죽 고개를 내밀었어요.`;
    } else if (evolutionStage === 3) {
      if (health >= 80) baseComment = `새싹이 파릇파릇하고 건강하게 자라는 중입니다!`;
      else if (health < 40) baseComment = `새싹이 시들해 보여 물주기가 시급해요.`;
      else baseComment = `${cropName}의 새싹이 자라나기 시작했어요.`;
    } else if (evolutionStage === 4) {
      if (health >= 80) baseComment = `잎사귀가 점점 늘어나며 묘목이 되어가고 있어요!`;
      else if (health < 40) baseComment = `어린 이파리들이 메마르지 않게 보살펴 주세요.`;
      else baseComment = `어엿한 아기 작물의 형태를 갖추어가고 있습니다.`;
    } else if (evolutionStage === 5) {
      if (health >= 80) baseComment = `줄기와 잎사귀에 윤기가 흘러넘쳐요!`;
      else if (health < 40) baseComment = `성장이 정체되었으니 핵심 일정을 챙겨주세요.`;
      else baseComment = `줄기가 위를 향해 곧게 뻗어가고 있어요.`;
    } else if (evolutionStage === 6) {
      if (isFlowerType) {
        if (health >= 80) baseComment = `영양분을 듬뿍 머금은 꽃봉오리가 맺혔어요. 곧 꽃이 피겠어요!`;
        else if (health < 40) baseComment = `꽃을 피우기 위해 더 많은 보살핌이 필요해요.`;
        else baseComment = `줄기 끝에 조그맣고 소중한 꽃봉오리가 생겼습니다.`;
      } else {
        if (health >= 80) baseComment = `꽃이 지고 푸른 아기 열매가 빼꼼 고개를 내밀었습니다!`;
        else if (health < 40) baseComment = `아기 열매가 맺혔으나 물이 모자라 시들해요.`;
        else baseComment = `줄기 사이에 아주 작은 아기 열매가 생겼어요.`;
      }
    } else if (evolutionStage === 7) {
      if (isFlowerType) {
        if (health >= 80) {
          if (yieldCount >= 7) baseComment = `꽃망울이 터질 듯해 대수확이 예상됩니다!`;
          else baseComment = `꽃 피울 준비가 된 싱싱한 상태예요.`;
        } else if (health < 40) baseComment = `꽃이 필 시기이지만 시들해 관리가 필요해요.`;
        else baseComment = `순조롭게 꽃망울이 맺히며 결실을 준비하고 있어요.`;
      } else {
        if (health >= 80) {
          baseComment = `열매가 굵어지고 알맞게 설익어 색이 도는 중입니다!`;
        } else if (health < 40) baseComment = `열매가 자라나는 중요한 시기인데 시들시들해요.`;
        else baseComment = `열매가 제법 탐스러운 형태를 갖춰가며 물들어갑니다.`;
      }
    } else { // 8단계 (수확)
      if (health >= 80) {
        if (quality === '최상급') baseComment = `대성공! 탐스러운 최상급 작물이 열렸어요!`;
        else baseComment = `작물이 건강하게 자라 수확할 완벽한 시기예요!`;
      } else if (health < 40) baseComment = `버거운 날씨를 버텨내 준 작물을 수확해 주세요.`;
      else baseComment = `무사히 다 자란 결실들을 보관함에 수확해 보세요!`;
    }

    // 2. 우수 / 취약 분면 압축 진단 로직
    const quadrants = [
      { id: 'Q1', value: stats.growthQ1, strongDesc: '줄기가 단단히 뻗는 중', weakDesc: '줄기 보강 필요' },
      { id: 'Q2', value: stats.yieldQ2, strongDesc: '열매 주머니 든든', weakDesc: '열매 대비 필요' },
      { id: 'Q3', value: stats.qualityQ3, strongDesc: '잎사귀 윤기 풍부', weakDesc: '윤기/품질 정체' },
      { id: 'Q4', value: stats.healthQ4, strongDesc: '뿌리가 단단히 밀착', weakDesc: '일상 루틴 정돈 필요' }
    ];

    const maxVal = Math.max(stats.growthQ1, stats.yieldQ2, stats.qualityQ3, stats.healthQ4);
    const minVal = Math.min(stats.growthQ1, stats.yieldQ2, stats.qualityQ3, stats.healthQ4);

    const strongQuads = quadrants.filter(q => q.value === maxVal && maxVal >= 7);
    const weakQuads = quadrants.filter(q => q.value === minVal && minVal <= 2);

    let feedback = "";

    if (strongQuads.length > 0 && weakQuads.length > 0) {
      feedback = ` ${strongQuads[0].strongDesc}이나, ${weakQuads[0].weakDesc} 상태예요.`;
    } else if (strongQuads.length > 0) {
      feedback = ` ${strongQuads[0].strongDesc}이며 균형도 안정적입니다.`;
    } else if (weakQuads.length > 0) {
      feedback = ` ${weakQuads[0].weakDesc} 상태이니 관리가 필요해요.`;
    } else {
      const avg = (stats.growthQ1 + stats.yieldQ2 + stats.qualityQ3 + stats.healthQ4) / 4;
      feedback = avg >= 4.5
        ? ` 모든 요소가 고르게 발달한 건강한 상태입니다.`
        : ` 잔잔한 성장기이니 가벼운 루틴부터 챙겨주세요.`;
    }

    return `${baseComment}${feedback}`;
  };

  return (
    <section className="flex h-full flex-col overflow-y-auto bg-[#e8e8ed] p-4 md:p-8">
      <div className="sticky top-0 z-30 mb-4 flex items-center justify-between gap-3 bg-[#e8e8ed]/95 pb-3 backdrop-blur">
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
      <CropPokedexModal
        isOpen={pokedexOpen}
        onClose={() => setPokedexOpen(false)}
        currentMonth={cropState.month}
      />

      {/* 작물 대시보드 카드 */}
      <div className="mb-4 flex flex-col rounded-3xl border border-stone-200 bg-white p-4 shadow-sm shrink-0">
        {/* 상단 row: 식물 이미지, 단계명, 보관함 버튼 */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0 rounded-2xl bg-stone-50 border border-stone-100 p-1">
            <PixelCrop cropState={cropState} size={84} interactive={true} />
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-stone-900 px-2 py-0.5 text-[9px] font-bold text-white whitespace-nowrap shadow-sm">
              {cropState.cropName}
            </div>
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col items-start justify-center gap-1.5">
            <h2 className="font-hand text-xl text-stone-800 md:text-2xl truncate w-full">
              {getStageName(cropState.evolutionStage, cropState.cropName, cropState.month)}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setArchiveOpen(true)}
                className="text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors shrink-0"
              >
                보관함 보기 &gt;
              </button>
              <span className="text-stone-300 text-xs">|</span>
              <button
                onClick={() => setPokedexOpen(true)}
                className="text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors shrink-0"
              >
                도감 보기 &gt;
              </button>
            </div>
          </div>
        </div>

        {/* 하단 row: 실시간 상태 코멘트 (전체 가로폭 사용, 뱃지 없이 자연스러운 진단 내용 출력) */}
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
