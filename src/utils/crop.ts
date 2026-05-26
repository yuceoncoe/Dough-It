import { Task } from '../types';
import { getTaskReportQuadrant, ReportQuadrantKey } from './report';

export interface CropInfo {
  month: number;
  name: string;
  emoji: string;
}

export const CROP_BY_MONTH: Record<number, CropInfo> = {
  1: { month: 1, name: '달콤 딸기', emoji: '🍓' },
  2: { month: 2, name: '상큼 귤', emoji: '🍊' },
  3: { month: 3, name: '아삭 새싹채소', emoji: '🌱' },
  4: { month: 4, name: '분홍 벚꽃나무', emoji: '🌸' },
  5: { month: 5, name: '붉은 장미', emoji: '🌹' },
  6: { month: 6, name: '초록 매실', emoji: '🟢' },
  7: { month: 7, name: '시원 수박', emoji: '🍉' },
  8: { month: 8, name: '노란 옥수수', emoji: '🌽' },
  9: { month: 9, name: '황금 해바라기', emoji: '🌻' },
  10: { month: 10, name: '달콤 감', emoji: '🍅' },
  11: { month: 11, name: '달달 고구마', emoji: '🍠' },
  12: { month: 12, name: '빨간 동백꽃', emoji: '🌺' },
};

export interface CropState {
  month: number;
  cropName: string;
  emoji: string;
  growth: number;      // 0 to 100
  yieldCount: number;  // 1 to 10
  quality: '최상급' | '상급' | '보통' | '하급';
  health: number;      // 0 to 100
  evolutionStage: 1 | 2 | 3 | 4 | 5; // 1: 씨앗, 2: 새싹, 3: 성장, 4: 개화, 5: 수확
  stats: {
    growthQ1: number;
    yieldQ2: number;
    qualityQ3: number;
    healthQ4: number;
  };
  todayDiary: string;
}

export const getEvolutionStage = (growth: number): 1 | 2 | 3 | 4 | 5 => {
  if (growth < 15) return 1; // Seed
  if (growth < 40) return 2; // Sprout
  if (growth < 70) return 3; // Growing
  if (growth < 100) return 4; // Blooming
  return 5; // Mature / Harvestable
};

export const generateCropDiaryComment = (todayTasks: Task[]): string => {
  const completedTasks = todayTasks.filter((t) => t.completed);
  if (completedTasks.length === 0) {
    return '오늘 하루는 작물도 나도 푹 쉬어가는 날이야 💤 내일 물을 주며 다시 튼튼하게 키워보자!';
  }

  const completedRatedTasks = completedTasks.filter((t) => t.rating !== undefined);
  const avgRating = completedRatedTasks.length > 0
    ? completedRatedTasks.reduce((sum, t) => sum + (t.rating ?? 0), 0) / completedRatedTasks.length
    : null;

  let q1 = 0; // urgentImportant (Growth)
  let q2 = 0; // important (Yield)
  let q3 = 0; // urgent (Quality)
  let q4 = 0; // normal (Health)

  completedTasks.forEach((task) => {
    const quad = getTaskReportQuadrant(task);
    if (quad === 'urgentImportant') q1++;
    else if (quad === 'important') q2++;
    else if (quad === 'urgent') q3++;
    else if (quad === 'normal') q4++;
  });

  const maxVal = Math.max(q1, q2, q3, q4);
  let dominantType: ReportQuadrantKey | 'none' = 'none';
  if (maxVal > 0) {
    if (maxVal === q1) dominantType = 'urgentImportant';
    else if (maxVal === q2) dominantType = 'important';
    else if (maxVal === q3) dominantType = 'urgent';
    else if (maxVal === q4) dominantType = 'normal';
  }

  if (avgRating !== null && avgRating < 3.0) {
    return '오늘 일정 중에 조금 벅찼던 순간이 있었나봐. 시든 잎을 다듬어주듯이, 내일은 조금 더 부드럽게 보살펴줄게 🩹';
  }

  switch (dominantType) {
    case 'urgentImportant':
      return `오늘은 중요하고 긴급한 일(줄기 성장)을 ${q1}개나 클리어했어! 쑥쑥 자라나는 작물처럼 내 하루도 힘차게 성장했네 🌱✨`;
    case 'important':
      return `미래를 위해 정말 중요한 일(풍성한 수확 대비)을 ${q2}개 완료! 열매가 맺힐 준비를 단단히 채워가고 있어 🍇💪`;
    case 'urgent':
      return `빠른 피드백과 센스가 필요한 일(고품질 햇빛 영양)을 ${q3}개 신속 처리! 반짝반짝 작물의 윤기가 도는 느낌이야 ☀️🕶️`;
    case 'normal':
      return `소소하지만 평화로운 일상(비옥한 토양 가꾸기)을 ${q4}개 해냈어. 촉촉하게 물을 주듯 차분히 내실을 다진 하루 🌸💧`;
    default:
      return `오늘 한 일들이 차곡차곡 쌓여 작물에 튼튼한 거름이 되었어! 내일도 즐겁게 가꾸어보자 🚀🌟`;
  }
};

