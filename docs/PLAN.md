# BSSM Dice — 구현 계획 (PLAN)

> 디자인 원본: `design_extracted/bssm-dice/project/`  
> 작성일: 2026-04-27

---

## 1. 프로젝트 개요

**Yacht** — Apple 디자인 시스템 기반의 요트 다이스 게임.

| 항목 | 내용 |
|------|------|
| 게임 | 요트 다이스 (Yahtzee 룰 — 12 카테고리, Yacht=50점) |
| 플레이어 수 | 로컬 1~4명, 네트워크 멀티플레이(WebSocket) |
| 주사위 | Three.js 기반 실제 3D 렌더링 + 직접 구현 물리 엔진 |
| 플랫폼 | Electron 데스크톱 앱 (Web fallback 가능) |
| 디자인 | Apple 스타일 — 화이트/라이트, 미니멀, SF Pro Display |

---

## 2. 기술 스택

| 레이어 | 기술 |
|--------|------|
| **Frontend** | Electron 35 + React 19 + TypeScript 5.8 |
| **3D 렌더링** | Three.js r170 + 커스텀 물리 엔진 (중력·충돌·각운동량) |
| **상태관리** | Zustand (전역), React hooks (로컬) |
| **스타일링** | CSS Modules + CSS 변수 (Apple Design Tokens) |
| **Backend** | NestJS 11 + TypeScript 5.8 |
| **실시간통신** | WebSocket (`@nestjs/websockets` + `socket.io`) |
| **빌드** | Turborepo + pnpm workspaces |
| **테스트** | Vitest (단위), Supertest (API), Playwright (E2E 선택) |
| **CI** | GitHub Actions |

---

## 3. 모노레포 구조

```
dice/                          ← 루트 (pnpm workspace)
├── apps/
│   ├── frontend/              ← Electron + React + Three.js
│   │   ├── electron/          ← main process (main.ts, preload.ts)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Dice3D/    ← Three.js 3D 주사위
│   │   │   │   ├── Scoreboard/← 점수표 컴포넌트
│   │   │   │   ├── GameHeader/← 헤더 (플레이어명, 굴림 횟수)
│   │   │   │   └── GameOver/  ← 게임 종료 오버레이
│   │   │   ├── store/         ← Zustand 스토어
│   │   │   │   ├── gameStore.ts
│   │   │   │   └── multiplayerStore.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useGameLogic.ts
│   │   │   │   └── useMultiplayer.ts
│   │   │   ├── styles/        ← CSS Modules + Apple design tokens
│   │   │   ├── App.tsx
│   │   │   └── main.tsx       ← React root
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── backend/               ← NestJS WebSocket 서버
│       ├── src/
│       │   ├── game/
│       │   │   ├── game.gateway.ts   ← WebSocket gateway
│       │   │   ├── game.service.ts   ← 게임 상태 관리
│       │   │   ├── game.module.ts
│       │   │   └── dto/
│       │   │       ├── roll.dto.ts
│       │   │       ├── hold.dto.ts
│       │   │       └── pick-category.dto.ts
│       │   ├── room/
│       │   │   ├── room.gateway.ts   ← 방 생성/참가
│       │   │   ├── room.service.ts
│       │   │   └── room.module.ts
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── test/
│       └── package.json
│
├── packages/
│   └── shared/                ← 공유 타입 + 게임 로직
│       ├── src/
│       │   ├── types/
│       │   │   ├── game.ts    ← GameState, Player, Scorecard 등
│       │   │   └── ws.ts      ← WebSocket 이벤트 타입
│       │   ├── scoring.ts     ← 점수 계산 로직 (순수 함수)
│       │   └── index.ts
│       └── package.json
│
├── docs/
│   ├── PLAN.md               ← 이 파일
│   ├── DESIGN.md             ← 디자인 스펙
│   └── AGENT.md              ← 에이전트 가이드
│
├── .github/
│   └── workflows/
│       ├── ci.yml            ← lint + test + build
│       └── release.yml       ← Electron 빌드 & 배포
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 4. 공유 패키지 (`packages/shared`)

프론트엔드와 백엔드가 동일한 타입과 게임 로직을 공유.

### 4.1 타입 정의

```typescript
// packages/shared/src/types/game.ts

export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface Scorecard {
  ones: number | null;
  twos: number | null;
  threes: number | null;
  fours: number | null;
  fives: number | null;
  sixes: number | null;
  choice: number | null;
  fourkind: number | null;
  fullhouse: number | null;
  sstraight: number | null;
  lstraight: number | null;
  yacht: number | null;
}

export interface Player {
  id: string;
  name: string;
  card: Scorecard;
  connected: boolean;    // 네트워크 멀티플레이 연결 상태
}

export interface GameState {
  roomId: string;
  players: Player[];
  activePlayerIndex: number;
  dice: DiceValue[];
  held: boolean[];
  rollsUsed: number;     // 0~3
  phase: 'waiting' | 'playing' | 'ended';
  winnerId: string | null;
}
```

### 4.2 WebSocket 이벤트 타입

```typescript
// packages/shared/src/types/ws.ts

