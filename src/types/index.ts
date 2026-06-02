export type Tag = 'urgent' | 'important';
export interface Task {
  id: string;
  title: string;
  tags: Tag[];
  startTime: string | null;
  duration: number | null;
  completed: boolean;
  isRoutine?: boolean;
  routineDays?: number[]; // 0: Sunday, ..., 6: Saturday
  activeFromDate?: string;
  rating?: number; // 1 to 5 scale
  note?: string;
}

export type RoutineState = Task[];

export type RoutineScope = 'single' | 'future';
export type RoutineAction = 'edit' | 'delete';

