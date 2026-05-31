import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import type { AppRouter } from "../server/router";

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        headers() {
          const token = localStorage.getItem('auth_token');
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
