import { inferAsyncReturnType, initTRPC, TRPCError } from '@trpc/server';
import type * as trpcExpress from '@trpc/server/adapters/express';
import crypto from 'crypto';

// Server-side session store for authenticated users
interface SessionData {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: number;
  expiresAt: number;
}

const sessionStore = new Map<string, SessionData>();

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
  return token;
}

export function invalidateSession(token: string): void {
  sessionStore.delete(token);
}

function getSession(token: string): SessionData | null {
  const session = sessionStore.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessionStore.delete(token);
    return null;
  }
  return session;
}

// Periodically clean expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessionStore.entries()) {
    if (now > session.expiresAt) sessionStore.delete(token);
  }
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
