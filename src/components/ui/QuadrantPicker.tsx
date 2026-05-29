import React from 'react';
import { Tag } from '../../types';
import { getToneTags, getToneSelectionKey } from '../../utils/task';

const QUADRANTS = [
  { key: 'urgent-important', label: '긴급+중요', activeClass: 'bg-rose-100 text-rose-900' },
  { key: 'urgent', label: '긴급', activeClass: 'bg-yellow-100 text-yellow-900' },
  { key: 'important', label: '중요', activeClass: 'bg-sky-100 text-sky-900' },
  { key: 'normal', label: '일반', activeClass: 'bg-emerald-100 text-emerald-900' },
] as const;

export const QuadrantPicker = ({
  tags,
  onSelect,
  buttonType = 'button',
}: {
  tags: Tag[];
  onSelect: (tags: Tag[]) => void;
  buttonType?: 'button' | 'submit';
}) => {
  const currentKey = getToneSelectionKey(tags);

  return (
    <div className="quadrant-grid">
      {QUADRANTS.map((q) => (
        <button
          key={q.key}
          type={buttonType}
          onClick={() => onSelect(getToneTags(q.key))}
          className={`px-4 py-5 text-center text-sm font-medium transition-colors ${
            currentKey === q.key ? q.activeClass : 'bg-white text-stone-600 hover:bg-stone-50'
          }`}
        >
          {q.label}
        </button>
      ))}
    </div>
  );
};

export default QuadrantPicker;
