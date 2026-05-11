import { Task } from '../types';
import { supabase } from '../lib/supabase';

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

const getTodayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const getPushSubscription = async () => {
  if (!vapidPublicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  const registration = await navigator.serviceWorker.register('/push-sw.js');
  const currentSubscription = await registration.pushManager.getSubscription();
  if (currentSubscription) {
    return currentSubscription;
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
};

const savePushSubscription = async (userId: string, subscription: PushSubscription) => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      subscription: subscription.toJSON(),
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });

  if (error) {
    throw error;
  }
};

export const requestNotificationPermissions = async (userId: string) => {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'denied') {
    return false;
  }
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return false;
    }
  }

  const subscription = await getPushSubscription();
  if (!subscription) {
    return false;
  }

  await savePushSubscription(userId, subscription);
  return true;
};

export const syncTaskAlarms = async (tasksByDate: Record<string, Task[]>, userId: string) => {
  if (!supabase) {
    return;
  }

  const hasSubscription = await requestNotificationPermissions(userId);
  if (!hasSubscription) {
    return;
  }

  const now = new Date();
  const todayTasks = tasksByDate[getTodayKey()] ?? [];
  const notifications = todayTasks.flatMap((task) => {
    if (!task.startTime || !task.duration || task.completed) {
      return [];
    }

    const [hours, minutes] = task.startTime.split(':').map(Number);
    const startAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    const endAt = new Date(startAt.getTime() + task.duration * 60 * 1000);
    const rows = [];

    if (startAt.getTime() > now.getTime()) {
      rows.push({
        user_id: userId,
        task_id: task.id,
        event_type: 'start',
        title: '일정 시작',
        body: `지금부터 [${task.title}] 일정이 시작됩니다.`,
        scheduled_at: startAt.toISOString(),
      });
    }

    if (endAt.getTime() > now.getTime()) {
      rows.push({
        user_id: userId,
        task_id: task.id,
        event_type: 'end',
        title: '일정 종료',
        body: `[${task.title}] 일정이 끝났습니다. 앱에서 평가를 남겨주세요.`,
        scheduled_at: endAt.toISOString(),
      });
    }

    return rows;
  });

  const { error: deleteError } = await supabase
    .from('scheduled_notifications')
    .delete()
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (deleteError) {
    throw deleteError;
  }

  if (notifications.length === 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from('scheduled_notifications')
    .insert(notifications);

  if (insertError) {
    throw insertError;
  }
};