// Client → Server
export type ClientEvents = {
  'room:create': { playerName: string };
  'room:join': { roomId: string; playerName: string };
  'game:roll': { roomId: string };
  'game:hold': { roomId: string; index: number };
  'game:pick': { roomId: string; categoryId: keyof Scorecard };
};

// Server → Client
export type ServerEvents = {
  'room:created': { roomId: string; gameState: GameState };
  'room:joined': { gameState: GameState };
  'room:error': { message: string };
  'game:state': GameState;
  'game:rolled': { dice: DiceValue[]; rollsUsed: number };
  'game:held': { held: boolean[] };
  'game:picked': { gameState: GameState };
  'game:ended': { winnerId: string; finalState: GameState };
};
```

### 4.3 점수 계산 로직 (순수 함수)

기존 `scoring.js`를 TypeScript로 포팅하여 양쪽에서 공유.

---

## 5. 프론트엔드 (`apps/frontend`)

### 5.1 Electron 구조

```
electron/
├── main.ts       ← BrowserWindow 생성, IPC 설정, 앱 메뉴
├── preload.ts    ← contextBridge (nodeIntegration 없이 안전하게)
└── utils.ts
```

- **BrowserWindow**: `width: 1400, height: 900`, `minWidth: 1100`
- **contextBridge**: WebSocket URL, 앱 버전 등만 노출
- **자동업데이트**: `electron-updater` (선택사항 — Phase 2)

### 5.2 React 컴포넌트 트리

```
App
├── GameHeader          ← 앱 로고, 플레이어명, 굴림 횟수 pip, New Game 버튼
├── main.app-main
│   └── game-panel (CSS grid: 320px 1fr)
│       ├── Scoreboard  ← 점수표 (aside, 좌측)
│       └── DiceStage   ← 3D 트레이 + 컵 (우측)
│           ├── Dice3D  ← Three.js canvas
│           ├── HeldOverlay
│           ├── HintToast
│           └── GameOverCard
├── MultiplayerLobby    ← 방 생성/참가 모달 (멀티플레이 모드)
└── TweaksPanel         ← 설정 패널 (테마, 트레이 색, 플레이어 수)
```

### 5.3 Dice3D 컴포넌트 설계

**Three.js 씬 구성:**

| 요소 | 설명 |
|------|------|
| **Camera** | PerspectiveCamera, FOV 32, 탑뷰 (0, 14.5, 3) |
| **조명** | AmbientLight (0.6) + DirectionalLight (그림자) |
| **트레이** | BoxGeometry 바닥 + 4개 벽 (PlaneGeometry) |
| **컵** | LatheGeometry (닫힌 바닥, Inner liner) |
| **주사위** | BoxGeometry (한 변 0.48), 각 면 텍스처 (pip 패턴) |

**물리 엔진 (커스텀):**

```typescript
interface DiceBody {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Quaternion;
  angVel: THREE.Vector3;
  resting: boolean;
  inCup: boolean;
  held: boolean;
}
```

- 중력: `vel.y -= 18 * dt`
- 바닥/벽 충돌: AABB
- 주사위-주사위 충돌: 구형 근사 (반발 계수 0.4)
- 정착 감지: 속도 < 임계값 && 바닥에 닿음

**컵 흔들기 → 굴림 시퀀스:**

1. `triggerRoll()` 호출
2. 컵 shake 애니메이션 (0.55초)
3. unheld 주사위를 컵 위치로 teleport + 속도 부여
4. 물리 시뮬레이션 → 주사위 정착
5. `onRollComplete()` 콜백 → 상태 업데이트

### 5.4 Zustand 스토어

```typescript
// store/gameStore.ts
interface GameStore {
  // 상태
  gameState: GameState;
  mode: 'local' | 'online';
  
  // 로컬 액션
  roll: () => void;
  toggleHold: (index: number) => void;
  pickCategory: (catId: keyof Scorecard) => void;
  newGame: () => void;
  renamePlayer: (index: number, name: string) => void;
  setPlayerCount: (count: number) => void;
  
  // 3D 씬 콜백 (Dice3D ↔ Store 연동)
  onRollComplete: (newValues: DiceValue[]) => void;
}

// store/multiplayerStore.ts
interface MultiplayerStore {
  socket: Socket | null;
  roomId: string | null;
  playerId: string | null;
  connectionState: 'disconnected' | 'connecting' | 'connected';
  
