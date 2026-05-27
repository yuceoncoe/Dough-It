import React from 'react';
import { X, Calendar as CalendarIcon, Star, ShoppingBag, Heart } from 'lucide-react';
import { HarvestedCrop } from '../../types';

interface CropArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  harvestedCrops: HarvestedCrop[];
}

export const CropArchiveModal = ({
  isOpen,
  onClose,
  harvestedCrops,
}: CropArchiveModalProps) => {
  if (!isOpen) return null;

  // Sort by harvest date descending
  const sortedCrops = [...harvestedCrops].sort((a, b) => b.id.localeCompare(a.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex h-full max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-stone-200 bg-[#e8e8ed] p-6 text-stone-900 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200/60 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <h2 className="font-hand text-2xl font-bold text-stone-800 md:text-3xl">
              나의 수확 보관함
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-stone-200 bg-white p-2.5 text-stone-500 shadow-sm transition-colors hover:bg-stone-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto py-4">
          {sortedCrops.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <ShoppingBag size={48} className="text-stone-300 animate-bounce duration-1000" />
              <h3 className="mt-4 font-semibold text-stone-700">보관함이 비어있어요</h3>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-stone-400">
                매월 계획했던 일들을 완료하여 식물을 가꾸어보세요! 한 달이 끝날 때 첫 수확물이 보관됩니다.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {sortedCrops.map((crop) => (
                <div
                  key={crop.id}
                  className="flex flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Top: Crop & Date */}
                  <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="text-left">
                        <h4 className="font-semibold text-stone-800 text-sm leading-tight">
                          {crop.cropName}
                        </h4>
                        <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-medium text-stone-400">
                          <CalendarIcon size={10} />
                          {crop.year}년 {crop.month}월
                        </span>
                      </div>
                    </div>
                    <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200">
                      {crop.quality}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 py-3 text-center border-b border-stone-100">
                    <div>
                      <span className="text-[10px] font-medium text-stone-400 block">성장도</span>
                      <span className="text-sm font-bold text-rose-500">{crop.growth}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-stone-400 block">수확량</span>
                      <span className="text-sm font-bold text-sky-500">{crop.yieldCount}개</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-stone-400 block">건강도</span>
                      <span className="text-sm font-bold text-emerald-500">{crop.health}%</span>
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="mt-2.5 flex-1 flex items-center justify-center bg-stone-50 rounded-xl p-2.5">
                    <p className="text-[11px] font-medium text-stone-600 leading-relaxed font-hand text-center">
                      "{crop.comment}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CropArchiveModal;
