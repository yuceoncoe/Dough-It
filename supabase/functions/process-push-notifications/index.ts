import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
const cronSecret = Deno.env.get('CRON_SECRET');

if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
  throw new Error('Missing Supabase or VAPID environment variables.');
}

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (request) => {
  if (cronSecret && request.headers.get('x-cron-secret') !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dueNotifications, error } = await supabase
    .from('scheduled_notifications')
    .select('id, user_id, title, body, task_id, event_type')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .limit(50);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const notification of dueNotifications ?? []) {
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', notification.user_id);

    if (subscriptionError || !subscriptions?.length) {
      failed += 1;
      await supabase
        .from('scheduled_notifications')
        .update({
          status: 'failed',
          error: subscriptionError?.message ?? 'No push subscription found.',
        })
        .eq('id', notification.id);
      continue;
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      tag: `${notification.task_id}:${notification.event_type}`,
      url: '/',
    });

    const results = await Promise.allSettled(
      subscriptions.map((subscription) => webpush.sendNotification(subscription.subscription, payload)),
    );

    const hasSuccess = results.some((result) => result.status === 'fulfilled');
    if (hasSuccess) {
      sent += 1;
      await supabase
        .from('scheduled_notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString(), error: null })
        .eq('id', notification.id);
    } else {
      failed += 1;
      await supabase
        .from('scheduled_notifications')
        .update({ status: 'failed', error: 'Every push subscription failed.' })
        .eq('id', notification.id);
    }
  }

  return Response.json({ processed: dueNotifications?.length ?? 0, sent, failed });
});