  createRoom: (playerName: string) => Promise<void>;
  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  disconnect: () => void;
}
```

### 5.5 멀티플레이 훅

```typescript
// hooks/useMultiplayer.ts
function useMultiplayer() {
  // socket.io 이벤트 구독
  // 서버 이벤트 → gameStore 반영
  // 로컬 액션 → 서버 emit
}
```

**멀티플레이 모드 게임 흐름:**

1. 한 플레이어가 방 생성 → `roomId` 공유
2. 나머지 플레이어가 `roomId`로 참가
3. **주사위 굴림은 서버에서 결정** (클라이언트에서 시드만 계산하면 치팅 가능하므로)
4. 서버가 `game:state` 브로드캐스트 → 모든 클라이언트 동기화
5. 각 플레이어는 자신의 턴에만 액션 가능 (서버에서 검증)

---

## 6. 백엔드 (`apps/backend`)

### 6.1 NestJS 모듈 구조

```
AppModule
├── RoomModule
│   ├── RoomGateway    ← room:create, room:join
│   └── RoomService    ← 방 관리 (메모리 Map)
└── GameModule
    ├── GameGateway    ← game:roll, game:hold, game:pick
    └── GameService    ← 게임 상태 관리 + 검증
```

### 6.2 RoomService

```typescript
@Injectable()
class RoomService {
  // roomId → GameState 맵 (인메모리, Redis 가능)
  private rooms = new Map<string, GameState>();
  
  createRoom(playerName: string, socketId: string): GameState;
  joinRoom(roomId: string, playerName: string, socketId: string): GameState;
  getRoom(roomId: string): GameState | undefined;
  removePlayer(socketId: string): void; // disconnect 처리
}
```

### 6.3 GameService — 서버 사이드 게임 로직

```typescript
@Injectable()
class GameService {
  // 중요: 주사위는 서버에서 생성
  roll(roomId: string, playerId: string): GameState;
  hold(roomId: string, playerId: string, index: number): GameState;
  pickCategory(roomId: string, playerId: string, catId: string): GameState;
  
  private validateTurn(state: GameState, playerId: string): boolean;
  private rollDice(state: GameState): DiceValue[];
}
```

### 6.4 GameGateway (WebSocket)

```typescript
@WebSocketGateway({ cors: true, namespace: '/game' })
class GameGateway {
  @SubscribeMessage('game:roll')
  handleRoll(@MessageBody() dto: RollDto, @ConnectedSocket() client: Socket) {
    const state = this.gameService.roll(dto.roomId, client.id);
    this.server.to(dto.roomId).emit('game:state', state);
  }
  
  @SubscribeMessage('game:hold')
  handleHold(@MessageBody() dto: HoldDto, @ConnectedSocket() client: Socket) { ... }
  
  @SubscribeMessage('game:pick')
  handlePick(@MessageBody() dto: PickDto, @ConnectedSocket() client: Socket) { ... }
}
```

---

## 7. UI/디자인 스펙

디자인 원본을 그대로 재현. 자세한 내용은 `DESIGN.md` 참조.

### 7.1 레이아웃

```
┌──────────────────────────────────────────────────────────────┐
│  ● Yacht         [Player 1 ▾]  [●●●]  [New Game]            │ ← 헤더 52px
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────────────────────────────┐   │
│  │  Scoresheet  │ │                                      │   │
│  │  (320px)     │ │         3D Dice Tray                 │   │
│  │              │ │         (Three.js canvas)            │   │
│  │  Upper       │ │                                      │   │
│  │  [표 형태]   │ │         [컵] ←── 클릭하면 굴림      │   │
│  │              │ │                                      │   │
│  │  Lower       │ │  "Tap the cup to shake & roll"       │   │
│  │  [표 형태]   │ └──────────────────────────────────────┘   │
│  │              │                                            │
│  │  Total: 0    │                                            │
│  └──────────────┘                                            │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 디자인 토큰

| 토큰 | 라이트 | 다크 |
|------|--------|------|
| `--bg-page` | `#f5f5f7` | `#0b0b0d` |
| `--panel-bg` | `#ffffff` | `#161618` |
| `--color-apple-blue` | `#0071e3` | `#2997ff` |
| `--felt-from` (soft) | `#f5f5f7` | `#1c1c1f` |
| `--font-display` | SF Pro Display | SF Pro Display |
| `--font-text` | SF Pro Text | SF Pro Text |

### 7.3 주사위 3D 스펙

- **크기**: 한 변 0.48 three.js units
- **컵**: 반지름 0.95, 높이 1.7, 닫힌 바닥, inner liner
- **카메라**: (0, 14.5, 3), FOV 32, 거의 탑뷰
- **트레이**: 8×6 units 바닥 + 4개 벽
- **컵 위치**: x=3.0, z=0 (트레이 우측 중앙)

---

## 8. Git 커밋 규칙

### 커밋 메시지 형식

```
<type>(<scope>): <subject>

[optional body]
```

**type 목록:**

| type | 사용 시점 |
|------|-----------|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `test` | 테스트 추가/수정 |
| `chore` | 설정, 도구, 의존성 변경 |
| `style` | CSS/스타일 작업 (로직 변경 없음) |
| `refactor` | 동작 변화 없는 코드 구조 개선 |
| `docs` | 문서 작업 |
| `ci` | GitHub Actions 등 CI 설정 |

