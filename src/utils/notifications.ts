import { LocalNotifications } from '@capacitor/local-notifications';
import { Task } from '../types';
import { timeToMinutes } from './time';

export const requestNotificationPermissions = async () => {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions', error);
    return false;
  }
};

export const syncTaskAlarms = async (tasksByDate: Record<string, Task[]>) => {
  try {
    // Check if permission is granted before trying to sync
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      return;
    }

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const tasks = tasksByDate[todayKey] ?? [];
    const scheduleList: any[] = [];
    let idCounter = 1;

    tasks.forEach(task => {
      if (!task.startTime || !task.duration) return;

      const [hour, min] = task.startTime.split(':').map(Number);
      const startTimeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, min, 0);
      const endTimeDate = new Date(startTimeDate.getTime() + task.duration * 60000);

      if (startTimeDate.getTime() > now.getTime()) {
        scheduleList.push({
          id: idCounter++,
          title: '일정 시작',
          body: `지금부터 [${task.title}] 일정이 시작됩니다!`,
          schedule: { at: startTimeDate },
        });
      }

      if (endTimeDate.getTime() > now.getTime()) {
        scheduleList.push({
          id: idCounter++,
          title: '일정 종료',
          body: `[${task.title}] 일정이 끝났습니다. 앱에 들어가서 평가를 완료해주세요!`,
          schedule: { at: endTimeDate },
        });
      }
    });

    if (scheduleList.length > 0) {
      await LocalNotifications.schedule({ notifications: scheduleList });
    }
  } catch (error) {
    console.error('Error syncing alarms', error);
  }
};
