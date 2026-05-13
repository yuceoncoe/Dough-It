import React, { useState } from 'react';
import { Loader2, LockKeyhole, LogIn, UserPlus } from 'lucide-react';

export const AuthScreen = ({
  onSubmit,
  isSubmitting,
  errorMessage,
  noticeMessage,
}: {
  onSubmit: (mode: 'sign-in' | 'sign-up', email: string, password: string) => Promise<boolean>;
  isSubmitting: boolean;
  errorMessage: string | null;
  noticeMessage: string | null;
}) => {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen bg-[#f6f6f8] px-6 py-10 text-stone-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full rounded-[28px] border border-white/80 bg-white px-6 py-7 shadow-[0_24px_80px_rgba(73,54,31,0.12)]">
          <div className="mb-6">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-white">
              <LockKeyhole size={20} />
            </div>
            <h1 className="font-hand text-3xl text-stone-900">Circle Day 로그인</h1>
            <p className="mt-2 text-sm text-stone-500">Supabase 계정으로 로그인하면 일정과 루틴이 계정별로 저장됩니다.</p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setMode('sign-in')}
              className={`rounded-2xl px-4 py-2 text-sm font-medium ${mode === 'sign-in' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => setMode('sign-up')}
              className={`rounded-2xl px-4 py-2 text-sm font-medium ${mode === 'sign-up' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
            >
              계정 생성
            </button>
          </div>

          <form
            className="space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const wasSuccessful = await onSubmit(mode, email.trim(), password);
              if (wasSuccessful && mode === 'sign-up') {
                setEmail('');
                setPassword('');
              }
            }}
          >
            <label className="block">
              <div className="mb-1 text-sm font-medium text-stone-600">이메일</div>
              <input
                type="email"
                autoComplete="email"
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-stone-500"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="block">
              <div className="mb-1 text-sm font-medium text-stone-600">비밀번호</div>
              <input
                type="password"
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-stone-500"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8자 이상"
                minLength={8}
                required
              />
            </label>

            {errorMessage ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            {noticeMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {noticeMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !email.trim() || password.length < 8}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : mode === 'sign-in' ? <LogIn size={18} /> : <UserPlus size={18} />}
              {mode === 'sign-in' ? '로그인' : '계정 만들기'}
            </button>
          </form>

          <p className="mt-4 text-xs leading-5 text-stone-400">
            혼자만 사용하려면 첫 계정을 만든 뒤 Supabase 대시보드에서 추가 가입을 막아두는 것을 권장합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