**scope 목록:**

| scope | 대상 |
|-------|------|
| `repo` | 루트 모노레포 설정 |
| `shared` | `packages/shared` |
| `electron` | Electron main/preload |
| `design` | CSS 토큰, 폰트, 전역 스타일 |
| `dice3d` | Three.js 3D 주사위 씬 |
| `scoreboard` | 점수표 컴포넌트 |
| `header` | GameHeader 컴포넌트 |
| `gameover` | GameOver 오버레이 |
| `tweaks` | TweaksPanel 컴포넌트 |
| `store` | Zustand 스토어 |
| `app` | App.tsx 최상위 조립 |
| `room` | 백엔드 RoomModule |
| `game` | 백엔드 GameModule |
| `gateway` | WebSocket 게이트웨이 |
| `lobby` | MultiplayerLobby 컴포넌트 |
| `multiplayer` | useMultiplayer 훅 + multiplayerStore |
| `ci` | GitHub Actions 워크플로우 |

### 규칙

1. **기능 1개 = 커밋 1개.** 여러 기능을 하나의 커밋에 묶지 않는다.
2. **테스트는 구현 커밋에 포함하거나 바로 다음 커밋으로.** 별도 PR 마지막에 몰아넣지 않는다.
3. **subject는 영어 또는 한국어, 동사 원형으로 시작.** (`add`, `implement`, `fix`, `추가`, `구현`, `수정`)
4. **WIP 커밋 금지.** main/develop 브랜치에는 동작하는 상태만 올린다.
5. **각 Phase 완료 시 해당 Phase 브랜치를 develop에 PR로 머지.**

### 예시

```bash
# 좋은 커밋
chore(repo): initialize pnpm monorepo with Turborepo
feat(shared): add Scorecard and GameState type definitions
feat(shared): implement Yacht scoring pure functions
test(shared): add unit tests for all 12 scoring categories
chore(electron): configure BrowserWindow with security settings
style(design): add Apple design tokens and SF Pro fonts
feat(dice3d): set up Three.js scene with camera, lights, and tray
feat(dice3d): add dice mesh with pip canvas textures
feat(dice3d): implement custom physics engine with gravity and wall collision
feat(dice3d): add die-to-die sphere collision with impulse exchange
feat(dice3d): implement cup shake and spill animation sequence
feat(scoreboard): render compact score table with preview highlights
feat(store): add Zustand gameStore with local game state machine
feat(app): assemble full local single-player game

# 나쁜 커밋 (하지 말 것)
git commit -m "wip"
git commit -m "여러가지 수정"
git commit -m "feat: dice and scoreboard and store"
```

---

## 9. 구현 단계 (Phase)

> 각 Phase는 독립적으로 동작하는 상태로 끝나야 한다. 세부 Phase는 커밋 단위와 거의 1:1로 대응된다.

---

### Phase 1 — 모노레포 초기화

**목표**: 빈 모노레포 골격 구성. 이후 모든 작업의 기반.

#### Phase 1.1 — 루트 워크스페이스 설정

- `package.json` (root) — `"workspaces"` 선언, 공통 스크립트 (`dev`, `build`, `test`, `lint`)
- `pnpm-workspace.yaml` — `apps/*`, `packages/*` 등록
- `turbo.json` — `build → test → lint` 파이프라인 정의, 캐시 설정
- `.gitignore`, `.nvmrc` (Node 22), `README.md` (최소)

```
커밋: chore(repo): initialize pnpm monorepo with Turborepo
```

#### Phase 1.2 — 코드 품질 도구 설정

- `eslint.config.js` — TypeScript + React + import 정렬 규칙
- `.prettierrc` — 탭 너비 2, 세미콜론, 싱글 쿼트
- `tsconfig.base.json` — strict mode, path aliases (`@shared/*`, `@/*`)
- `.editorconfig`

```
커밋: chore(repo): add ESLint, Prettier, and base TypeScript config
```

---

### Phase 2 — shared 패키지

**목표**: 프론트·백엔드가 공유하는 타입과 순수 게임 로직.

#### Phase 2.1 — 패키지 스캐폴딩

- `packages/shared/package.json` — `name: "@dice/shared"`, Vitest 설정
- `packages/shared/tsconfig.json` — base 상속
- `packages/shared/src/index.ts` — 빈 barrel export

```
커밋: chore(shared): scaffold shared package with build config
```

#### Phase 2.2 — 게임 타입 정의

- `src/types/game.ts` — `DiceValue`, `Scorecard`, `Player`, `GameState`
- `src/types/ws.ts` — `ClientEvents`, `ServerEvents` (WebSocket 이벤트 맵)
- `src/index.ts` 업데이트

```
커밋: feat(shared): add Scorecard, GameState, and WebSocket event types
```

#### Phase 2.3 — scoring 순수 함수 구현

