// src/server/engine_paper.ts
export interface PaperOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  price?: number;
  size: number;
  status: 'new' | 'filled' | 'canceled' | 'rejected';
  mode: 'paper';
  timestamp: Date;
}

export interface PaperPosition {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  unrealizedPnl: number;
  mode: 'paper';
}

export class PaperEngine {
  public orders: PaperOrder[] = [];
  public positions: PaperPosition[] = [];
  public balance: number = 100000;
  public isStarted: boolean = true;                     // ✅ added for engine_manager
  private currentPrices: Record<string, number> = {};   // ✅ added for getCurrentPrice

  placeOrder(symbol: string, side: 'buy' | 'sell', type: 'market' | 'limit', size: number, price?: number): PaperOrder {
    const orderCost = (price || 1) * size;
    
    if (side === 'buy' && this.balance < orderCost) {
      throw new Error("Insufficient paper balance");
    }

    // Block naked shorts: SELL is only allowed up to currently held LONG size on that symbol.
    if (side === 'sell') {
      const longPos = this.positions.find(p => p.symbol === symbol && p.side === 'LONG');
      const heldSize = longPos ? longPos.size : 0;
      if (heldSize <= 0) {
        throw new Error(`Cannot sell ${symbol}: no long position to close (naked shorts disabled)`);
      }
      if (size > heldSize) {
        throw new Error(`Cannot sell ${size} ${symbol}: only ${heldSize} held`);
      }
    }

    const order: PaperOrder = {
      id: Math.random().toString(),
      symbol,
      side,
      type,
      price,
      size,
      status: 'filled',
      mode: 'paper',
      timestamp: new Date()
    };
    
    if (side === 'buy') {
      this.balance -= orderCost;
    } else {
      this.balance += orderCost;
    }

    this.orders.push(order);
    this.updatePosition(order);
    return order;
  }

  private updatePosition(order: PaperOrder) {
    const pos = this.positions.find(p => p.symbol === order.symbol);
    if (!pos) {
      this.positions.push({
        id: Math.random().toString(),
        symbol: order.symbol,
        side: order.side === 'buy' ? 'LONG' : 'SHORT',
        size: order.size,
        entryPrice: order.price || 0,
        unrealizedPnl: 0,
        mode: 'paper'
      });
    } else {
      if (
        (pos.side === 'LONG' && order.side === 'buy') ||
        (pos.side === 'SHORT' && order.side === 'sell')
      ) {
        pos.size += order.size;
      } else {
        pos.size -= order.size;
        if (pos.size <= 0) {
          this.positions = this.positions.filter(p => p.id !== pos.id);
        }
      }
    }
  }

  updatePrices(tickers: { symbol: string; price: number }[]) {
    // Store latest prices
    for (const t of tickers) {
      this.currentPrices[t.symbol] = t.price;
    }
    // Update unrealized PnL for open positions
    for (const pos of this.positions) {
      const ticker = tickers.find(t => t.symbol === pos.symbol);
      if (ticker) {
        pos.unrealizedPnl = (ticker.price - pos.entryPrice) * pos.size * (pos.side === 'LONG' ? 1 : -1);
      }
    }
  }

  // ✅ Required by engine_manager.ts
  public getCurrentPrice(symbol: string): number {
    return this.currentPrices[symbol] || 0;
  }
}