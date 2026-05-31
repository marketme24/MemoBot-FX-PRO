import { inferAsyncReturnType, initTRPC, TRPCError } from '@trpc/server';
import type * as trpcExpress from '@trpc/server/adapters/express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// --- Persistent session store ---
interface SessionData {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: number;
  expiresAt: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function atomicWriteFile(filePath: string, data: string) {
  ensureDataDir();
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, filePath);
}

const sessionStore = new Map<string, SessionData>();
let sessionSaveDebounce: ReturnType<typeof setTimeout> | null = null;

function loadSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const entries: Record<string, SessionData> = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      const now = Date.now();
      for (const [token, session] of Object.entries(entries)) {
        if (now < session.expiresAt) {
          sessionStore.set(token, session);
        }
      }
    }
  } catch { /* start fresh */ }
}

function saveSessions() {
  if (sessionSaveDebounce) clearTimeout(sessionSaveDebounce);
  sessionSaveDebounce = setTimeout(() => {
    const obj: Record<string, SessionData> = {};
    for (const [k, v] of sessionStore.entries()) obj[k] = v;
    atomicWriteFile(SESSIONS_FILE, JSON.stringify(obj, null, 2));
  }, 1000);
}

loadSessions();

// Session lifetime: 24 hours
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function createSession(userId: string, email: string, role: 'admin' | 'user'): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  sessionStore.set(token, {
    userId,
    email,
    role,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });
  saveSessions();
  return token;
}

export function invalidateSession(token: string): void {
  sessionStore.delete(token);
  saveSessions();
}

function getSession(token: string): SessionData | null {
  const session = sessionStore.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessionStore.delete(token);
    saveSessions();
    return null;
  }
  return session;
}

// Periodically clean expired sessions
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [token, session] of sessionStore.entries()) {
    if (now > session.expiresAt) {
      sessionStore.delete(token);
      changed = true;
    }
  }
  if (changed) saveSessions();
}, 60 * 60 * 1000);

export const createContext = ({ req, res }: trpcExpress.CreateExpressContextOptions) => {
  const authHeader = req.headers.authorization;
  let session: SessionData | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    session = getSession(token);
  }

  return { session, req, res };
};

type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure - requires valid session token
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Please log in.',
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

// Admin procedure - requires admin role
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Please log in.',
    });
  }
  if (ctx.session.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required.',
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});
