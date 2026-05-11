# circle day

React, Vite, Tailwind, Supabase로 만든 웹 기반 시간 관리 앱입니다.

## 변경 내용

- 인터넷 없이도 실행되도록 런타임 CDN 의존성을 제거했습니다.
- Supabase 로그인 기반으로 사용자별 루틴, 일정, 평가 상태를 저장합니다.
- 데스크톱 중심 조작을 탭 중심의 모바일 상호작용으로 바꿨습니다.
- 원형 시계 위에 미디어아트 확장이 가능한 비주얼 모드 레이어를 넣었습니다.

## Supabase 설정

1. 의존성 설치

```bash
npm install
```

2. 환경 변수 설정

`.env.example` 를 참고해서 프로젝트 루트에 `.env` 파일을 만듭니다.

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

3. 데이터베이스 테이블 생성

Supabase SQL Editor에서 [`supabase/schema.sql`](./supabase/schema.sql) 내용을 실행합니다.

4. 첫 계정 생성 후 가입 제한 권장

혼자만 사용할 예정이면 첫 계정을 만든 뒤 Supabase Auth 설정에서 신규 가입을 막는 것을 권장합니다.

## 푸쉬 알림 설정

진짜 푸쉬 알림은 브라우저 Push API, Supabase 테이블, Edge Function, 주기 실행 설정이 함께 필요합니다.

1. VAPID 키 생성

```bash
npx web-push generate-vapid-keys
```

2. Vercel 환경 변수에 공개 키 추가

```bash
VITE_VAPID_PUBLIC_KEY=generated-public-key
```

3. Supabase Edge Function secrets 추가

```bash
VAPID_PUBLIC_KEY=generated-public-key
VAPID_PRIVATE_KEY=generated-private-key
VAPID_SUBJECT=mailto:your-email@example.com
CRON_SECRET=your-random-cron-secret
```

4. Edge Function 배포

```bash
supabase functions deploy process-push-notifications
```

5. Supabase Scheduler 또는 외부 cron에서 1분마다 함수 호출

요청 헤더에는 `x-cron-secret: your-random-cron-secret` 를 포함합니다.

## 개발 실행

```bash
npm install
npm run dev
```

## 웹 번들 빌드

```bash
npm run build
```

생성된 결과물은 `dist/` 에 들어가며 외부 CDN 없이 동작합니다.

## 참고

- 사용자별 데이터는 Supabase `user_app_state` 테이블에 저장됩니다.
- 루틴 수정은 새로 여는 날짜에 반영되고, 이미 저장된 날짜는 기존 일정 상태를 유지합니다.
- 비주얼 레이어는 일정 계산 로직과 분리되어 있어 이후 SVG, Canvas, 셰이더 기반 표현으로 확장하기 쉽습니다.
