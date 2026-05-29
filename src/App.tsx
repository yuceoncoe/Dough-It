import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Icon } from './components/ui/Icon';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import AuthScreen from './components/auth/AuthScreen';
import AppShell from './components/AppShell';

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const getAuthRedirectUrl = () => `${window.location.origin}/?auth=confirmed`;

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    let isMounted = true;

    const bootstrapSession = async () => {
      const authUrl = new URL(window.location.href);
      const authCode = authUrl.searchParams.get('code');
      const authStatus = authUrl.searchParams.get('auth');
      const authErrorDescription = authUrl.searchParams.get('error_description') ?? authUrl.searchParams.get('error');

      if (authErrorDescription) {
        setAuthError(decodeURIComponent(authErrorDescription).replace(/\+/g, ' '));
      }

      if (authCode) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
        if (exchangeError) {
          setAuthError(exchangeError.message);
        }
      }

      if (authStatus === 'confirmed' && !authErrorDescription) {
        setAuthNotice('이메일 인증이 완료되었습니다. 이제 Circle Day에 로그인할 수 있어요.');
      }

      if (authCode || authStatus || authErrorDescription) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }
      if (error) {
        setAuthError(error.message);
      }
      setSession(data.session);
      setIsAuthLoading(false);
    };

    void bootstrapSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleAuthSubmit = async (mode: 'sign-in' | 'sign-up', email: string, password: string) => {
    if (!supabase) {
      return false;
    }

    try {
      setIsAuthSubmitting(true);
      setAuthError(null);
      setAuthNotice(null);

      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
        return true;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });
      if (error) {
        throw error;
      }
      if (!data.session) {
        setAuthNotice('가입 신청이 완료되었습니다. 인증 메일을 보냈으니 메일의 확인 링크를 눌러 주세요.');
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그인을 처리하지 못했습니다.';
      setAuthError(message);
      return false;
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleResendConfirmation = async (email: string) => {
    if (!supabase) {
      return;
    }

    try {
      setAuthError(null);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });
      if (error) {
        throw error;
      }
      setAuthNotice(`${email}로 인증 메일을 다시 보냈습니다. 스팸함도 함께 확인해 주세요.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '인증 메일을 다시 보내지 못했습니다.';
      setAuthError(message);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
    }
  };

  if (!isSupabaseConfigured) {
    // Supabase 설정이 없는 로컬 환경에서는 UI 테스트를 위해 가짜 세션으로 앱을 엽니다.
    const mockUser = { email: 'local@test.com', id: 'local-123' } as any;
    return <AppShell user={mockUser} onSignOut={async () => {}} />;
  }

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f0f4] text-stone-500">
        <div className="inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-sm ring-1 ring-black/5">
          <Icon name="progress_activity" size={18} className="animate-spin" />
          인증 상태를 확인하는 중...
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <AuthScreen
        onSubmit={handleAuthSubmit}
        onResendConfirmation={handleResendConfirmation}
        isSubmitting={isAuthSubmitting}
        errorMessage={authError}
        noticeMessage={authNotice}
      />
    );
  }

  return <AppShell user={session.user} onSignOut={handleSignOut} />;
};

export default App;
