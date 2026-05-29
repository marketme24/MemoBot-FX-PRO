import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createContext } from "./src/server/_core/context";
import { appRouter } from "./src/server/router";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type AppRouter = typeof appRouter;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  app.get("/api/settings", (req, res) => {
    res.json({ account: { profileName: "Maher Fekri" }, engine: "MEMOBOT-PRO" });
  });

  // Payment Webhooks
  app.post("/api/webhooks/stripe", express.raw({type: 'application/json'}), (req, res) => {
    console.log("STRIPE WEBHOOK RECEIVED");
    res.json({ received: true });
  });

  app.post("/api/webhooks/telr", express.json(), (req, res) => {
    console.log("TELR (UAE) WEBHOOK RECEIVED");
    res.json({ status: "processed" });
  });

  app.get("/api/subscription/current", (req, res) => {
    res.json({ plan: "pro", status: "active" });
  });

  app.get("/api/prices/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const interval = setInterval(() => {
      const data = JSON.stringify({ symbol: "BTCUSDT", price: (67000 + Math.random() * 100).toFixed(2) });
      res.write(`data: ${data}\n\n`);
    }, 2000);
    req.on("close", () => clearInterval(interval));
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  // Setup WebSockets
  const { setupWebSocketServer } = await import("./src/server/websocket_server");
  const { BinanceWS } = await import("./src/server/binance_ws");
  
  BinanceWS.connect();
  setupWebSocketServer(httpServer);
}

startServer();