"""Technical indicator formulas: MFI, CCI, Order Flow, simplified SMC.

All functions accept OHLCV arrays and return scalar values (latest bar).
"""
from typing import List, Dict
import numpy as np


def money_flow_index(highs: List[float], lows: List[float], closes: List[float],
                     volumes: List[float], period: int = 14) -> float:
    """MFI = 100 - 100 / (1 + MFR). MFR = positive / negative money flow."""
    if len(closes) < period + 1:
        return 50.0
    typical = [(h + l + c) / 3 for h, l, c in zip(highs, lows, closes)]
    pos_mf, neg_mf = 0.0, 0.0
    for i in range(-period, 0):
        raw_mf = typical[i] * volumes[i]
        if typical[i] > typical[i - 1]:
            pos_mf += raw_mf
        elif typical[i] < typical[i - 1]:
            neg_mf += raw_mf
    if neg_mf == 0:
        return 100.0
    mfr = pos_mf / neg_mf
    return round(100 - 100 / (1 + mfr), 2)


def commodity_channel_index(highs: List[float], lows: List[float], closes: List[float],
                            period: int = 20) -> float:
    """CCI = (TP - SMA(TP)) / (0.015 * mean_dev)."""
    if len(closes) < period:
        return 0.0
    typical = np.array([(h + l + c) / 3 for h, l, c in zip(highs[-period:], lows[-period:], closes[-period:])])
    sma = typical.mean()
    mean_dev = np.mean(np.abs(typical - sma))
    if mean_dev == 0:
        return 0.0
    return round((typical[-1] - sma) / (0.015 * mean_dev), 2)


def order_flow(closes: List[float], volumes: List[float], period: int = 14) -> Dict[str, float]:
    """Simplified order flow: cumulative delta between buy-pressure and sell-pressure.

    Up-candle volume counted as buy pressure, down-candle volume as sell pressure.
    """
    if len(closes) < period + 1:
        return {"buy_pressure": 0.0, "sell_pressure": 0.0, "net_delta": 0.0, "direction": "neutral"}
    buy_vol = 0.0
    sell_vol = 0.0
    for i in range(-period, 0):
        if closes[i] > closes[i - 1]:
            buy_vol += volumes[i]
        elif closes[i] < closes[i - 1]:
            sell_vol += volumes[i]
    net = buy_vol - sell_vol
    total = buy_vol + sell_vol
    direction = "neutral"
    if total > 0:
        if net / total > 0.15:
            direction = "bullish"
        elif net / total < -0.15:
            direction = "bearish"
    return {
        "buy_pressure": round(buy_vol, 2),
        "sell_pressure": round(sell_vol, 2),
        "net_delta": round(net, 2),
        "direction": direction,
    }


def smart_money_concept(highs: List[float], lows: List[float], closes: List[float],
                        period: int = 20) -> Dict[str, object]:
    """Simplified SMC read: identifies last swing high/low, BOS (break of structure).

    Returns the last swing high, low, and whether a bullish/bearish BOS has just occurred.
    """
    if len(closes) < period:
        return {"swing_high": None, "swing_low": None, "bos": "none", "bias": "neutral"}
    highs_a = np.array(highs[-period:])
    lows_a = np.array(lows[-period:])
    swing_high = float(highs_a.max())
    swing_low = float(lows_a.min())
    last_close = closes[-1]
    bos = "none"
    bias = "neutral"
    if last_close > swing_high * 0.999:
        bos = "bullish"
        bias = "bullish"
    elif last_close < swing_low * 1.001:
        bos = "bearish"
        bias = "bearish"
    else:
        mid = (swing_high + swing_low) / 2
        bias = "bullish" if last_close > mid else "bearish"
    return {
        "swing_high": round(swing_high, 2),
        "swing_low": round(swing_low, 2),
        "bos": bos,
        "bias": bias,
    }


def atr(highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> float:
    """Average True Range — used for volatility check in risk engine."""
    if len(closes) < period + 1:
        return 0.0
    trs = []
    for i in range(1, len(closes)):
        tr = max(highs[i] - lows[i], abs(highs[i] - closes[i - 1]), abs(lows[i] - closes[i - 1]))
        trs.append(tr)
    return round(float(np.mean(trs[-period:])), 4)


def sharpe_ratio(returns: List[float], risk_free: float = 0.0) -> float:
    if not returns or len(returns) < 2:
        return 0.0
    arr = np.array(returns)
    std = arr.std()
    if std == 0:
        return 0.0
    return round(float((arr.mean() - risk_free) / std * np.sqrt(365)), 3)


def max_drawdown(pnl_series: List[float]) -> float:
    """Return max drawdown as % of peak."""
    if not pnl_series:
        return 0.0
    cumulative = np.cumsum(pnl_series)
    peaks = np.maximum.accumulate(cumulative)
    dd = (cumulative - peaks)
    # % against peak (avoid divide-by-0)
    peaks_safe = np.where(np.abs(peaks) < 1e-9, 1.0, peaks)
    dd_pct = dd / np.abs(peaks_safe) * 100
    return round(float(abs(dd_pct.min())), 2) if len(dd_pct) else 0.0
