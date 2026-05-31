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

export interface RealizedTrade {
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  timestamp: Date;
}

export class PaperEngine {
  public orders: PaperOrder[] = [];
  public positions: PaperPosition[] = [];
  public realizedTrades: RealizedTrade[] = [];
  public balance: number = 100000;
  public isStarted: boolean = true;
  private currentPrices: Record<string, number> = {};

  placeOrder(symbol: string, side: 'buy' | 'sell', type: 'market' | 'limit', size: number, price?: number): PaperOrder {
    const orderCost = (price || 1) * size;
    
    if (this.balance < orderCost) {
      throw new Error("Insufficient paper balance");
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
    
    this.orders.push(order);
    this.updatePosition(order);
    return order;
  }

  private updatePosition(order: PaperOrder) {
    const orderPrice = order.price || 0;
    const pos = this.positions.find(p => p.symbol === order.symbol);
    if (!pos) {
      // Opening a new position: deduct cost from balance
      this.balance -= orderPrice * order.size;
      this.positions.push({
        id: Math.random().toString(),
        symbol: order.symbol,
        side: order.side === 'buy' ? 'LONG' : 'SHORT',
        size: order.size,
        entryPrice: orderPrice,
        unrealizedPnl: 0,
        mode: 'paper'
      });
    } else if (
      (pos.side === 'LONG' && order.side === 'buy') ||
      (pos.side === 'SHORT' && order.side === 'sell')
    ) {
      // Adding to existing position: deduct cost, update avg entry
      this.balance -= orderPrice * order.size;
      const totalCost = pos.entryPrice * pos.size + orderPrice * order.size;
      pos.size += order.size;
      pos.entryPrice = totalCost / pos.size;
    } else {
      // Closing/reducing position: credit proceeds and realize PnL
      const closedSize = Math.min(order.size, pos.size);
      const pnl = (orderPrice - pos.entryPrice) * closedSize * (pos.side === 'LONG' ? 1 : -1);
      this.balance += pos.entryPrice * closedSize + pnl;
      this.realizedTrades.push({
        symbol: order.symbol,
        side: pos.side,
        entryPrice: pos.entryPrice,
        exitPrice: orderPrice,
        size: closedSize,
        pnl,
        timestamp: order.timestamp,
      });
      pos.size -= closedSize;
      if (pos.size <= 0) {
        this.positions = this.positions.filter(p => p.id !== pos.id);
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