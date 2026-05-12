import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (request) => {
  try {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const rawVapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';
  const vapidSubject = rawVapidSubject.includes(':') ? rawVapidSubject : `mailto:${rawVapidSubject}`;
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? Deno.env.get('VITE_VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const cronSecret = Deno.env.get('CRON_SECRET');

  if (cronSecret && request.headers.get('x-cron-secret') !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return Response.json({ error: 'Missing Supabase or VAPID environment variables.' }, { status: 500 });
  }

  const webpush = await import('npm:web-push@3');
  webpush.default.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const supabase = createClient(supabaseUrl, serviceRoleKey);

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
      .select('id, subscription, user_agent, updated_at')
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

    const latestSubscriptionsByAgent = new Map<string, typeof subscriptions[number]>();
    for (const subscription of subscriptions) {
      const key = subscription.user_agent || `subscription:${subscription.id}`;
      const previous = latestSubscriptionsByAgent.get(key);
      if (!previous || new Date(subscription.updated_at).getTime() > new Date(previous.updated_at).getTime()) {
        latestSubscriptionsByAgent.set(key, subscription);
      }
    }
    const activeSubscriptions = [...latestSubscriptionsByAgent.values()];

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      tag: `${notification.task_id}:${notification.event_type}`,
      url: '/',
    });

    const results = await Promise.allSettled(
      activeSubscriptions.map((subscription) => webpush.default.sendNotification(subscription.subscription, payload)),
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
});
