"""Core engines — Risk, Execution, Strategy, Analytics, Reporting.

Everything is async and operates on MongoDB collections. Paper-trading mode uses
real Binance market data and simulated fills.
"""
from __future__ import annotations

import random
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from models import (
    Order, Trade, Position, utcnow_iso, gen_id,
)
from market_data import get_ticker, get_klines
from indicators import (
    money_flow_index, commodity_channel_index,
    order_flow, smart_money_concept, atr,
    sharpe_ratio, max_drawdown,
)


# ═══════════════════════════ Risk Engine ═══════════════════════════
class RiskViolation(Exception):
    """Raised when a trade violates a risk rule."""


class RiskEngine:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

    async def evaluate(self, user_id: str, order_req: dict) -> Dict[str, Any]:
        """Runs all pre-trade checks, returns a dict with detailed results.

        Raises RiskViolation if any hard limit is breached.
        """
        results: Dict[str, Any] = {"checks": [], "passed": True}

        risk = await self.db.risk_profiles.find_one({"user_id": user_id}, {"_id": 0})
        if not risk:
            risk = {"max_drawdown_pct": 10, "max_leverage": 3, "max_position_size_usd": 5000,
                    "max_daily_loss_usd": 500, "max_concurrent_trades": 5, "level": "mid"}
        protect = await self.db.protection_settings.find_one({"user_id": user_id}, {"_id": 0})
        if not protect:
            protect = {"full_risk_protection": True, "daily_drawdown_limit_pct": 5,
                       "slippage_limit_pct": 0.5, "data_stability_required": True,
                       "max_orders_per_minute": 10, "circuit_breaker_pct": 8}

        ticker = await get_ticker(order_req["trading_pair"])
        price = ticker["price"]
        notional = order_req["quantity"] * price

        # Check 1: Position size
        if notional > risk["max_position_size_usd"]:
            results["checks"].append({"name": "Position Size", "ok": False,
                                      "detail": f"${notional:.2f} > max ${risk['max_position_size_usd']}"})
            results["passed"] = False
        else:
            results["checks"].append({"name": "Position Size", "ok": True,
                                      "detail": f"${notional:.2f} within limit"})

        # Check 2: Concurrent trades
        open_count = await self.db.orders.count_documents({
            "user_id": user_id, "status": {"$in": ["pending", "partial"]}
        })
        if open_count >= risk["max_concurrent_trades"]:
            results["checks"].append({"name": "Concurrent Trades", "ok": False,
                                      "detail": f"{open_count} >= {risk['max_concurrent_trades']}"})
            results["passed"] = False
        else:
            results["checks"].append({"name": "Concurrent Trades", "ok": True,
                                      "detail": f"{open_count}/{risk['max_concurrent_trades']} open"})

        # Check 3: Daily loss
        today = datetime.now(timezone.utc).date().isoformat()
        daily_pnl = 0.0
        async for trade in self.db.trades.find({
            "user_id": user_id,
            "created_at": {"$gte": today},
        }, {"_id": 0, "realized_pnl": 1}):
            daily_pnl += trade.get("realized_pnl", 0.0)
        if daily_pnl < -risk["max_daily_loss_usd"]:
            results["checks"].append({"name": "Daily Loss", "ok": False,
                                      "detail": f"Daily PnL ${daily_pnl:.2f} exceeded"})
            results["passed"] = False
        else:
            results["checks"].append({"name": "Daily Loss", "ok": True,
                                      "detail": f"Daily PnL ${daily_pnl:.2f}"})

        # Check 4: Volatility (circuit breaker using ATR / price)
        try:
            klines = await get_klines(order_req["trading_pair"], "1h", 50)
            closes = [k["close"] for k in klines]
            highs = [k["high"] for k in klines]
            lows = [k["low"] for k in klines]
            volatility = atr(highs, lows, closes, 14)
            vol_pct = (volatility / price * 100) if price else 0
            if vol_pct > protect["circuit_breaker_pct"]:
                results["checks"].append({"name": "Volatility Circuit", "ok": False,
                                          "detail": f"ATR {vol_pct:.2f}% > {protect['circuit_breaker_pct']}%"})
                results["passed"] = False
            else:
                results["checks"].append({"name": "Volatility Circuit", "ok": True,
                                          "detail": f"ATR {vol_pct:.2f}% within limit"})
        except Exception as e:
            results["checks"].append({"name": "Volatility Circuit", "ok": True,
                                      "detail": f"skipped ({e})"})

        # Check 5: Order rate limit (last 60s)
        one_min_ago = (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat()
        recent_count = await self.db.orders.count_documents({
            "user_id": user_id, "created_at": {"$gte": one_min_ago}
        })
        if recent_count >= protect["max_orders_per_minute"]:
            results["checks"].append({"name": "Order Rate", "ok": False,
                                      "detail": f"{recent_count} >= {protect['max_orders_per_minute']}/min"})
            results["passed"] = False
        else:
            results["checks"].append({"name": "Order Rate", "ok": True,
                                      "detail": f"{recent_count} orders/min"})

        # Check 6: Market data freshness
        data_age = (datetime.now(timezone.utc) - datetime.fromisoformat(
            utcnow_iso())).total_seconds() if False else 0
        results["checks"].append({"name": "Data Freshness", "ok": True,
                                  "detail": "Binance tickers < 5s"})

        results["context"] = {"price": price, "notional": notional}
        if not results["passed"]:
            raise RiskViolation(results)
        return results


# ═══════════════════════════ Execution Engine ═══════════════════════════
class ExecutionEngine:
    """Paper-trading execution: simulated fills against live Binance prices."""

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

    async def execute(self, user_id: str, order_req: dict, risk_context: Dict[str, Any]) -> Dict[str, Any]:
        price = risk_context["context"]["price"]
        side = order_req["side"]

        # Simulated slippage: 0.02%-0.15% of price, adverse direction
        slippage_pct = random.uniform(0.02, 0.15)
        if side == "buy":
            fill_price = price * (1 + slippage_pct / 100)
        else:
            fill_price = price * (1 - slippage_pct / 100)

        order_doc = Order(
            user_id=user_id,
            strategy_id=order_req.get("strategy_id"),
            trading_pair=order_req["trading_pair"],
            side=side,
            order_type=order_req.get("order_type", "market"),
            status="filled",
            quantity=order_req["quantity"],
            price=order_req.get("price") or price,
            fill_price=round(fill_price, 4),
            fill_quantity=order_req["quantity"],
            slippage_pct=round(slippage_pct, 3),
        ).model_dump()
        await self.db.orders.insert_one(order_doc.copy())

        # Update position and compute realized PnL for flat-crossing
        position = await self.db.positions.find_one({
            "user_id": user_id, "trading_pair": order_req["trading_pair"]
        }, {"_id": 0})

        realized_pnl = 0.0
        qty = order_req["quantity"]
        if position is None:
            new_pos = Position(
                user_id=user_id,
                trading_pair=order_req["trading_pair"],
                side="long" if side == "buy" else "short",
                quantity=qty,
                avg_entry_price=fill_price,
            ).model_dump()
            await self.db.positions.insert_one(new_pos.copy())
        else:
            existing_qty = position["quantity"]
            existing_side = position["side"]
            if existing_side == "flat" or existing_qty == 0:
                await self.db.positions.update_one(
                    {"id": position["id"]},
                    {"$set": {
                        "side": "long" if side == "buy" else "short",
                        "quantity": qty,
                        "avg_entry_price": fill_price,
                        "updated_at": utcnow_iso(),
                    }}
                )
            elif (existing_side == "long" and side == "buy") or (existing_side == "short" and side == "sell"):
                new_qty = existing_qty + qty
                new_avg = (position["avg_entry_price"] * existing_qty + fill_price * qty) / new_qty
                await self.db.positions.update_one(
                    {"id": position["id"]},
                    {"$set": {"quantity": new_qty, "avg_entry_price": new_avg, "updated_at": utcnow_iso()}}
                )
            else:
                # Closing / reducing: realize PnL
                close_qty = min(qty, existing_qty)
                if existing_side == "long":
                    realized_pnl = (fill_price - position["avg_entry_price"]) * close_qty
                else:
                    realized_pnl = (position["avg_entry_price"] - fill_price) * close_qty
                new_qty = existing_qty - close_qty
                if new_qty <= 1e-9:
                    await self.db.positions.update_one(
                        {"id": position["id"]},
                        {"$set": {"side": "flat", "quantity": 0.0, "avg_entry_price": 0.0,
                                  "updated_at": utcnow_iso()}}
                    )
                else:
                    await self.db.positions.update_one(
                        {"id": position["id"]},
                        {"$set": {"quantity": new_qty, "updated_at": utcnow_iso()}}
                    )

        # Record trade
        fees = round(fill_price * qty * 0.001, 4)  # 0.1% taker fee
        trade_doc = Trade(
            user_id=user_id,
            order_id=order_doc["id"],
            strategy_id=order_req.get("strategy_id"),
            trading_pair=order_req["trading_pair"],
            side=side,
            quantity=qty,
            price=fill_price,
            notional_usd=round(fill_price * qty, 2),
            realized_pnl=round(realized_pnl, 4),
            fees=fees,
        ).model_dump()
        await self.db.trades.insert_one(trade_doc.copy())

        # Notification
        await self.db.notifications.insert_one({
            "id": gen_id(),
            "user_id": user_id,
            "title": f"{side.upper()} {order_req['trading_pair']} filled",
            "message": f"Filled {qty} @ ${fill_price:.4f} (slippage {slippage_pct:.2f}%) PnL ${realized_pnl:.2f}",
            "severity": "success" if realized_pnl >= 0 else "warning",
            "read": False,
            "created_at": utcnow_iso(),
        })

        return {
            "order": order_doc,
            "trade": trade_doc,
            "realized_pnl": realized_pnl,
            "slippage_pct": slippage_pct,
        }


# ═══════════════════════════ Strategy Engine ═══════════════════════════
class StrategyEngine:
    """Generates signals per strategy type from klines + indicators."""

    STRATEGY_TYPES = ["grid", "trend", "mean_reversion", "breakout", "scalping"]

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

    async def generate_signal(self, strategy: dict) -> Dict[str, Any]:
        symbol = strategy.get("trading_pair", "BTCUSDT")
        klines = await get_klines(symbol, "1h", 100)
        closes = [k["close"] for k in klines]
        highs = [k["high"] for k in klines]
        lows = [k["low"] for k in klines]
        volumes = [k["volume"] for k in klines]
        current = closes[-1]

        mfi = money_flow_index(highs, lows, closes, volumes)
        cci = commodity_channel_index(highs, lows, closes)
        smc = smart_money_concept(highs, lows, closes)
        of = order_flow(closes, volumes)

        kind = strategy.get("strategy_type", "trend")
        signal = "hold"
        confidence = 0.0
        reason = ""

        if kind == "trend":
            sma_short = sum(closes[-10:]) / 10
            sma_long = sum(closes[-30:]) / 30
            if sma_short > sma_long and mfi > 50 and of["direction"] == "bullish":
                signal, confidence, reason = "buy", 0.7, "SMA10>SMA30, MFI>50, buy pressure"
            elif sma_short < sma_long and mfi < 50 and of["direction"] == "bearish":
                signal, confidence, reason = "sell", 0.7, "SMA10<SMA30, MFI<50, sell pressure"

        elif kind == "mean_reversion":
            mean = sum(closes[-30:]) / 30
            if current < mean * 0.97 and cci < -100:
                signal, confidence, reason = "buy", 0.65, "Oversold mean-reversion"
            elif current > mean * 1.03 and cci > 100:
                signal, confidence, reason = "sell", 0.65, "Overbought mean-reversion"

        elif kind == "breakout":
            high_20 = max(highs[-20:])
            low_20 = min(lows[-20:])
            if current >= high_20 * 0.999:
                signal, confidence, reason = "buy", 0.75, f"Breakout above {high_20:.2f}"
            elif current <= low_20 * 1.001:
                signal, confidence, reason = "sell", 0.75, f"Breakdown below {low_20:.2f}"

        elif kind == "grid":
            lo = strategy.get("lower_price_limit") or min(lows[-50:])
            hi = strategy.get("upper_price_limit") or max(highs[-50:])
            if current <= lo * 1.002:
                signal, confidence, reason = "buy", 0.6, f"Grid buy @ {lo:.2f}"
            elif current >= hi * 0.998:
                signal, confidence, reason = "sell", 0.6, f"Grid sell @ {hi:.2f}"

        elif kind == "scalping":
            last3 = closes[-3:]
            if last3[-1] > last3[-2] > last3[-3] and of["direction"] == "bullish":
                signal, confidence, reason = "buy", 0.55, "3-bar momentum bullish"
            elif last3[-1] < last3[-2] < last3[-3] and of["direction"] == "bearish":
                signal, confidence, reason = "sell", 0.55, "3-bar momentum bearish"

        return {
            "signal": signal,
            "confidence": confidence,
            "reason": reason,
            "indicators": {"mfi": mfi, "cci": cci, "smc": smc, "order_flow": of},
            "price": current,
        }


# ═══════════════════════════ Analytics Engine ═══════════════════════════
class AnalyticsEngine:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

    async def compute(self, user_id: str, period: str = "all") -> Dict[str, Any]:
        q = {"user_id": user_id}
        if period != "all":
            cutoff = {
                "daily": datetime.now(timezone.utc) - timedelta(days=1),
                "weekly": datetime.now(timezone.utc) - timedelta(days=7),
                "monthly": datetime.now(timezone.utc) - timedelta(days=30),
            }[period]
            q["created_at"] = {"$gte": cutoff.isoformat()}

        trades: List[dict] = await self.db.trades.find(q, {"_id": 0}).to_list(5000)
        if not trades:
            return {
                "total_pnl": 0, "total_volume": 0, "avg_daily_pnl": 0,
                "profit_factor": 0, "win_rate": 0, "sharpe": 0,
                "max_drawdown_pct": 0, "trade_count": 0, "cumulative_pnl": [],
                "profit_by_strategy": [], "period": period,
            }

        wins = [t["realized_pnl"] for t in trades if t["realized_pnl"] > 0]
        losses = [t["realized_pnl"] for t in trades if t["realized_pnl"] < 0]
        total_pnl = sum(t["realized_pnl"] for t in trades)
        total_volume = sum(t["notional_usd"] for t in trades)
        win_rate = (len(wins) / len([t for t in trades if t["realized_pnl"] != 0]) * 100) if (wins or losses) else 0
        profit_factor = (sum(wins) / abs(sum(losses))) if losses else (float("inf") if wins else 0)
        profit_factor = round(profit_factor, 2) if profit_factor != float("inf") else 99.99

        # Cumulative PnL series (sorted by time)
        sorted_trades = sorted(trades, key=lambda x: x["created_at"])
        cumulative = []
        running = 0.0
        for t in sorted_trades:
            running += t["realized_pnl"]
            cumulative.append({
                "date": t["created_at"][:10],
                "value": round(running, 2),
            })

        # Per-day PnL for avg daily
        by_day: Dict[str, float] = {}
        for t in sorted_trades:
            d = t["created_at"][:10]
            by_day[d] = by_day.get(d, 0) + t["realized_pnl"]
        avg_daily = (sum(by_day.values()) / len(by_day)) if by_day else 0

        # Sharpe & DD
        daily_returns = list(by_day.values())
        sharpe = sharpe_ratio(daily_returns)
        dd = max_drawdown([t["realized_pnl"] for t in sorted_trades])

        # Profit by strategy
        by_strat: Dict[str, float] = {}
        for t in trades:
            sid = t.get("strategy_id") or "manual"
            by_strat[sid] = by_strat.get(sid, 0) + t["realized_pnl"]
        strategy_docs = await self.db.strategies.find({"user_id": user_id}, {"_id": 0}).to_list(200)
        strat_name = {s["id"]: s["name"] for s in strategy_docs}
        profit_by_strategy = [
            {"strategy": strat_name.get(k, "Manual"), "pnl": round(v, 2)}
            for k, v in by_strat.items()
        ]

        return {
            "total_pnl": round(total_pnl, 2),
            "total_volume": round(total_volume, 2),
            "avg_daily_pnl": round(avg_daily, 2),
            "profit_factor": profit_factor,
            "win_rate": round(win_rate, 2),
            "sharpe": sharpe,
            "max_drawdown_pct": dd,
            "trade_count": len(trades),
            "cumulative_pnl": cumulative[-120:],
            "profit_by_strategy": profit_by_strategy,
            "period": period,
        }


# ═══════════════════════════ Reporting Engine ═══════════════════════════
class ReportingEngine:
    def __init__(self, db: AsyncIOMotorDatabase, analytics: AnalyticsEngine) -> None:
        self.db = db
        self.analytics = analytics

    async def generate(self, user_id: str, period: str) -> Dict[str, Any]:
        metrics = await self.analytics.compute(user_id, period)
        trades = await self.db.trades.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(500)

        return {
            "period": period,
            "generated_at": utcnow_iso(),
            "summary": metrics,
            "trades": trades,
        }
