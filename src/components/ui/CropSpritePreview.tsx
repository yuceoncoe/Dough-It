import React from 'react';
import PixelCrop from './PixelCrop';
import { CROP_BY_MONTH, CropState } from '../../utils/crop';

export const CropSpritePreview = () => {
  const stages = [1, 2, 3, 4, 5, 6, 7, 8];

  const getMockCropState = (month: number, stage: number): CropState => {
    const cropInfo = CROP_BY_MONTH[month] || { month, name: '작물', emoji: '' };
    return {
      month,
      cropName: cropInfo.name,
      emoji: cropInfo.emoji,
      growth: stage === 1 ? 5 : stage === 2 ? 15 : stage === 3 ? 30 : stage === 4 ? 50 : stage === 5 ? 65 : stage === 6 ? 80 : stage === 7 ? 95 : 100,
      yieldCount: 5,
      quality: '최상급',
      health: 90,
      evolutionStage: stage as any,
      stats: {
        growthQ1: 5,
        yieldQ2: 5,
        qualityQ3: 5,
        healthQ4: 5,
      },
      todayDiary: '',
    };
  };

  return (
    <div className="min-h-screen bg-[#f6f6f8] p-6 md:p-12 text-stone-900 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-hand text-4xl font-bold text-stone-800">식물 도감 & 스프라이트 미리보기</h1>
            <p className="text-sm text-stone-500 mt-1">1월부터 12월까지 모든 작물의 1~8단계 성장 모습입니다.</p>
          </div>
          <a
            href="/"
            className="rounded-2xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-stone-800 transition-colors"
          >
            메인 화면으로 돌아가기
          </a>
        </div>

        <div className="space-y-6">
          {Object.keys(CROP_BY_MONTH).map((mKey) => {
            const m = parseInt(mKey, 10);
            const crop = CROP_BY_MONTH[m];
            return (
              <div key={m} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 border-b border-stone-100 pb-2">
                  <span className="font-bold text-lg text-stone-800">{m}월: {crop.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                  {stages.map((stage) => {
                    const state = getMockCropState(m, stage);
                    return (
                      <div key={stage} className="flex flex-col items-center justify-between rounded-2xl bg-stone-50/50 border border-stone-100/50 p-3 hover:bg-stone-50 transition-colors">
                        <span className="text-[10px] font-bold text-stone-400">Stage {stage}</span>
                        <div className="my-2 flex items-center justify-center">
                          <PixelCrop cropState={state} size={70} interactive={false} />
                        </div>
                        <span className="text-[10px] font-semibold text-stone-600 bg-white px-2 py-0.5 rounded-full shadow-sm ring-1 ring-black/5">
                          {stage === 1 && '씨앗'}
                          {stage === 2 && '발아'}
                          {stage === 3 && '새싹'}
                          {stage === 4 && '묘목'}
                          {stage === 5 && '성장'}
                          {stage === 6 && (m === 4 || m === 5 || m === 9 || m === 12 ? '봉오리' : '아기열매')}
                          {stage === 7 && (m === 4 || m === 5 || m === 9 || m === 12 ? '개화' : '설익음')}
                          {stage === 8 && '수확기'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CropSpritePreview;
