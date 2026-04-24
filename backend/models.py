"""Pydantic models + MongoDB document shapes for the MEMOBOT FX-PRO trading platform."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timezone
import uuid


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gen_id() -> str:
    return str(uuid.uuid4())


# ─────────────────────────── Auth ───────────────────────────
class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    role: Literal["admin", "user"] = "user"
    created_at: str
    subscription_plan: str = "free"
    app_lock_enabled: bool = False


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=128)


# ─────────────────────────── Bot ───────────────────────────
class BotState(BaseModel):
    id: str = Field(default_factory=gen_id)
    user_id: str
    status: Literal["RUNNING", "STOPPED", "ERROR"] = "STOPPED"
    last_restart: Optional[str] = None
    last_error: Optional[str] = None
    voice_enabled: bool = False
    notifications_enabled: bool = True
    updated_at: str = Field(default_factory=utcnow_iso)


class BotControlAction(BaseModel):
    action: Literal["start", "stop", "restart"]


# ─────────────────────────── Strategy ───────────────────────────
STRATEGY_TYPES = ["grid", "trend", "mean_reversion", "breakout", "scalping"]


class StrategyConfig(BaseModel):
    id: str = Field(default_factory=gen_id)
    user_id: str
    name: str
    trading_pair: str = "BTCUSDT"
    strategy_type: Literal["grid", "trend", "mean_reversion", "breakout", "scalping"] = "trend"
    ai_sentiment_enabled: bool = False
    lower_price_limit: Optional[float] = None
    upper_price_limit: Optional[float] = None
    investment_amount: float = 1000.0
    active: bool = True
    created_at: str = Field(default_factory=utcnow_iso)
    updated_at: str = Field(default_factory=utcnow_iso)


class StrategyCreate(BaseModel):
    name: str
    trading_pair: str = "BTCUSDT"
    strategy_type: Literal["grid", "trend", "mean_reversion", "breakout", "scalping"] = "trend"
    ai_sentiment_enabled: bool = False
    lower_price_limit: Optional[float] = None
    upper_price_limit: Optional[float] = None
    investment_amount: float = 1000.0


# ─────────────────────────── Risk & Protection ───────────────────────────
class RiskProfile(BaseModel):
    id: str = Field(default_factory=gen_id)
    user_id: str
    level: Literal["low", "mid", "high"] = "mid"
    max_drawdown_pct: float = 10.0  # %
    max_leverage: float = 3.0
    max_position_size_usd: float = 5000.0
    max_daily_loss_usd: float = 500.0
    max_concurrent_trades: int = 5
    updated_at: str = Field(default_factory=utcnow_iso)


class ProtectionSettings(BaseModel):
    id: str = Field(default_factory=gen_id)
    user_id: str
    full_risk_protection: bool = True
    daily_drawdown_limit_pct: float = 5.0
    slippage_limit_pct: float = 0.5
    data_stability_required: bool = True
    max_orders_per_minute: int = 10
    circuit_breaker_pct: float = 8.0
    updated_at: str = Field(default_factory=utcnow_iso)


# ─────────────────────────── Orders / Trades / Positions ───────────────────────────
class OrderRequest(BaseModel):
    trading_pair: str = "BTCUSDT"
    side: Literal["buy", "sell"]
    order_type: Literal["market", "limit", "stop"] = "market"
    quantity: float
    price: Optional[float] = None  # for limit/stop
    strategy_id: Optional[str] = None


class Order(BaseModel):
    id: str = Field(default_factory=gen_id)
    user_id: str
    strategy_id: Optional[str] = None
    trading_pair: str
    side: Literal["buy", "sell"]
    order_type: str
    status: Literal["pending", "filled", "partial", "rejected", "cancelled"] = "pending"
    quantity: float
    price: Optional[float] = None
    fill_price: Optional[float] = None
    fill_quantity: float = 0.0
    slippage_pct: float = 0.0
    rejected_reason: Optional[str] = None
    created_at: str = Field(default_factory=utcnow_iso)
    updated_at: str = Field(default_factory=utcnow_iso)


class Trade(BaseModel):
    id: str = Field(default_factory=gen_id)
    user_id: str
    order_id: str
    strategy_id: Optional[str] = None
    trading_pair: str
    side: str
    quantity: float
    price: float
    notional_usd: float
    realized_pnl: float = 0.0
    fees: float = 0.0
    created_at: str = Field(default_factory=utcnow_iso)


class Position(BaseModel):
    id: str = Field(default_factory=gen_id)
    user_id: str
    trading_pair: str
    side: Literal["long", "short", "flat"] = "flat"
    quantity: float = 0.0
    avg_entry_price: float = 0.0
    unrealized_pnl: float = 0.0
    updated_at: str = Field(default_factory=utcnow_iso)


# ─────────────────────────── Payments ───────────────────────────
class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=gen_id)
    user_id: Optional[str] = None
    session_id: str
    provider: Literal["stripe", "paypal", "telr", "payfort", "checkout", "paytabs"] = "stripe"
    amount: float
    currency: str = "USD"
    status: Literal["pending", "paid", "failed", "expired", "refunded"] = "pending"
    plan_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=utcnow_iso)
    updated_at: str = Field(default_factory=utcnow_iso)


class CheckoutRequest(BaseModel):
    plan_id: Literal["starter", "pro", "elite"]
    provider: Literal["stripe", "paypal", "telr", "payfort", "checkout", "paytabs"] = "stripe"
    origin_url: str


# ─────────────────────────── App Lock ───────────────────────────
class AppLockState(BaseModel):
    id: str = Field(default_factory=gen_id)
    user_id: str
    pin_hash: Optional[str] = None
    biometric_enrolled: bool = False
    biometric_credential_id: Optional[str] = None
    auto_lock_minutes: int = 5
    lock_on_restart: bool = True
    lock_on_inactivity: bool = True
    created_at: str = Field(default_factory=utcnow_iso)


class SetPinRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=8)


class VerifyPinRequest(BaseModel):
    pin: str


class EnrollBiometricRequest(BaseModel):
    credential_id: str


# ─────────────────────────── Notifications ───────────────────────────
class Notification(BaseModel):
    id: str = Field(default_factory=gen_id)
    user_id: str
    title: str
    message: str
    severity: Literal["info", "warning", "error", "success"] = "info"
    read: bool = False
    created_at: str = Field(default_factory=utcnow_iso)


# ─────────────────────────── Market Data ───────────────────────────
class Ticker(BaseModel):
    symbol: str
    price: float
    change_24h_pct: float
    volume_24h: float
    high_24h: float
    low_24h: float


# ─────────────────────────── Analytics ───────────────────────────
class MetricsSnapshot(BaseModel):
    id: str = Field(default_factory=gen_id)
    user_id: str
    period: Literal["daily", "weekly", "monthly", "all"]
    total_pnl: float
    total_volume: float
    avg_daily_pnl: float
    profit_factor: float
    win_rate: float
    sharpe: float
    max_drawdown_pct: float
    trade_count: int
    created_at: str = Field(default_factory=utcnow_iso)