- `src/scoring.ts` — 12개 카테고리 점수 함수, `computeTotals`, `makeEmptyScorecard`, `allFilled`
- 기존 `design_extracted/.../scoring.js`를 TypeScript로 완전 포팅

```
커밋: feat(shared): implement Yacht scoring functions (12 categories)
```

#### Phase 2.4 — scoring 단위 테스트 (100% 커버리지)

- `src/__tests__/scoring.test.ts` — 각 카테고리별 경계값 포함 전수 테스트
- `src/__tests__/totals.test.ts` — 보너스 threshold (63), grand total

```
커밋: test(shared): achieve 100% coverage on scoring functions
```

---

### Phase 3 — 프론트엔드 환경 설정

**목표**: Electron 창이 뜨고 React가 렌더링되는 최소 뼈대.

#### Phase 3.1 — Vite + React + TypeScript 초기화

- `apps/frontend/package.json` — 의존성 (`react`, `three`, `zustand`, `socket.io-client`)
- `apps/frontend/vite.config.ts` — path alias, CSS modules
- `apps/frontend/tsconfig.json` — base 상속, `jsx: react-jsx`
- `src/main.tsx` — `ReactDOM.createRoot` 최소 진입점
- `src/App.tsx` — placeholder

```
커밋: chore(electron): scaffold Vite + React + TypeScript frontend app
```

#### Phase 3.2 — Electron main/preload 설정

- `electron/main.ts` — `BrowserWindow` (`width:1400, height:900, minWidth:1100`), `nodeIntegration:false`, `contextIsolation:true`
- `electron/preload.ts` — `contextBridge` (앱 버전, WS URL만 노출)
- `electron/utils.ts` — 개발/프로덕션 URL 분기
- `package.json`에 `electron:dev`, `electron:build` 스크립트 추가

```
커밋: chore(electron): configure Electron main process with security settings
```

#### Phase 3.3 — Apple Design Tokens + 폰트

- `src/styles/tokens.css` — `:root` CSS 변수 전체 (light/dark/mood)
- `src/styles/fonts.css` — SF Pro Display/Text `@font-face` (폰트 파일 복사)
- `src/styles/reset.css` — box-sizing, margin 초기화
- `src/styles/global.css` — `html, body, #root` 기본 스타일

```
커밋: style(design): add Apple design tokens, SF Pro fonts, and CSS reset
```

---

### Phase 4 — Dice3D 컴포넌트 (Three.js)

**목표**: 3D 주사위가 물리적으로 굴러가는 핵심 씬 완성.

#### Phase 4.1 — Three.js 씬 기반 (카메라·조명·트레이)

- `src/components/Dice3D/scene.ts` — renderer, camera (FOV 32, `y=14.5`), lights
- `src/components/Dice3D/tray.ts` — 바닥 + 4개 벽 BoxGeometry, felt 텍스처
- `src/components/Dice3D/Dice3D.tsx` — canvas mount useEffect, resize observer

```
커밋: feat(dice3d): set up Three.js scene with camera, lights, and tray
```

#### Phase 4.2 — 주사위 메시 + pip 텍스처

- `src/components/Dice3D/dieMesh.ts` — BoxGeometry(0.48), `MeshStandardMaterial`
- `src/components/Dice3D/pipTexture.ts` — Canvas API로 1~6 pip 텍스처 생성 (6개 면)
- 초기 배치: 트레이 바닥에 5개 고르게 펼침

```
커밋: feat(dice3d): add dice meshes with canvas-generated pip textures
```

#### Phase 4.3 — 컵 메시

- `src/components/Dice3D/cup.ts` — `LatheGeometry` (r=0 시작 → 닫힌 바닥), inner liner `CylinderGeometry`
- 위치: `(3.0, 1.0, 0)`, 색상: `#1a1a1a`
- `cupGroup` 단위로 raycast 처리

```
커밋: feat(dice3d): add cup mesh with closed bottom and inner liner
```

#### Phase 4.4 — 기본 물리 엔진 (중력·바닥·벽 충돌)

- `src/components/Dice3D/physics.ts` — `DiceBody` 인터페이스, RAF loop
- 중력 `18 m/s²`, 바닥 반발 `0.35`, 마찰 `0.7`
- AABB 바닥/벽 충돌 + 각운동량 감쇠

```
커밋: feat(dice3d): implement custom physics with gravity and wall collision
```

#### Phase 4.5 — 주사위-주사위 충돌

- `physics.ts`에 die-die 쌍 충돌 루프 추가
- 구형 근사 (반지름 `HALF * 0.95`), 반발 계수 `0.4`
- 충돌 시 양쪽 settle 해제 + 토크 부여

```
커밋: feat(dice3d): add die-to-die sphere collision with impulse exchange
```

#### Phase 4.6 — 컵 흔들기 → 굴림 시퀀스

