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

