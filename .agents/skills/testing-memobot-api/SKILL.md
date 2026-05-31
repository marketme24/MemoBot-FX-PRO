---
name: testing-memobot-api
description: End-to-end test MemoBot FX-PRO tRPC API. Use when verifying auth, trading engine, iBrain, or API changes.
---

# Testing MemoBot FX-PRO — tRPC API

## Prerequisites

- Node.js with `npx tsx` available
- The `memobot/` directory contains the server code
- A symlink may be needed: `ln -s src/server_core/context.ts src/server/_core/context.ts` (import paths reference `_core` but actual dir is `server_core`)

## Server Startup

The server does NOT use dotenv. Pass env vars inline:

```bash
cd memobot
ADMIN_EMAIL=admin@memobot.local ADMIN_PASSWORD='TestAdmin123!' PROFILE_NAME=TestTrader npx tsx server.ts
```

Server runs on port 3000.

## Devin Secrets Needed

None required for testing. The admin user is seeded from `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars at startup. For live Binance testing (not recommended from VM), you would need `BINANCE_API_KEY` and `BINANCE_API_SECRET`.

## tRPC Request Format

- **Mutations** (POST): Raw JSON body, NO `{"json": ...}` wrapper (Zod v4 + tRPC v11)
  ```bash
  curl -s 'http://localhost:3000/api/trpc/auth.login' -X POST \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@memobot.local","password":"TestAdmin123!"}'
  ```
- **Queries** (GET): URL-encoded `input` query param
  ```bash
  curl -s 'http://localhost:3000/api/trpc/analytics.performance?input=%7B%22mode%22%3A%22paper%22%7D' \
    -H 'Authorization: Bearer <token>'
  ```
- **Auth header**: `Authorization: Bearer <64-char-hex-token>`

## Key Procedure Paths

| Procedure | Method | Auth | Notes |
|-----------|--------|------|-------|
| `auth.login` | POST | public | Returns `{token, user}` |
| `auth.register` | POST | public | Min 8-char password |
| `auth.logout` | POST | protected | Invalidates session |
| `auth.me` | GET | protected | Returns current user |
| `auth.setApiKeys` | POST | protected | Stores keys server-side |
| `admin.getUsers` | GET | admin | Returns all users |
| `analytics.performance` | GET | protected | Input: `{"mode":"paper"}` |
| `ai.getMarketVerdict` | GET | public | Input: `{"symbol":"BTCUSDT"}` |
| `/api/settings` | GET | none | Non-tRPC endpoint, returns profile config |

## Frontend Auth Limitation

The frontend `AuthContext.tsx` is a localStorage mock that does NOT call the backend auth system. All auth testing must be done via direct tRPC API calls, not through the UI.

## Known Environment Issues

- **Binance WebSocket 451**: VM IPs are geo-restricted from Binance. The WebSocket will fail with 451 and auto-reconnect repeatedly. This is expected — verify reconnect logic via server logs (`"Reconnecting in 5s..."`).
- **Import path mismatch**: `router.ts` imports from `./_core/context` but actual file is at `src/server_core/context.ts`. May need symlink: `mkdir -p src/server/_core && ln -s $(pwd)/src/server_core/context.ts src/server/_core/context.ts`

## Test Categories

1. **Auth flow**: Login (correct/wrong/non-existent), register (new/duplicate), logout (token invalidation)
2. **Authorization**: Protected endpoints reject no-auth (UNAUTHORIZED), admin endpoints reject non-admin (FORBIDDEN)
3. **API key storage**: Keys stored server-side with auth required
4. **Dynamic config**: PROFILE_NAME from env var (not hardcoded)
5. **Paper engine PnL**: `analytics.performance` returns dynamic `totalPnL` from `realizedTrades[]` (not always 0)
6. **iBrain verdict**: `ai.getMarketVerdict` returns dynamic confidence (not hardcoded 87.5%)
7. **WebSocket reconnect**: Check server logs for reconnect messages
8. **Atomic DB writes**: Code inspection of `database.ts` for tmp+rename pattern

## Tips

- When parsing tRPC responses in shell, write to files (`> /tmp/response.json`) instead of shell variables to avoid JSON quoting issues
- The paper engine may execute trades automatically if a bot is running — check `totalTrades` and `totalPnL` for non-zero values
- Admin user is only seeded if `ADMIN_PASSWORD` env var is set at startup
