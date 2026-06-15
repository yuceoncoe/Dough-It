const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const isTaskPassed = (task, taskDate, currentMinutes) => {
  const today = getTodayString();
  console.log("today:", today);
  console.log("taskDate:", taskDate);
  if (taskDate < today) return true;
  if (taskDate > today) return false;
  if (!task.startTime || !task.duration) return false;

  const start = timeToMinutes(task.startTime);
  const end = start + task.duration;
  if (task.duration >= 1440 || end > 1440) return false;

  return currentMinutes > end;
};

const task = {
  id: 'task-1',
  title: 'test',
  tags: ['urgent'],
  startTime: '15:20',
  duration: 90,
  completed: false,
  isRoutine: false,
};

console.log(isTaskPassed(task, "2026-06-08", 426));
