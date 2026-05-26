export type Tag = 'urgent' | 'important';
export interface Task {
  id: string;
  title: string;
  tags: Tag[];
  startTime: string | null;
  duration: number | null;
  completed: boolean;
  isRoutine?: boolean;
  rating?: number; // 1 to 5 scale
  note?: string;
}

export interface RoutineState {
  weekday: Task[];
  weekend: Task[];
}

export type RoutineScope = 'single' | 'future';
export type RoutineAction = 'edit' | 'delete';

export interface HarvestedCrop {
  id: string; // "YYYY-MM" format
  year: number;
  month: number;
  cropName: string;
  emoji: string;
  growth: number;
  yieldCount: number;
  quality: '최상급' | '상급' | '보통' | '하급';
  health: number;
  harvestedAt: string; // ISO date string
  comment: string;
}

