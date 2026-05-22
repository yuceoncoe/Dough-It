import { Task } from '../types';
import { getTaskReportQuadrant } from './report';

export type PetMood = 'sleepy' | 'excited' | 'happy' | 'reflective';
export type PetStatType = 'strength' | 'intelligence' | 'agility' | 'emotion' | 'none';

export interface PetState {
  level: number;
  totalExp: number;
  currentLevelExp: number;
  nextLevelExp: number;
  progress: number; // 0 to 100 percentage
  stats: {
    strength: number;      // Q1 (urgent + important)
    intelligence: number;  // Q2 (important)
    agility: number;       // Q3 (urgent)
    emotion: number;       // Q4 (normal)
  };
  evolutionStage: 1 | 2 | 3 | 4 | 5; // 1: Egg, 2: Baby, 3: Child, 4: Teen, 5: Adult
  dominantStat: PetStatType;
  mood: PetMood;
  todayDiary: string;
}

// Level EXP requirements
// Lv 1: 50 EXP
// Lv 2: 100 EXP
// Lv 3: 150 EXP
// Lv 4: 200 EXP
// Lv 5+: 250 EXP each
export const getLevelInfo = (totalExp: number) => {
  let level = 1;
  let expRemaining = totalExp;

  while (true) {
    let required = 250;
    if (level === 1) required = 50;
    else if (level === 2) required = 100;
    else if (level === 3) required = 150;
    else if (level === 4) required = 200;

    if (expRemaining >= required) {
      expRemaining -= required;
      level++;
    } else {
      return {
        level,
        currentLevelExp: expRemaining,
        nextLevelExp: required,
        progress: required > 0 ? Math.min(100, Math.round((expRemaining / required) * 100)) : 0,
      };
    }
  }
};

export const getEvolutionStage = (level: number): 1 | 2 | 3 | 4 | 5 => {
  if (level === 1) return 1; // Egg
  if (level <= 3) return 2;  // Baby
  if (level <= 6) return 3;  // Child
  if (level <= 9) return 4;  // Teen
  return 5;                  // Adult
};

export const getPetMood = (todayTasks: Task[]): PetMood => {
  const completedRatedTasks = todayTasks.filter((t) => t.completed && t.rating !== undefined);
  if (completedRatedTasks.length === 0) {
    return 'sleepy';
  }

  const sumRatings = completedRatedTasks.reduce((sum, t) => sum + (t.rating ?? 0), 0);
  const avg = sumRatings / completedRatedTasks.length;

  if (avg >= 4.5) return 'excited';
  if (avg >= 3.0) return 'happy';
  return 'reflective';
};

export const generateDiaryComment = (todayTasks: Task[]): string => {
  const completedTasks = todayTasks.filter((t) => t.completed);
  if (completedTasks.length === 0) {
    return '오늘 하루는 푹 쉬는 날이었네! 충전 완료🔋 내일은 함께 할 일들을 채워볼까? Zzz..';
  }

  const completedRatedTasks = completedTasks.filter((t) => t.rating !== undefined);
  const avgRating = completedRatedTasks.length > 0
    ? completedRatedTasks.reduce((sum, t) => sum + (t.rating ?? 0), 0) / completedRatedTasks.length
    : null;

  // Count quadrants
  let q1 = 0; // urgentImportant (Strength)
  let q2 = 0; // important (Intelligence)
  let q3 = 0; // urgent (Agility)
  let q4 = 0; // normal (Emotion)

  completedTasks.forEach((task) => {
    const quad = getTaskReportQuadrant(task);
    if (quad === 'urgentImportant') q1++;
    else if (quad === 'important') q2++;
    else if (quad === 'urgent') q3++;
    else if (quad === 'normal') q4++;
  });

  const maxVal = Math.max(q1, q2, q3, q4);
  let dominantType: PetStatType = 'none';
  if (maxVal > 0) {
    if (maxVal === q2) dominantType = 'intelligence';
    else if (maxVal === q1) dominantType = 'strength';
    else if (maxVal === q3) dominantType = 'agility';
    else if (maxVal === q4) dominantType = 'emotion';
  }

  if (avgRating !== null && avgRating < 3.0) {
    return '오늘 일정 중에 마음처럼 풀리지 않은 게 있었나봐. 괜찮아, 자책하지 마! 내일 채워가면 되지 🩹';
  }

  switch (dominantType) {
    case 'intelligence':
      return `오늘은 중요하고 생산적인 일정(지능 스탯)을 ${q2}개나 완료했어! 스스로를 돌보고 계획을 키워가는 모습 최고야 🎓✨`;
    case 'strength':
      return `긴급하고 중요한 도전(근력 스탯)을 ${q1}개나 클리어했네! 눈앞의 압박을 멋지게 이겨낸 에너제틱 하루! 💪⚡`;
    case 'agility':
      return `빠른 처리가 필요한 긴급 일정(민첩성 스탯)을 ${q3}개 신속하게 클리어! 민첩하게 대처하는 능력이 대단해 🏃‍♂️💨`;
    case 'emotion':
      return `일상의 여유와 안정을 돕는 일정(감성 스탯)을 ${q4}개 해냈구나. 나만의 속도로 차분히 마음을 채워 만족스러워 🌸💚`;
    default:
      return `오늘 완료한 모든 일정들이 차곡차곡 쌓여서 든든한 하루야! 내일도 즐겁게 성장해보자! 🚀🌟`;
  }
};

export const calculatePetState = (tasksByDate: Record<string, Task[]>, todayStr: string): PetState => {
  let strength = 0;
  let intelligence = 0;
  let agility = 0;
  let emotion = 0;
  let totalCompletedTasks = 0;

  // Process all history
  Object.values(tasksByDate).forEach((dateTasks) => {
    const safeTasks = Array.isArray(dateTasks) ? dateTasks : [];
    safeTasks.forEach((task) => {
      if (task.completed) {
        totalCompletedTasks++;
        const quad = getTaskReportQuadrant(task);
        if (quad === 'urgentImportant') strength++;
        else if (quad === 'important') intelligence++;
        else if (quad === 'urgent') agility++;
        else if (quad === 'normal') emotion++;
      }
    });
  });

  const totalExp = totalCompletedTasks * 10;
  const levelInfo = getLevelInfo(totalExp);
  const evolutionStage = getEvolutionStage(levelInfo.level);

  // Determine dominant stat
  const maxStatVal = Math.max(strength, intelligence, agility, emotion);
  let dominantStat: PetStatType = 'none';
  if (maxStatVal > 0) {
    if (maxStatVal === intelligence) dominantStat = 'intelligence';
    else if (maxStatVal === strength) dominantStat = 'strength';
    else if (maxStatVal === agility) dominantStat = 'agility';
    else if (maxStatVal === emotion) dominantStat = 'emotion';
  }

  const todayTasks = tasksByDate[todayStr] ?? [];
  const mood = getPetMood(todayTasks);
  const todayDiary = generateDiaryComment(todayTasks);

  return {
    ...levelInfo,
    totalExp,
    stats: {
      strength,
      intelligence,
      agility,
      emotion,
    },
    evolutionStage,
    dominantStat,
    mood,
    todayDiary,
  };
};