- `src/components/Dice3D/cupAnimation.ts` — `CupAnim` 타입, shake(0.55s) → spill 로직
- `startRoll(values, held)` — unheld 주사위 컵으로 teleport → 속도 부여
- `onRollComplete` 콜백 — 모든 주사위 정착 후 호출
- React StrictMode 이중 mount 방지: `mountedOnce` ref 가드

```
커밋: feat(dice3d): implement cup shake and dice spill animation sequence
```

#### Phase 4.7 — HeldOverlay + 클릭 인터랙션

- `src/components/Dice3D/HeldOverlay.tsx` — 파란 pill ("HELD · ●") 주사위 위에 오버레이
- 3D 클릭 raycast: 주사위 클릭 → hold 토글, 빈 공간 클릭 → 컵 shake

```
커밋: feat(dice3d): add held overlay and click-to-hold/roll interaction
```

---

### Phase 5 — UI 컴포넌트

**목표**: 점수표, 헤더, 게임오버 등 나머지 UI 완성.

#### Phase 5.1 — Scoreboard 컴포넌트

- `src/components/Scoreboard/Scoreboard.tsx` — `<aside>` + 스크롤 가능한 `<table>`
- Upper(6) / 보너스 진행 바 / Lower(6) / 총점 행
- 점수 미리보기 (파란색), pickable 셀 호버 강조
- `src/components/Scoreboard/Scoreboard.module.css`

```
커밋: feat(scoreboard): implement compact score table with preview highlights
```

#### Phase 5.2 — Scoreboard 단위 테스트

- `__tests__/Scoreboard.test.tsx` — 렌더링, pickable 클릭, 미리보기 표시, 보너스 진행 바

```
커밋: test(scoreboard): add unit tests for score table interactions
```

#### Phase 5.3 — GameHeader 컴포넌트

- `src/components/GameHeader/GameHeader.tsx` — 로고 SVG, "Yacht" 타이틀, 플레이어명 input, 굴림 pip × 3, "New game" 버튼
- `GameHeader.module.css`

```
커밋: feat(header): implement game header with player name and roll pips
```

#### Phase 5.4 — GameOver 오버레이

- `src/components/GameOver/GameOver.tsx` — frosted glass 오버레이, 승자 표시, 전체 점수 나열, "Play again" 버튼
- `GameOver.module.css`

```
커밋: feat(gameover): add game over overlay with winner and scores
```

#### Phase 5.5 — TweaksPanel

- `src/components/TweaksPanel/TweaksPanel.tsx` — 테마 (light/dark), 트레이 무드 (soft/warm/cool), 플레이어 수, 힌트 토글
- `TweaksPanel.module.css`

```
커밋: feat(tweaks): add tweaks panel for theme, tray mood, and player count
```

---

### Phase 6 — 상태 관리 + 게임 조립

**목표**: 완전히 동작하는 로컬 게임.

#### Phase 6.1 — Zustand gameStore

- `src/store/gameStore.ts` — `GameStore` 인터페이스, 로컬 액션 (`roll`, `toggleHold`, `pickCategory`, `newGame`, `renamePlayer`, `setPlayerCount`)
- `onRollComplete` 콜백으로 Dice3D ↔ store 연동

```
커밋: feat(store): add Zustand gameStore with local game state machine
```

#### Phase 6.2 — gameStore 단위 테스트

- `src/store/__tests__/gameStore.test.ts` — 턴 순서, roll 제한(3회), hold 토글, 카테고리 선택 후 턴 이동, 게임오버 조건

```
커밋: test(store): add unit tests for gameStore state transitions
```

#### Phase 6.3 — App.tsx 조립 (싱글플레이 완성)

- `src/App.tsx` — 컴포넌트 조립, store 연결, `data-theme` / `data-mood` 속성 동기화
- `src/styles/layout.module.css` — `game-panel` 그리드 (`320px 1fr`), `app-main` flex

```
커밋: feat(app): assemble full local single-player Yacht game
```

#### Phase 6.4 — 로컬 멀티플레이 (1~4명)

- 플레이어 수 변경 시 scoreboard 컬럼 동적 추가/제거
- 턴 순환 (activePlayerIndex), 전체 카드 채워지면 게임 종료

```
커밋: feat(app): support local multiplayer with 1 to 4 players
```

---

### Phase 7 — NestJS 백엔드

**목표**: WebSocket 서버로 네트워크 멀티플레이 기반 구축.

#### Phase 7.1 — NestJS 프로젝트 초기화

- `apps/backend/package.json` — `@nestjs/core`, `@nestjs/websockets`, `socket.io`
- `apps/backend/tsconfig.json`, `nest-cli.json`
- `src/main.ts` — `NestFactory.create`, CORS 설정, 포트 3001

```
커밋: chore(repo): scaffold NestJS backend app
```

#### Phase 7.2 — RoomService (방 관리)

- `src/room/room.service.ts` — 인메모리 `Map<roomId, GameState>`, `createRoom`, `joinRoom`, `removePlayer`
- `src/room/room.module.ts`
- roomId: 4자리 대문자 랜덤 (`nanoid`)

