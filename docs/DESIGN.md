# BSSM Dice — 디자인 스펙 (DESIGN.md)

> 원본 디자인: `design_extracted/bssm-dice/project/`  
> 디자인 채팅: `design_extracted/bssm-dice/chats/chat1.md`

---

## 게임 개요

**Yacht** — 요트 다이스 (Yahtzee 룰). 주사위 5개를 굴려 12개의 카테고리에 점수를 기록. 가장 높은 총점을 기록한 플레이어가 승리.

### 룰

| 카테고리 | 설명 | 점수 |
|----------|------|------|
| Ones~Sixes | 해당 숫자의 합산 | 숫자 × 개수 |
| Choice | 주사위 5개 합산 | 합계 |
| Four of a Kind | 같은 숫자 4개 이상 | 4개 합산 |
| Full House | 3+2 조합 | 5개 합산 |
| Small Straight | 4연속 | 15 |
| Large Straight | 5연속 | 30 |
| Yacht | 5개 모두 같음 | 50 |
| **Upper Bonus** | 상단 합계 ≥ 63 | +35 |

---

## 레이아웃

```
┌──────────────────────────────────────────────────────────────┐
│  ● Yacht         [Player 1 ▾]  [●●●]  [New Game]            │
├─────────────────────┬────────────────────────────────────────┤
│  Scoresheet         │                                        │
│  ──────────────     │      3D Dice Tray                      │
│  Upper   P1  P2     │      (felt texture background)         │
│  Ones     -   -     │                                        │
│  Twos     -   -     │   [🎲][🎲][🎲][🎲][🎲]               │
│  ...              │                                          │
│  Bonus  0/63  0/63  │              [🥤 컵]                   │
│  ──────────────     │                                        │
│  Lower              │   "Tap the cup to shake & roll"        │
│  Choice   -   -     │                                        │
│  ...                │                                        │
│  Total    0   0     │                                        │
└─────────────────────┴────────────────────────────────────────┘
```

- **전체 화면**: 패딩 없음, 풀블리드
- **헤더**: 52px 고정 높이
- **게임 패널**: `grid-template-columns: 320px 1fr`
- **점수표** (좌측 320px): 스크롤 가능한 컴팩트 표
- **3D 트레이** (우측 나머지): Three.js canvas, 탑뷰

---

## 색상 토큰

### Light 테마 (기본)

| 변수 | 값 | 용도 |
|------|----|------|
| `--bg-page` | `#f5f5f7` | 페이지 배경 |
| `--panel-bg` | `#ffffff` | 패널 배경 |
| `--panel-border` | `rgba(0,0,0,0.06)` | 패널 테두리 |
| `--hairline` | `rgba(0,0,0,0.08)` | 구분선 |
| `--row-hover` | `rgba(0,113,227,0.04)` | 호버 배경 |
| `--pickable` | `rgba(0,113,227,0.07)` | 선택 가능한 셀 |
| `--pickable-hover` | `rgba(0,113,227,0.14)` | 선택 가능 셀 호버 |
| `--felt-from` (soft) | `#f5f5f7` | 트레이 그라디언트 시작 |
| `--felt-to` (soft) | `#ececef` | 트레이 그라디언트 끝 |
| `--color-apple-blue` | `#0071e3` | 주요 액션 색상 |
| `--pip-active` | `#0071e3` | 굴림 횟수 pip 활성 |
| `--pip-inactive` | `rgba(0,0,0,0.14)` | 굴림 횟수 pip 비활성 |

### Dark 테마

| 변수 | 값 |
|------|----|
| `--bg-page` | `#0b0b0d` |
| `--panel-bg` | `#161618` |
| `--felt-from` | `#1c1c1f` |
| `--felt-to` | `#131316` |
| `--color-bright-blue` | `#2997ff` |

### 트레이 무드 변형

| 무드 | `--felt-from` | `--felt-to` |
|------|---------------|-------------|
| Soft (기본) | `#f5f5f7` | `#ececef` |
| Warm | `#f7f0e8` | `#ede2d4` |
| Cool | `#eef2f7` | `#e2e8f0` |

---

## 타이포그래피

| 폰트 변수 | 폰트 패밀리 | 사용처 |
|-----------|-------------|--------|
| `--font-display` | SF Pro Display | 제목, 헤더, 숫자 큰 것 |
| `--font-text` | SF Pro Text | 본문, 표 내용 |

| 위치 | 크기 | 굵기 |
|------|------|------|
| 앱 제목 ("Yacht") | 18px | 600 |
| 점수표 총점 | 22px | 600 |
| 점수표 카테고리명 | 12px | 500 |
| 점수표 도움말 | 10px | 400 |
| 헤더 플레이어명 | 15px | 500 |
| 헤더 eyebrow | 11px | 600 (uppercase) |

---

## 3D 씬 스펙

### Three.js 설정

