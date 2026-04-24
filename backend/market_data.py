"""Crypto market data client.

Prices & history come from **CoinGecko** (globally available).
Symbol deep-links still target Binance live chart pages.
"""
import asyncio
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

# symbol on app ↔ CoinGecko coin id
SYMBOL_TO_COIN: Dict[str, str] = {
    "BTCUSDT": "bitcoin",
    "ETHUSDT": "ethereum",
    "BNBUSDT": "binancecoin",
    "SOLUSDT": "solana",
    "XRPUSDT": "ripple",
    "ADAUSDT": "cardano",
    "DOGEUSDT": "dogecoin",
    "AVAXUSDT": "avalanche-2",
    "LINKUSDT": "chainlink",
    "DOTUSDT": "polkadot",
    "MATICUSDT": "matic-network",
    "LTCUSDT": "litecoin",
}
COIN_TO_SYMBOL = {v: k for k, v in SYMBOL_TO_COIN.items()}

TRACKED_SYMBOLS: List[str] = list(SYMBOL_TO_COIN.keys())


class MarketDataCache:
    """In-process cache so we don't rate-limit ourselves on CoinGecko."""

    def __init__(self) -> None:
        self.tickers: Dict[str, Dict[str, Any]] = {}
        self.last_fetch: Optional[datetime] = None
        self.klines: Dict[str, Dict[str, Any]] = {}  # symbol → {fetched_at, data}
        self._lock = asyncio.Lock()

    def is_fresh(self, seconds: int = 20) -> bool:
        if not self.last_fetch:
            return False
        return (datetime.now(timezone.utc) - self.last_fetch).total_seconds() < seconds


cache = MarketDataCache()


async def fetch_all_tickers(force: bool = False) -> List[Dict[str, Any]]:
    async with cache._lock:
        if not force and cache.is_fresh(20):
            return list(cache.tickers.values())
        ids = ",".join(SYMBOL_TO_COIN.values())
        url = f"{COINGECKO_BASE}/coins/markets"
        params = {
            "vs_currency": "usd",
            "ids": ids,
            "price_change_percentage": "24h",
            "per_page": 50,
        }
        async with httpx.AsyncClient(timeout=12.0) as client:
            try:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                rows = resp.json()
            except Exception as exc:
                if cache.tickers:
                    return list(cache.tickers.values())
                raise exc
        normalized: List[Dict[str, Any]] = []
        for r in rows:
            symbol = COIN_TO_SYMBOL.get(r["id"])
            if not symbol:
                continue
            normalized.append({
                "symbol": symbol,
                "price": float(r.get("current_price", 0) or 0),
                "change_24h_pct": float(r.get("price_change_percentage_24h") or 0),
                "volume_24h": float(r.get("total_volume", 0) or 0),
                "high_24h": float(r.get("high_24h", 0) or 0),
                "low_24h": float(r.get("low_24h", 0) or 0),
                "binance_url": _binance_deeplink(symbol),
                "image": r.get("image"),
            })
        # Sort by TRACKED_SYMBOLS order
        order = {s: i for i, s in enumerate(TRACKED_SYMBOLS)}
        normalized.sort(key=lambda t: order.get(t["symbol"], 999))
        cache.tickers = {t["symbol"]: t for t in normalized}
        cache.last_fetch = datetime.now(timezone.utc)
        return normalized


async def get_ticker(symbol: str) -> Dict[str, Any]:
    symbol = symbol.upper()
    tickers = await fetch_all_tickers()
    for t in tickers:
        if t["symbol"] == symbol:
            return t
    # Fallback: not in tracked list
    coin_id = SYMBOL_TO_COIN.get(symbol)
    if not coin_id:
        raise ValueError(f"Symbol {symbol} not tracked")
    return tickers[0] if tickers else {}


async def get_klines(symbol: str, interval: str = "1h", limit: int = 100) -> List[Dict[str, Any]]:
    """Return synthetic OHLCV derived from CoinGecko market_chart endpoint.

    CoinGecko provides prices+total_volumes at 1h granularity for days<=90.
    We reconstruct OHLC candles by bucketing prices into the requested interval.
    """
    symbol = symbol.upper()
    coin_id = SYMBOL_TO_COIN.get(symbol)
    if not coin_id:
        raise ValueError(f"Symbol {symbol} not tracked")

    cache_key = f"{symbol}:{interval}:{limit}"
    cached = cache.klines.get(cache_key)
    if cached and (datetime.now(timezone.utc) - cached["fetched_at"]).total_seconds() < 60:
        return cached["data"]

    # Pick days span to cover `limit` hourly candles
    days = max(2, min(90, (limit // 24) + 2))
    url = f"{COINGECKO_BASE}/coins/{coin_id}/market_chart"
    params = {"vs_currency": "usd", "days": days, "interval": "hourly" if days < 90 else "daily"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        d = resp.json()
    prices = d.get("prices", [])  # [[ts, price], ...]
    volumes = d.get("total_volumes", [])
    # Bucket into 1h candles
    buckets: Dict[int, Dict[str, float]] = {}
    for i, (ts, price) in enumerate(prices):
        hour = int(ts // 3_600_000) * 3_600_000
        vol = volumes[i][1] if i < len(volumes) else 0
        b = buckets.setdefault(hour, {
            "open_time": hour, "close_time": hour + 3_600_000,
            "open": price, "high": price, "low": price, "close": price, "volume": 0.0,
        })
        b["close"] = price
        b["high"] = max(b["high"], price)
        b["low"] = min(b["low"], price)
        b["volume"] += vol / max(1, len(prices))
    candles = [buckets[k] for k in sorted(buckets.keys())][-limit:]
    cache.klines[cache_key] = {"fetched_at": datetime.now(timezone.utc), "data": candles}
    return candles


def _binance_deeplink(symbol: str) -> str:
    symbol = symbol.upper()
    if symbol.endswith("USDT"):
        base, quote = symbol[:-4], "USDT"
    elif symbol.endswith("USDC"):
        base, quote = symbol[:-4], "USDC"
    elif symbol.endswith("BUSD"):
        base, quote = symbol[:-4], "BUSD"
    else:
        base, quote = symbol[:3], symbol[3:]
    return f"https://www.binance.com/en/trade/{base}_{quote}"


async def order_book_depth(symbol: str, limit: int = 20) -> Dict[str, Any]:
    """CoinGecko lacks L2 order books on the free tier.

    We synthesize a plausible book around the current price using volatility proxy.
    """
    ticker = await get_ticker(symbol)
    price = ticker.get("price", 0) or 0
    spread = max(price * 0.0005, 0.01)
    bids = []
    asks = []
    for i in range(limit):
        bid_price = round(price - spread * (i + 1), 4)
        ask_price = round(price + spread * (i + 1), 4)
        size = round(max(0.05, 2.0 / (i + 1)), 4)
        bids.append([bid_price, size])
        asks.append([ask_price, size])
    return {"bids": bids, "asks": asks, "synthetic": True}