```
커밋: feat(room): implement in-memory room service with create and join
```

#### Phase 7.3 — RoomGateway (WebSocket)

- `src/room/room.gateway.ts` — `room:create`, `room:join` 이벤트 처리
- 성공 시 socket을 roomId room에 join, `room:created` / `room:joined` emit
- 실패 시 `room:error` emit

```
커밋: feat(gateway): add WebSocket room gateway for create and join events
```

#### Phase 7.4 — GameService (서버 사이드 게임 로직)

- `src/game/game.service.ts` — `roll` (서버에서 dice 생성), `hold`, `pickCategory`
- `validateTurn` — 비활성 플레이어 액션 거부
- `@dice/shared`의 scoring 함수 재사용

```
커밋: feat(game): implement server-side game logic with turn validation
```

#### Phase 7.5 — GameGateway (WebSocket)

- `src/game/game.gateway.ts` — `game:roll`, `game:hold`, `game:pick` 이벤트
- 상태 변경 후 `server.to(roomId).emit('game:state', state)` 브로드캐스트
- DTO 유효성 검사 (`class-validator`)

```
커밋: feat(gateway): add WebSocket game gateway with state broadcast
```

#### Phase 7.6 — disconnect 처리

- `handleDisconnect` — 플레이어 제거, 해당 턴이면 다음 플레이어로 이동
- 방에 플레이어 0명 → 방 삭제
- 남은 플레이어에게 `game:state` 브로드캐스트

```
커밋: feat(gateway): handle player disconnect with turn skip and room cleanup
```

#### Phase 7.7 — 백엔드 단위 테스트

- `test/unit/room.service.spec.ts` — 방 생성, 중복 참가, 플레이어 제거
- `test/unit/game.service.spec.ts` — roll/hold/pick 정상 흐름, 비활성 플레이어 거부, 게임오버

```
커밋: test(game): add unit tests for room and game service logic
```

#### Phase 7.8 — 백엔드 통합 테스트

- `test/integration/game.gateway.spec.ts` — Socket.io 클라이언트로 전체 게임 흐름 E2E
- 2인 게임 1회전 시나리오 (roll → hold → pick → 턴 이동) 검증

```
커밋: test(gateway): add WebSocket integration test for full game round
```

---

### Phase 8 — 프론트엔드 멀티플레이 연동

**목표**: 프론트에서 백엔드에 접속해 네트워크 멀티플레이 가능.

#### Phase 8.1 — multiplayerStore + socket.io-client

- `src/store/multiplayerStore.ts` — socket 인스턴스, `roomId`, `playerId`, `connectionState`
- `createRoom`, `joinRoom`, `disconnect` 액션

```
커밋: feat(multiplayer): add multiplayerStore with socket.io-client connection
```

#### Phase 8.2 — useMultiplayer 훅

- `src/hooks/useMultiplayer.ts` — 서버 이벤트 구독 (`game:state` → `gameStore` 반영)
- 로컬 액션을 서버 emit으로 redirect (온라인 모드일 때만)

```
커밋: feat(multiplayer): implement useMultiplayer hook for event bridging
```

#### Phase 8.3 — MultiplayerLobby 컴포넌트

- `src/components/MultiplayerLobby/MultiplayerLobby.tsx` — 모달, "방 만들기" / "참가하기" 탭
- 방 코드 4자리 입력, 연결 상태 표시 (스피너 / 연결됨 / 에러)
- `MultiplayerLobby.module.css`

```
커밋: feat(lobby): add multiplayer lobby modal with room create and join
```

#### Phase 8.4 — 관전 모드 UI

- 비활성 플레이어 차례일 때: 힌트 "상대방 차례입니다..." 표시
- 점수표 플레이어 헤더에 연결 상태 dot 추가

```
커밋: feat(lobby): show spectator hint and connection status in score table
```

---

### Phase 9 — CI + 프로덕션 빌드

**목표**: 모든 코드가 CI를 통과하고 Electron 설치 파일 생성.

#### Phase 9.1 — GitHub Actions CI 워크플로우

- `.github/workflows/ci.yml` — typecheck → lint → test(coverage) → build
- matrix: `ubuntu-latest`
- pnpm cache 설정

```
커밋: ci: add GitHub Actions workflow for typecheck, lint, test, and build
```

#### Phase 9.2 — 커버리지 리포트 연동

- `vitest.config.ts` — `coverage: { provider: 'v8', thresholds: { ... } }`
- CI에서 커버리지 미달 시 실패 처리

```
커밋: ci: add Vitest coverage thresholds and upload to CI report
```

#### Phase 9.3 — Electron 프로덕션 빌드 설정

- `electron-builder.yml` — appId, productName, 아이콘 경로
- `linux`, `mac`, `win` 타겟 설정
- `apps/frontend/package.json`에 `electron:build` 스크립트

```
커밋: chore(electron): configure electron-builder for cross-platform packaging
```

