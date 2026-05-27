import React, { useState } from 'react';
import { X, BookOpen } from 'lucide-react';
import { CROP_BY_MONTH } from '../../utils/crop';
import { PixelCrop } from './PixelCrop';
import type { CropState } from '../../utils/crop';

interface CropPokedexModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonth: number;
}

const CROP_DESCRIPTIONS: Record<number, string> = {
  1: '겨울을 이기고 피어난 달콤한 딸기. 촘촘한 일상의 노력이 모여 빨갛게 익어갑니다.',
  2: '상큼한 귤은 꾸준한 루틴에서 자랍니다. 작은 일들이 쌓여 알알이 영글어요.',
  3: '봄의 첫 생명력, 새싹채소. 신선한 시작과 가벼운 실천이 파릇파릇 자라납니다.',
  4: '분홍 꽃잎만 가득 피우는 벚꽃나무. 화려한 결실을 위한 조용한 준비 기간이에요.',
  5: '가시 속에 피어난 붉은 장미. 끈기 있는 노력이 아름다운 결실을 맺게 합니다.',
  6: '초록 매실은 단단하게 여물어 갑니다. 여름의 열기를 버텨내는 인내의 열매예요.',
  7: '시원한 수박은 뻗어가는 덩굴처럼 성장합니다. 기운차게 여름을 달려가 보세요.',
  8: '노란 옥수수는 활기찬 여름의 상징. 즐겁게 달리면 탐스러운 알이 빼곡해집니다.',
  9: '황금빛 해바라기는 항상 빛을 향합니다. 목표를 향해 꾸준히 나아가는 9월입니다.',
  10: '가을 햇살이 듬뿍 든 달콤한 감. 풍요로운 결실을 위해 착실히 일과를 채워가요.',
  11: '땅속에서 조용히 자라는 고구마. 보이지 않아도 꾸준한 노력은 반드시 결실을 맺어요.',
  12: '추운 겨울에 피는 빨간 동백꽃. 한 해를 마무리하는 뜨거운 열정의 상징입니다.',
};

const makeCropPreviewState = (month: number): CropState => ({
  month,
  cropName: CROP_BY_MONTH[month]?.name ?? '',
  emoji: CROP_BY_MONTH[month]?.emoji ?? '',
  growth: 100,
  yieldCount: 7,
  quality: '상급',
  health: 80,
  evolutionStage: 8,
  stats: { growthQ1: 6, yieldQ2: 7, qualityQ3: 6, healthQ4: 6 },
  todayDiary: '',
});

export const CropPokedexModal = ({ isOpen, onClose, currentMonth }: CropPokedexModalProps) => {
  const [selected, setSelected] = useState<number | null>(null);

  if (!isOpen) return null;

  const selectedMonth = selected ?? currentMonth;
  const crop = CROP_BY_MONTH[selectedMonth];
  const previewState = makeCropPreviewState(selectedMonth);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center">
      <div className="relative flex h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] border border-stone-200 bg-[#e8e8ed] shadow-2xl animate-in slide-in-from-bottom-4 duration-300 sm:h-[85vh] sm:rounded-[2rem]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200/60 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-stone-500" />
            <h2 className="font-hand text-xl font-bold text-stone-800">작물 도감</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-stone-200 bg-white p-2 text-stone-500 shadow-sm transition-colors hover:bg-stone-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Month grid */}
        <div className="shrink-0 px-4 pt-4 pb-2">
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <button
                key={m}
                onClick={() => setSelected(m)}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-2 transition-all ${
                  selectedMonth === m
                    ? 'bg-stone-900 shadow-md'
                    : 'bg-white border border-stone-200 hover:bg-stone-50'
                }`}
              >
                <span className={`text-[10px] font-bold ${selectedMonth === m ? 'text-white' : 'text-stone-400'}`}>
                  {m}월
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Crop detail */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="flex flex-col items-center gap-4 pt-4">
            {/* Plant preview */}
            <div className="relative flex items-center justify-center rounded-3xl bg-white border border-stone-100 shadow-sm" style={{ width: 160, height: 160 }}>
              <div className="overflow-hidden rounded-full" style={{ width: 140, height: 140 }}>
                <PixelCrop cropState={previewState} size={140} interactive={false} />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-stone-900 px-3 py-0.5 text-[10px] font-bold text-white whitespace-nowrap shadow">
                {selectedMonth}월 · {crop?.name}
              </div>
            </div>

            {/* Info card */}
            <div className="w-full rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <h3 className="font-hand text-lg font-bold text-stone-800 mb-2">{crop?.name}</h3>
              <p className="text-[13px] text-stone-600 leading-relaxed">
                {CROP_DESCRIPTIONS[selectedMonth]}
              </p>
            </div>

            {/* Stats preview */}
            <div className="w-full grid grid-cols-3 gap-2">
              {[
                { label: '성장 분면', desc: 'Q1 긴급·중요', color: 'text-rose-500' },
                { label: '수확 분면', desc: 'Q2 긴급', color: 'text-yellow-500' },
                { label: '품질 분면', desc: 'Q3 중요', color: 'text-sky-500' },
              ].map((q) => (
                <div key={q.label} className="rounded-xl bg-white border border-stone-100 p-2.5 text-center shadow-sm">
                  <span className={`block text-[10px] font-bold ${q.color}`}>{q.label}</span>
                  <span className="block text-[9px] text-stone-400 mt-0.5">{q.desc}</span>
                </div>
              ))}
            </div>

            <div className="w-full rounded-2xl border border-stone-100 bg-white/70 p-3 text-center">
              <p className="text-[11px] text-stone-400 leading-relaxed">
                이 작물은 <span className="font-bold text-stone-600">{selectedMonth}월</span>에 자동으로 배정됩니다.<br />
                각 분면 일정을 꾸준히 완료하면 더 빠르게 성장해요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CropPokedexModal;
