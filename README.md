# BSSM Dice

Yacht dice game with Three.js 3D physics and Electron.

## Tech Stack

- **Frontend**: Electron 35 + React 19 + TypeScript 5.8 + Three.js r170
- **Backend**: NestJS 11 + WebSocket
- **State**: Zustand
- **Build**: Turborepo + pnpm workspaces

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Project Structure

```
dice/
├── apps/
│   ├── frontend/    # Electron + React + Three.js
│   └── backend/     # NestJS WebSocket server
├── packages/
│   └── shared/      # Shared types and game logic
└── docs/
    ├── PLAN.md      # Implementation plan
    ├── DESIGN.md    # Design specifications
    └── AGENT.md     # Agent guide
```

## License

MIT
