import React, { useEffect } from 'react';
import { X, Sparkles, Award, ShoppingBag, Heart } from 'lucide-react';
import { CropState, getCropComment } from '../../utils/crop';
import PixelCrop from './PixelCrop';
import { playHarpChime } from '../../utils/audio';

interface HarvestModalProps {
  cropState: CropState;
  year: number;
  month: number;
  onHarvest: () => void;
}

export const HarvestModal = ({
  cropState,
  year,
  month,
  onHarvest,
}: HarvestModalProps) => {
  // Play chime on mount to celebrate success
  useEffect(() => {
    playHarpChime();
  }, []);

  const comment = getCropComment(
    cropState.cropName,
    cropState.growth,
    cropState.yieldCount,
    cropState.quality,
    cropState.health
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/40 bg-white/90 p-6 text-stone-900 shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-300">
        
        {/* Decorative Sparkles */}
        <div className="absolute right-6 top-6 text-amber-500 animate-pulse">
          <Sparkles size={24} />
        </div>

        <div className="text-center">
          <span className="inline-block rounded-full bg-amber-50 px-3.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
            {year}년 {month}월 결산
          </span>
          <h2 className="mt-3 font-hand text-3xl font-bold tracking-wide text-stone-800">
            작물 수확 완료! {cropState.emoji}
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            한 달 동안의 실천과 노력의 결실을 맺었습니다.
          </p>
        </div>

        {/* Visual Crop Renderer */}
        <div className="my-6 flex flex-col items-center justify-center rounded-2xl bg-stone-50/80 border border-stone-100 py-6 relative">
          <PixelCrop cropState={cropState} size={100} interactive={false} />
          <div className="mt-2 text-center">
            <span className="font-hand text-xl font-bold text-stone-700">
              {cropState.cropName}
            </span>
          </div>
        </div>

        {/* 4대 스탯 평가 결과 */}
        <div className="space-y-3.5">
          {/* 성장도 */}
          <div className="rounded-xl border border-stone-100 bg-white p-3 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-rose-50 p-2 text-rose-500">
                <Sparkles size={16} />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-stone-400">성장도 (Q1)</p>
                <p className="text-sm font-semibold text-stone-700">최종 성장</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-rose-600">{cropState.growth}%</span>
            </div>
          </div>

          {/* 수확량 */}
          <div className="rounded-xl border border-stone-100 bg-white p-3 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-sky-50 p-2 text-sky-500">
                <ShoppingBag size={16} />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-stone-400">수확량 (Q2)</p>
                <p className="text-sm font-semibold text-stone-700">작물 수집</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-sky-600">{cropState.yieldCount}개</span>
            </div>
          </div>

          {/* 퀄리티 */}
          <div className="rounded-xl border border-stone-100 bg-white p-3 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-amber-50 p-2 text-amber-500">
                <Award size={16} />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-stone-400">퀄리티 (Q3)</p>
                <p className="text-sm font-semibold text-stone-700">작물 등급</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {cropState.quality}
              </span>
            </div>
          </div>

          {/* 건강도 */}
          <div className="rounded-xl border border-stone-100 bg-white p-3 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-500">
                <Heart size={16} />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-stone-400">건강도 (Q4)</p>
                <p className="text-sm font-semibold text-stone-700">식물 컨디션</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-emerald-600">{cropState.health}%</span>
            </div>
          </div>
        </div>

        {/* 종합 총평 다이어리 */}
        <div className="mt-5 rounded-2xl bg-amber-50/50 border border-amber-100/50 p-4 text-center">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">농장 일지 코멘트</p>
          <p className="text-sm font-medium leading-relaxed text-stone-700 font-hand">
            {comment}
          </p>
        </div>

        {/* 수확 버튼 */}
        <button
          onClick={onHarvest}
          className="mt-6 w-full rounded-2xl bg-stone-900 py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          수확물 보관함에 보관하기 🧺
        </button>

      </div>
    </div>
  );
};

export default HarvestModal;
