---
name: testing-memobot-api
description: Test MemoBot FX-PRO tRPC API endpoints end-to-end. Use when verifying auth, trading, risk, or persistence changes.
---

# Testing MemoBot FX-PRO API

## Prerequisites

- Node.js 22+ installed
- `npm install` run in `memobot/` directory

## Devin Secrets Needed

No secrets required for testing — the server creates an admin user from env vars at startup.

## Starting the Server

```bash
cd memobot
ADMIN_EMAIL=admin@memobot.local ADMIN_PASSWORD='TestAdmin123!' PROFILE_NAME=TestTrader npx tsx server.ts
```

Server listens on `http://localhost:3000`.

## Testing Approach

All testing is **shell-only via curl** to tRPC endpoints at `http://localhost:3000/api/trpc/<procedure>`. No browser recording needed.

### tRPC Endpoint Format

- **Mutations** (POST): `curl -s 'http://localhost:3000/api/trpc/<procedure>' -H 'Content-Type: application/json' -d '{...}'`
- **Queries** (GET): `curl -s 'http://localhost:3000/api/trpc/<procedure>'`
- **Auth header**: `-H 'Authorization: Bearer <token>'`

### Key Endpoints

| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `auth.login` | mutation | no | Login with email/password |
| `auth.register` | mutation | no | Register new user |
| `auth.me` | query | yes | Get current user info |
| `auth.logout` | mutation | yes | Invalidate session |
| `auth.verifyPin` | mutation | yes | Verify 4-digit PIN |
| `auth.setApiKeys` | mutation | yes | Store Binance API keys |
| `risk.getConfig` | query | no | Get risk configuration |
| `risk.updateConfig` | mutation | yes | Update risk config |
| `analytics.getPaperAnalytics` | query | no | Paper trading stats |
| `bot.control` | mutation | yes | Start/stop/pause bots |

### Common Test Patterns

**Get auth token:**
```bash
TOKEN=$(curl -s 'http://localhost:3000/api/trpc/auth.login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@memobot.local","password":"TestAdmin123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['data']['token'])")
```

**Test protected endpoint rejects no-auth:**
```bash
curl -s 'http://localhost:3000/api/trpc/auth.me'
# Should return error with code UNAUTHORIZED
```

**Test rate limiting:**
```bash
for i in {1..6}; do
  curl -s 'http://localhost:3000/api/trpc/auth.login' \
    -H 'Content-Type: application/json' \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# 6th attempt should return TOO_MANY_REQUESTS
```

## Data Persistence

Persistent files are stored in `memobot/data/`:
- `users.json` — registered users with bcrypt hashes
- `sessions.json` — active sessions (debounced writes, 1s delay)
- `api_keys.json` — server-side API key storage

To test persistence, clean data files before starting: `rm -f memobot/data/*.json`

## Environment Constraints

- **Binance WebSocket returns 451** from test server IPs (geo-restriction). This is expected and does not affect API testing.
- **Kilo Code Review CI** may fail due to account credits — pre-existing, not code-related.
- **Vite file watcher** may hit inotify limit. Fix: `echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p`

## Graceful Shutdown Testing

```bash
SERVER_PID=$(fuser 3000/tcp 2>/dev/null | awk '{print $1}')
kill -TERM $SERVER_PID
# Should log: [SHUTDOWN] Received SIGTERM. Shutting down gracefully...
```