export const calculateCropState = (tasksByDate: Record<string, Task[]>, targetDateStr: string): CropState => {
  const [targetYear, targetMonthStr] = targetDateStr.split('-');
  const targetYearNum = parseInt(targetYear, 10);
  const targetMonthNum = parseInt(targetMonthStr, 10);

  const cropInfo = CROP_BY_MONTH[targetMonthNum] || { month: targetMonthNum, name: '신비의 작물', emoji: '🌱' };

  let growthQ1 = 0;
  let yieldQ2 = 0;
  let qualityQ3 = 0;
  let healthQ4 = 0;
  let totalTasksThisMonth = 0;
  let completedTasksThisMonth = 0;
  let totalRatingsThisMonth = 0;
  let ratedTasksCountThisMonth = 0;

  // Filter tasks in the current calendar month
  const targetMonthPrefix = `${targetYear}-${targetMonthStr}`;
  Object.entries(tasksByDate).forEach(([dateStr, dateTasks]) => {
    if (dateStr.startsWith(targetMonthPrefix)) {
      const safeTasks = Array.isArray(dateTasks) ? dateTasks : [];
      safeTasks.forEach((task) => {
        totalTasksThisMonth++;
        if (task.completed) {
          completedTasksThisMonth++;
          const quad = getTaskReportQuadrant(task);
          if (quad === 'urgentImportant') growthQ1++;
          else if (quad === 'important') yieldQ2++;
          else if (quad === 'urgent') qualityQ3++;
          else if (quad === 'normal') healthQ4++;

          if (task.rating !== undefined) {
            totalRatingsThisMonth += task.rating;
            ratedTasksCountThisMonth++;
          }
        }
      });
    }
  });

  const averageRating = ratedTasksCountThisMonth > 0 ? totalRatingsThisMonth / ratedTasksCountThisMonth : null;
  const uncompletedTasksCount = totalTasksThisMonth - completedTasksThisMonth;

  // Calculations
  // 1. Growth (0 to 100)
  // Each Q1 completed gives 12% progress. Others give 2% progress.
  const growth = Math.min(100, (growthQ1 * 12) + (yieldQ2 * 2) + (qualityQ3 * 2) + (healthQ4 * 2));

  // 2. Yield (1 to 10)
  // Q2 completed + small Q1 contribution
  const yieldCount = Math.max(1, Math.min(10, 1 + yieldQ2 * 1 + Math.floor(growthQ1 * 0.2)));

  // 3. Quality (최상급, 상급, 보통, 하급)
  // Q3 completed + average Rating
  const qualityRaw = (qualityQ3 * 6) + (averageRating ? (averageRating - 2.5) * 12 : 0);
  let quality: '최상급' | '상급' | '보통' | '하급' = '보통';
  if (qualityRaw >= 35) {
    quality = '최상급';
  } else if (qualityRaw >= 18) {
    quality = '상급';
  } else if (qualityRaw >= 5) {
    quality = '보통';
  } else {
    quality = '하급';
  }

  // 4. Health (0 to 100)
  // Q4 completed + growthQ1 - uncompleted tasks penalty
  const health = Math.max(0, Math.min(100, 60 + (healthQ4 * 8) - (uncompletedTasksCount * 3)));

  // Evolution stage
  const evolutionStage = getEvolutionStage(growth);

  // Today's tasks (for mood and diary)
  const todayTasks = tasksByDate[targetDateStr] ?? [];
  const todayDiary = generateCropDiaryComment(todayTasks);

  return {
    month: targetMonthNum,
    cropName: cropInfo.name,
    emoji: cropInfo.emoji,
    growth,
    yieldCount,
    quality,
    health,
    evolutionStage,
    stats: {
      growthQ1,
      yieldQ2,
      qualityQ3,
      healthQ4,
    },
    todayDiary,
  };
};

export const getCropComment = (
  cropName: string,
  growth: number,
  yieldCount: number,
  quality: '최상급' | '상급' | '보통' | '하급',
  health: number
): string => {
  if (growth < 70) {
    return `바쁜 일상 중에도 ${cropName}의 새싹을 틔웠어요. 다음 달에는 조금 더 많은 보살핌을 주면 활짝 필 거예요! 🌱`;
  }
  if (quality === '최상급' && health >= 85) {
    return `축하해요! 완벽한 하루 관리 덕분에 건강 수치 ${health}%의 눈부신 ${quality} ${cropName} ${yieldCount}개를 수확했습니다! 🏆✨`;
  }
  if (quality === '최상급' || quality === '상급') {
    return `중요한 일들을 성실히 달성하여 고품질의 ${cropName} ${yieldCount}개를 멋지게 수확해 냈어요! 훌륭한 한 달이었습니다 🌟`;
  }
  if (health < 40) {
    return `물주기와 비옥한 토양 관리가 조금 부족했지만, 끈질기게 자란 ${cropName} ${yieldCount}개를 무사히 수확했습니다 🩹`;
  }
  return `계절의 변화와 계획을 실천하며 평화로운 가을 햇살 아래 ${cropName} ${yieldCount}개를 안정적으로 수확했습니다 🧺`;
};