```
Camera: PerspectiveCamera
  - FOV: 32
  - position: (0, 14.5, 3)
  - lookAt: (0, 0, 0)

Lights:
  - AmbientLight: 0xffffff, intensity 0.6
  - DirectionalLight: 0xffffff, intensity 1.0
    - position: (5, 10, 5)
    - castShadow: true
    - shadow.mapSize: 1024×1024

Renderer:
  - antialias: true
  - shadowMap.enabled: true
  - outputColorSpace: SRGBColorSpace
```

### 트레이 치수

```
바닥: BoxGeometry(8, 0.3, 6), y=0
벽 앞: (8, 1.2, 0.15), y=0.6, z=3.075
벽 뒤: (8, 1.2, 0.15), y=0.6, z=-3.075
벽 좌: (0.15, 1.2, 6), y=0.6, x=-4.075
벽 우: (0.15, 1.2, 6), y=0.6, x=4.075
```

### 컵 스펙

```
타입: LatheGeometry (닫힌 바닥)
반지름: 0.95
높이: 1.7
bottom_y: 0.15 (바닥이 트레이 바닥에서 약간 떠있음)
위치: x=3.0, y=1.0, z=0
색상: #1a1a1a (거의 검정)
inner liner: CylinderGeometry, 색상 #050505
```

### 주사위 스펙

```
BoxGeometry: 0.48 × 0.48 × 0.48
재질: MeshStandardMaterial
  - 흰색 면 + 검정 pip 텍스처 (canvas로 생성)
  - roughness: 0.4
  - metalness: 0.05
HALF = 0.24 (반변 = 물리 계산에 사용)
초기 배치: 트레이 바닥에 고르게 펼쳐서 시작
```

### 물리 상수

```
GRAVITY: 18 (m/s²)
FLOOR_Y: HALF (= 0.24)
RESTITUTION: 0.35  (바닥 반발)
FRICTION: 0.7
DIE_RESTITUTION: 0.4  (주사위-주사위 반발)
REST_VEL: 0.04  (정착 판단 임계값)
CUP_SHAKE_DURATION: 0.55 (초)
```

---

## 컴포넌트별 UI 상세

### GameHeader

- 높이 52px, `border-bottom: 1px solid var(--hairline)`
- 왼쪽: 주사위 SVG 아이콘 + "Yacht" 텍스트
- 오른쪽: 플레이어명(편집 가능 input) + 굴림 pip × 3 + "New game" 버튼

### Scoreboard (점수표)

- `width: 320px`, `border-right: 1px solid var(--hairline)`
- 헤더: "Scoresheet" 제목 + "Tap a row to bank a roll" 서브텍스트
- 표: `border-collapse: collapse`, 행 높이 약 32px
- 활성 플레이어 열: `rgba(0,113,227,0.025)` 배경
- 점수 미리보기: 파란색으로 표시 (`#0071e3`), 0점이면 회색
- 보너스 행: 진행 바 (3px 높이) + "N/63" 숫자
- 총점 행: 22px bold, 활성 플레이어는 파란색

### Dice3D (3D 트레이)

- `position: absolute; inset: 0` (canvas 전체 채움)
- held 주사위: 파란 pill 태그 ("HELD · ●") 오버레이
- 힌트 토스트: 하단 중앙 frosted glass pill
- Cup CTA: "Cup →" 텍스트 우측에 표시

### GameOver 카드

- `position: absolute; inset: 0`, frosted glass overlay
- "GAME OVER" eyebrow (blue, uppercase)
- 승자 이름 + 점수 (32px bold)
- 전체 점수 나열 + "Play again" 파란 버튼

---

## 인터랙션 정의

| 인터랙션 | 트리거 | 동작 |
|----------|--------|------|
| 굴림 | 컵 클릭 | 컵 shake 0.55초 → 주사위 쏟아짐 → 물리 |
| 보유 | 주사위 클릭 (굴린 후) | held 토글, 파란 pill 표시 |
| 점수 선택 | 점수표 행 클릭 (굴린 후) | 해당 카테고리 점수 확정, 다음 플레이어 턴 |
| 이름 변경 | 헤더 이름 클릭 | input 편집 가능 |
| 새 게임 | "New game" 버튼 | 모든 상태 초기화 |

---

## 멀티플레이 UI 추가 요소

### 로비 화면 (MultiplayerLobby)

- 모달 오버레이
- "방 만들기" 탭: 닉네임 입력 → 방 코드 생성 및 공유
- "참가하기" 탭: 방 코드 4자리 입력 → 참가
- 연결 상태 표시 (connecting / connected / disconnected)

### 게임 중 멀티 표시

- 점수표 헤더에 각 플레이어 연결 상태 dot 표시
- 비활성 플레이어 관전 모드 (주사위 굴림 애니메이션은 보임)
- "상대방 차례입니다..." 힌트 토스트
