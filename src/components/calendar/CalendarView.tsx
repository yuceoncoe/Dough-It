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
    const { evolutionStage, health, stats, cropName, quality, yieldCount } = state;

    // 1. 성장 단계별 & 건강 상태별 기본 문구 (서두)
    let baseComment = "";
    if (evolutionStage === 1) {
      if (health >= 80) baseComment = `흙의 상태가 비옥하고 따뜻해 씨앗이 활짝 깨어날 준비를 마쳤어요. 🌱`;
      else if (health < 40) baseComment = `흙이 많이 건조해 목이 타 들어가는 씨앗이에요. 어서 물을 듬뿍 채워주세요. 💧`;
      else baseComment = `소중한 씨앗이 흙 속에 얌전히 안착하여 성실한 하루 일정을 기다리고 있어요. 🌱`;
    } else if (evolutionStage === 2) {
      if (health >= 80) baseComment = `파릇파릇하고 싱그러운 새싹이 햇살을 받으며 무척 힘차게 자라고 있습니다! 🌿`;
      else if (health < 40) baseComment = `새싹이 다소 지쳐 힘없이 누워 있어요. 따스한 보살핌과 일정 완료가 필요해요. 🩹`;
      else baseComment = `${cropName}의 새싹이 조심스럽게 첫 고개를 내밀며 자라날 준비를 시작했어요. 🌿`;
    } else if (evolutionStage === 3) {
      if (health >= 80) baseComment = `줄기와 잎사귀에 눈부신 윤기가 흘러넘쳐요. 튼튼한 한 그루의 나무처럼 늠름하네요. 🌳✨`;
      else if (health < 40) baseComment = `성장이 조급하게 멈춰 선 기분이에요. 핵심 일정을 완료해 줄기에 에너지를 불어넣어 봐요. 💪`;
      else baseComment = `줄기가 하늘을 향해 차곡차곡 뻗어가고 있어요. 흔들림 없는 성장의 계절입니다. 🌳`;
    } else if (evolutionStage === 4) {
      if (health >= 80) {
        if (yieldCount >= 7) baseComment = `꽃망울이 터질 듯 가득 차올랐어요! 풍성하고 기분 좋은 대수확의 예감이 듭니다. 🌸✨`;
        else baseComment = `화려한 꽃을 피우기 위해 식물이 온 힘을 모으고 있어요. 상태가 무척 튼튼합니다. 😊`;
      } else if (health < 40) {
        baseComment = `꽃을 피워야 할 시기이지만 영양이 부족해 시들해요. 평점을 챙겨 식물에 힘을 실어주세요. 🩹`;
      } else baseComment = `순조롭게 꽃망울이 맺히며 곧 다가올 기분 좋은 결실의 순간을 얌전히 기다리고 있어요. 🌸`;
    } else { // 5단계 (수확)
      if (health >= 80) {
        if (quality === '최상급') baseComment = `대성공입니다! 완벽한 하루 관리 덕에 탐스러운 최상급 ${cropName}이 풍성하게 열렸어요! 🏆🎉`;
        else baseComment = `작물이 아주 건강하고 단단하게 결실을 맺었습니다. 기쁘게 수확할 완벽한 시기예요! 🧺`;
      } else if (health < 40) {
        baseComment = `조금 버거운 날씨를 견뎌내며 대견하게 열매를 지켜냈어요. 조심스레 수확을 마무리지어 주세요. 🩹`;
      } else baseComment = `기다리던 수확기가 다가왔습니다. 무사히 성장한 이 탐스러운 결실들을 기쁘게 보관함에 담아봐요! 🎉`;
    }

    // 2. 우수 / 취약 분면 진단 로직
    const quadrants = [
      { id: 'Q1', name: '줄기 성장', value: stats.growthQ1, strongDesc: '성장의 기틀이 되는 줄기가 굵고 튼튼하게 뻗어가고 있어요. 💪', weakDesc: '줄기가 가늘고 약해 성장의 중심이 흔들리고 있으니 중요·긴급한 일에 주력해 보세요. 🩹' },
      { id: 'Q2', name: '수확량 대비', value: stats.yieldQ2, strongDesc: '열매를 맺을 든든한 주머니가 꽉 채워지며 풍성한 결실을 향해 달려가고 있네요. 🧺', weakDesc: '수확할 열매 개수가 부족하여 결실의 크기가 작을 수 있으니 미래를 준비하는 일정을 챙겨봐요. 💧' },
      { id: 'Q3', name: '품질과 센스', value: stats.qualityQ3, strongDesc: '햇살을 듬뿍 머금은 듯 잎사귀가 반짝반짝 윤기가 흐르고 싱그러워요. ☀️', weakDesc: '빛깔과 퀄리티가 정체되어 시들해질 수 있으니 밀린 일정들을 신속하게 매듭짓는 게 좋아요. 🕶️' },
      { id: 'Q4', name: '건강과 루틴', value: stats.healthQ4, strongDesc: '토양이 매우 비옥하고 뿌리가 굳건해 흔들림이 전혀 없는 최상의 컨디션이에요. 🌸', weakDesc: '흙이 다소 메말라 잔뿌리가 흔들리니 마음을 차분히 가라앉히고 일상 루틴부터 정돈해 봐요. 🩹' }
    ];

    // 정렬하여 최댓값과 최솟값 구하기
    const maxVal = Math.max(stats.growthQ1, stats.yieldQ2, stats.qualityQ3, stats.healthQ4);
    const minVal = Math.min(stats.growthQ1, stats.yieldQ2, stats.qualityQ3, stats.healthQ4);

    const strongQuads = quadrants.filter(q => q.value === maxVal && maxVal >= 7);
    const weakQuads = quadrants.filter(q => q.value === minVal && minVal <= 2);

    let feedback = "";

    if (strongQuads.length > 0 && weakQuads.length > 0) {
      // 1. 우수와 취약이 모두 있을 때
      const strong = strongQuads[0];
      const weak = weakQuads[0];
      feedback = ` ${strong.strongDesc} 다만 ${weak.weakDesc}`;
    } else if (strongQuads.length > 0) {
      // 2. 우수 분면만 있을 때
      const strong = strongQuads[0];
      feedback = ` 특히 ${strong.strongDesc} 전반적인 성장 밸런스도 무척 안정적이고 좋은 흐름을 보이고 있답니다. ✨`;
    } else if (weakQuads.length > 0) {
      // 3. 취약 분면만 있을 때
      const weak = weakQuads[0];
      feedback = ` 걱정스럽게도 ${weak.weakDesc} 한 걸음씩 성장의 발걸음을 다시 내딛어 보아요.`;
    } else {
      // 4. 우수/취약이 둘 다 없는 평이한 상태 (3 ~ 6 사이)
      const avg = (stats.growthQ1 + stats.yieldQ2 + stats.qualityQ3 + stats.healthQ4) / 4;
      if (avg >= 4.5) {
        feedback = ` 특별히 모자란 부분 없이 모든 능력치가 조화롭게 다듬어져 아주 예쁘고 건강한 성장을 이어가고 있습니다! 🌟`;
      } else {
        feedback = ` 아직은 큰 특징 없이 잔잔한 시기를 보내고 있네요. 작은 루틴부터 조금씩 물을 채워나가며 식물을 돌봐줍시다. 🌱`;
      }
    }

    return baseComment + feedback;
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
