# BSSM Dice — 에이전트 가이드 (AGENT.md)

> 이 프로젝트를 구현하는 코딩 에이전트를 위한 가이드.

---

## 프로젝트 핵심 정보

- **게임**: 요트 다이스 (Yahtzee 룰)
- **디자인 원본**: `design_extracted/bssm-dice/project/` — 픽셀 퍼펙트하게 재현할 것
- **기술 스택**: React + TypeScript + Three.js + Electron (프론트), NestJS + WebSocket (백엔드)
- **상세 계획**: `docs/PLAN.md`
- **디자인 스펙**: `docs/DESIGN.md`

---

## 구현 우선순위

1. `packages/shared` — 공유 타입과 scoring 로직 먼저 (양쪽이 의존)
2. `apps/frontend` Phase 1 — 로컬 싱글플레이가 완전히 동작하는 것이 목표
3. `apps/backend` Phase 2 — 멀티플레이는 그 다음
4. CI/테스트 — 각 단계와 함께 작성

---

## 중요한 구현 규칙

### Three.js (Dice3D)
- React StrictMode의 double-invoke 방지: setup useEffect에 `mountedOnce` ref 가드 필요
- Three.js 씬은 단일 useEffect에서 setup + RAF loop 모두 처리
- 컵 LatheGeometry는 반드시 r=0 에서 시작해서 바닥이 닫혀야 함
- 주사위-주사위 충돌: 구형 근사 (AABB 아님)

### Electron 보안
- `nodeIntegration: false`, `contextIsolation: true` 필수
- IPC는 preload의 contextBridge만 사용
- 외부 URL은 기본 브라우저로 열기

### 멀티플레이 (Phase 2)
- 주사위 값은 **서버에서** 생성 (클라이언트 신뢰 안 함)
- 클라이언트는 서버에서 받은 dice 값으로 3D 애니메이션만 재생
- 서버에서 턴 검증 필수 (비활성 플레이어의 roll/pick 요청 거부)

### 테스트
- scoring.ts는 100% 커버리지 목표
- 각 컴포넌트 파일과 같은 위치에 `__tests__/` 폴더로 테스트 배치
- WebSocket 통합 테스트는 `apps/backend/test/integration/`

### CSS
- CSS Modules 사용 (전역 오염 방지)
- Apple Design Tokens는 `:root`에 CSS 변수로 정의
- 반응형: `@media (max-width: 880px)` 하나만 (모바일 지원은 Phase 3)

---

## 파일 찾기 가이드

| 필요한 것 | 위치 |
|-----------|------|
| 기존 게임 로직 (JS) | `design_extracted/bssm-dice/project/js/scoring.js` |
| 기존 3D 주사위 코드 | `design_extracted/bssm-dice/project/js/Dice3D.jsx` |
| 기존 점수표 코드 | `design_extracted/bssm-dice/project/js/Scoreboard.jsx` |
| 기존 앱 코드 | `design_extracted/bssm-dice/project/js/App.jsx` |
| CSS 스타일 | `design_extracted/bssm-dice/project/styles/app.css` |
| Apple CSS 토큰 | `design_extracted/bssm-dice/project/styles/apple-tokens.css` |
| 폰트 파일 | `design_extracted/bssm-dice/project/fonts/` |
| 현재 스크린샷 | `design_extracted/bssm-dice/project/screenshots/` |

---

## 작업 시작 체크리스트

- [ ] `design_extracted/bssm-dice/project/js/Dice3D.jsx` 전체 읽기
- [ ] `design_extracted/bssm-dice/project/styles/apple-tokens.css` 읽기
- [ ] `design_extracted/bssm-dice/project/screenshots/current.png` 확인
- [ ] `docs/PLAN.md` Phase 1부터 순서대로 진행
- [ ] 각 단계마다 단위 테스트 함께 작성