#### Phase 9.4 — Release 워크플로우 (선택)

- `.github/workflows/release.yml` — `v*` 태그 push 시 3개 OS 빌드 후 GitHub Release에 업로드

```
커밋: ci: add release workflow for cross-platform Electron builds on tag push
```

---

## 10. 테스트 전략

### 10.1 단위 테스트 (Vitest)

**공유 패키지:**
```
packages/shared/src/__tests__/
├── scoring.test.ts     ← 모든 12개 카테고리 점수 계산 검증
├── totals.test.ts      ← 보너스 계산, 총점 계산
└── types.test.ts       ← 타입 가드 함수
```

**프론트엔드 컴포넌트:**
```
src/components/Scoreboard/__tests__/
├── Scoreboard.test.tsx ← 렌더링, 클릭 핸들러, 프리뷰 표시
└── Row.test.tsx
src/store/__tests__/
├── gameStore.test.ts   ← 상태 전환 로직
```

**백엔드:**
```
apps/backend/test/
├── unit/
│   ├── game.service.test.ts  ← 게임 로직 검증 (턴 순서, 불법 액션)
│   └── room.service.test.ts  ← 방 관리
└── integration/
    └── game.gateway.spec.ts  ← WebSocket 이벤트 흐름
```

### 10.2 테스트 커버리지 목표

| 모듈 | 목표 커버리지 |
|------|-------------|
| shared/scoring | 100% |
| backend/game.service | ≥ 90% |
| frontend/store | ≥ 80% |
| frontend/components | ≥ 70% |

---

## 11. CI 파이프라인

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      
      - name: Typecheck
        run: pnpm turbo typecheck
      
      - name: Lint
        run: pnpm turbo lint
      
      - name: Test
        run: pnpm turbo test --coverage
      
      - name: Build
        run: pnpm turbo build

  electron-build:
    needs: lint-and-test
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter frontend electron:build
```

---

## 12. 멀티플레이 게임 흐름 (시퀀스)

```
플레이어A (Host)          서버                    플레이어B (Guest)
     |                      |                           |
     |-- room:create ------> |                           |
     |<-- room:created ------|                           |
     |   { roomId: "ABC" }   |                           |
     |                       |                           |
     |                       | <----- room:join ---------|
     |                       |        { roomId: "ABC" }  |
     | <-- game:state --------|-------> game:state ------|
     |   (A's turn)          |                           |
     |                       |                           |
     |-- game:roll --------> |                           |
     |                       | (서버에서 dice 생성)      |
     | <-- game:state --------|-------> game:state ------|
     |   (dice=[3,1,4,1,5])  |       (3D 애니 재생)     |
     |                       |                           |
     |-- game:hold{idx:2} -> |                           |
     | <-- game:state --------|-------> game:state ------|
     |                       |                           |
     |-- game:pick{cat:"ones"}|                          |
     | <-- game:state --------|-------> game:state ------|
     |   (B's turn)          |       (B's turn)          |
```

---

## 13. 구현 시 주의사항

1. **서버 권한**: 주사위 값은 항상 서버에서 생성. 클라이언트는 애니메이션용으로만 값을 받음.
2. **3D/2D 동기화**: Dice3D 컴포넌트는 props로 `values`를 받아 3D 애니메이션을 재생. 로컬과 멀티 모두 동일한 컴포넌트 사용.
3. **React StrictMode**: Dice3D Three.js 씬 setup effect에 `mountedOnce` 가드 필요 (double-invoke 방지).
4. **Electron 보안**: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`. IPC는 preload의 contextBridge만 사용.
5. **disconnect 처리**: 플레이어가 연결이 끊어지면 해당 턴을 건너뛰고 게임 계속 진행. 모든 플레이어가 끊어지면 방 삭제.
6. **CSS 캐시버스팅**: Vite의 content hash를 활용하므로 수동 버전 쿼리 불필요.

---

## 14. 개발 환경 설정 (Quick Start)

```bash
# 의존성 설치
pnpm install

# 개발 서버 시작 (프론트엔드 + 백엔드 동시)
pnpm dev

# 개별 실행
pnpm --filter frontend dev      # Vite dev server
pnpm --filter frontend electron:dev  # Electron 포함
pnpm --filter backend dev       # NestJS watch mode

# 테스트
pnpm test                        # 전체
pnpm --filter shared test        # shared 패키지만
pnpm --filter backend test       # 백엔드만

# 빌드
pnpm build
pnpm --filter frontend electron:build  # Electron 패키징
```

---

## 15. 파일 의존 관계 요약

```
packages/shared
    ↑ (import)
apps/frontend  ←── WebSocket ───→  apps/backend
                                        ↑ (import)
                                   packages/shared
```

`shared` 패키지의 `scoring.ts`는 순수 함수로 유지하여 프론트(점수 미리보기)와 백엔드(점수 검증) 양쪽에서 동일하게 사용.
