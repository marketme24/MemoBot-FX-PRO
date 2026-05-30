import WebSocket from 'ws';
import { logger } from './logger';

interface BinanceWSConfig {
  symbols: string[];
  onPrice: (symbol: string, price: number) => void;
}

class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private reconnectInterval: ReturnType<typeof setTimeout> | null = null;
  private isConnected = false;
  private symbols: string[] = ['btcusdt', 'ethusdt', 'solusdt'];
  private priceCallbacks: ((symbol: string, price: number) => void)[] = [];
  private prices: Record<string, number> = {};

  connect(config?: Partial<BinanceWSConfig>) {
    if (config?.symbols) this.symbols = config.symbols.map(s => s.toLowerCase().replace('/', ''));
    if (config?.onPrice) this.priceCallbacks.push(config.onPrice);

    const streams = this.symbols.map(s => `${s}@ticker`).join('/');
    const url = `wss://stream.binance.com:9443/ws/${streams}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.isConnected = true;
        logger.engine('info', `Binance WebSocket connected (${this.symbols.length} streams)`);
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.e === '24hrTicker' && msg.s && msg.c) {
            const symbol = msg.s; // e.g. "BTCUSDT"
            const price = parseFloat(msg.c);
            this.prices[symbol] = price;
            for (const cb of this.priceCallbacks) {
              cb(symbol, price);
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      });

      this.ws.on('close', () => {
        this.isConnected = false;
        logger.engine('warn', 'Binance WebSocket disconnected. Reconnecting in 5s...');
        this.scheduleReconnect();
      });

      this.ws.on('error', (err: Error) => {
        logger.engine('error', `Binance WebSocket error: ${err.message}`);
        if (this.ws) {
          this.ws.close();
        }
      });
    } catch (e) {
      logger.engine('error', `Failed to connect Binance WebSocket: ${e}`);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectInterval) return;
    this.reconnectInterval = setTimeout(() => {
      this.reconnectInterval = null;
      this.connect();
    }, 5000);
  }

  onPrice(callback: (symbol: string, price: number) => void) {
    this.priceCallbacks.push(callback);
  }

  getPrice(symbol: string): number {
    return this.prices[symbol.toUpperCase().replace('/', '')] || 0;
  }

  getAllPrices(): Record<string, number> {
    return { ...this.prices };
  }

  disconnect() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const BinanceWS = new BinanceWebSocket();
