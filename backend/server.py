"""MEMOBOT FX-PRO — Trading platform FastAPI server.

Paper-trading mode by default. All endpoints under /api prefix.
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from models import (
    RegisterRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest,
    BotControlAction, StrategyCreate, OrderRequest, RiskProfile, ProtectionSettings,
    SetPinRequest, VerifyPinRequest, EnrollBiometricRequest,
    CheckoutRequest, gen_id, utcnow_iso,
)
from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    decode_token, make_current_user_dep, set_auth_cookies, clear_auth_cookies,
)
from market_data import (
    fetch_all_tickers, get_ticker, get_klines, TRACKED_SYMBOLS, order_book_depth,
    _binance_deeplink,
)
from indicators import (
    money_flow_index, commodity_channel_index, order_flow, smart_money_concept,
)
from engines import RiskEngine, ExecutionEngine, StrategyEngine, AnalyticsEngine, ReportingEngine, RiskViolation
from ai_sentiment import analyze_sentiment
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest,
)

# ───────── MongoDB ─────────
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ───────── Engines ─────────
risk_engine = RiskEngine(db)
exec_engine = ExecutionEngine(db)
strat_engine = StrategyEngine(db)
analytics_engine = AnalyticsEngine(db)
reporting_engine = ReportingEngine(db, analytics_engine)
current_user = make_current_user_dep(db)

# ───────── App ─────────
app = FastAPI(title="MEMOBOT FX-PRO")
api = APIRouter(prefix="/api")


# Configure CORS. Because we use credentials, we can't use "*".
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════ Startup ═══════════════════════════
@app.on_event("startup")
async def _startup() -> None:
    # Unique indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.orders.create_index("user_id")
    await db.trades.create_index("user_id")
    await db.strategies.create_index("user_id")
    await db.positions.create_index([("user_id", 1), ("trading_pair", 1)])
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)

    # Admin seed
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": gen_id(),
            "email": admin_email,
            "name": "Admin",
            "role": "admin",
            "password_hash": hash_password(admin_password),
            "subscription_plan": "elite",
            "app_lock_enabled": False,
            "created_at": utcnow_iso(),
        })

    # About Bot config
    about = await db.config.find_one({"key": "about_bot"})
    if not about:
        await db.config.insert_one({
            "key": "about_bot",
            "bot_name": "MEMOBOT FX-PRO",
            "version": "1.0.0",
            "developer": "MEMOBOT Labs",
            "support_email": "support@memobot.com",
            "description": "Institutional-grade automated trading with AI sentiment.",
        })


@app.on_event("shutdown")
async def _shutdown() -> None:
    client.close()


# ═══════════════════════════ Auth ═══════════════════════════
@api.post("/auth/register")
async def register(body: RegisterRequest, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = gen_id()
    doc = {
        "id": user_id,
        "email": email,
        "name": body.name,
        "role": "user",
        "password_hash": hash_password(body.password),
        "subscription_plan": "free",
        "app_lock_enabled": False,
        "created_at": utcnow_iso(),
    }
    await db.users.insert_one(doc.copy())
    # Bootstrap default risk & protection for the user
    await db.risk_profiles.insert_one({
        "id": gen_id(), "user_id": user_id, "level": "mid",
        "max_drawdown_pct": 10.0, "max_leverage": 3.0, "max_position_size_usd": 5000.0,
        "max_daily_loss_usd": 500.0, "max_concurrent_trades": 5, "updated_at": utcnow_iso(),
    })
    await db.protection_settings.insert_one({
        "id": gen_id(), "user_id": user_id, "full_risk_protection": True,
        "daily_drawdown_limit_pct": 5.0, "slippage_limit_pct": 0.5, "data_stability_required": True,
        "max_orders_per_minute": 10, "circuit_breaker_pct": 8.0, "updated_at": utcnow_iso(),
    })
    await db.bots.insert_one({
        "id": gen_id(), "user_id": user_id, "status": "STOPPED",
        "last_restart": None, "last_error": None, "voice_enabled": False,
        "notifications_enabled": True, "updated_at": utcnow_iso(),
    })

    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    doc.pop("password_hash", None)
    doc.pop("_id", None)
    doc["access_token"] = access
    doc["refresh_token"] = refresh
    return doc


@api.post("/auth/login")
async def login(body: LoginRequest, request: Request, response: Response):
    email = body.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    # Brute force lockout
    now = datetime.now(timezone.utc)
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("locked_until") and datetime.fromisoformat(attempt["locked_until"]) > now:
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        count = (attempt or {}).get("count", 0) + 1
        locked_until = None
        if count >= 5:
            locked_until = (now + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$set": {"count": count, "locked_until": locked_until, "updated_at": now.isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": identifier})

    access = create_access_token(user["id"], email)
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    user.pop("password_hash", None)
    user.pop("_id", None)
    user["access_token"] = access
    user["refresh_token"] = refresh
    return user


@api.post("/auth/logout")
async def logout(response: Response, user=Depends(current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user["id"], user["email"])
        response.set_cookie(
            key="access_token", value=access, httponly=True, secure=True,
            samesite="none", max_age=60 * 60 * 12, path="/",
        )
        return {"ok": True}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    user = await db.users.find_one({"email": body.email.lower()})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": user["id"],
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "used": False,
        })
        logging.info("Password reset link: /reset-password?token=%s", token)
    return {"ok": True}


@api.post("/auth/reset-password")
async def reset_password(body: ResetPasswordRequest):
    rec = await db.password_reset_tokens.find_one({"token": body.token, "used": False})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or used token")
    if rec["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")
    await db.users.update_one(
        {"id": rec["user_id"]},
        {"$set": {"password_hash": hash_password(body.new_password)}},
    )
    await db.password_reset_tokens.update_one({"token": body.token}, {"$set": {"used": True}})
    return {"ok": True}


# ═══════════════════════════ Bot Control ═══════════════════════════
@api.get("/bot/status")
async def bot_status(user=Depends(current_user)):
    bot = await db.bots.find_one({"user_id": user["id"]}, {"_id": 0})
    if not bot:
        bot = {
            "id": gen_id(), "user_id": user["id"], "status": "STOPPED",
            "last_restart": None, "last_error": None, "voice_enabled": False,
            "notifications_enabled": True, "updated_at": utcnow_iso(),
        }
        await db.bots.insert_one(bot.copy())
    bot.pop("_id", None)
    return bot


@api.post("/bot/control")
async def bot_control(body: BotControlAction, user=Depends(current_user)):
    bot = await db.bots.find_one({"user_id": user["id"]}, {"_id": 0})
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not initialized")
    status_map = {"start": "RUNNING", "stop": "STOPPED", "restart": "RUNNING"}
    new_status = status_map[body.action]
    update = {"status": new_status, "updated_at": utcnow_iso(), "last_error": None}
    if body.action == "restart":
        update["last_restart"] = utcnow_iso()
    await db.bots.update_one({"user_id": user["id"]}, {"$set": update})
    await db.notifications.insert_one({
        "id": gen_id(), "user_id": user["id"],
        "title": f"Bot {body.action.capitalize()}",
        "message": f"Engine is now {new_status}", "severity": "info",
        "read": False, "created_at": utcnow_iso(),
    })
    bot.update(update)
    bot.pop("_id", None)
    return bot


@api.post("/bot/voice")
async def bot_voice_toggle(user=Depends(current_user)):
    bot = await db.bots.find_one({"user_id": user["id"]}, {"_id": 0})
    new_val = not bot.get("voice_enabled", False) if bot else True
    await db.bots.update_one({"user_id": user["id"]}, {"$set": {"voice_enabled": new_val, "updated_at": utcnow_iso()}})
    return {"voice_enabled": new_val}


@api.post("/bot/notifications")
async def bot_notifications_toggle(user=Depends(current_user)):
    bot = await db.bots.find_one({"user_id": user["id"]}, {"_id": 0})
    new_val = not bot.get("notifications_enabled", True) if bot else False
    await db.bots.update_one({"user_id": user["id"]}, {"$set": {"notifications_enabled": new_val, "updated_at": utcnow_iso()}})
    return {"notifications_enabled": new_val}


# ═══════════════════════════ Strategies ═══════════════════════════
@api.get("/strategies")
async def list_strategies(user=Depends(current_user)):
    rows = await db.strategies.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    return rows


@api.post("/strategies")
async def create_strategy(body: StrategyCreate, user=Depends(current_user)):
    doc = {
        "id": gen_id(),
        "user_id": user["id"],
        "name": body.name,
        "trading_pair": body.trading_pair.upper(),
        "strategy_type": body.strategy_type,
        "ai_sentiment_enabled": body.ai_sentiment_enabled,
        "lower_price_limit": body.lower_price_limit,
        "upper_price_limit": body.upper_price_limit,
        "investment_amount": body.investment_amount,
        "active": True,
        "created_at": utcnow_iso(),
        "updated_at": utcnow_iso(),
    }
    await db.strategies.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api.patch("/strategies/{strategy_id}")
async def update_strategy(strategy_id: str, body: dict, user=Depends(current_user)):
    allowed = {"name", "trading_pair", "strategy_type", "ai_sentiment_enabled",
               "lower_price_limit", "upper_price_limit", "investment_amount", "active"}
    update = {k: v for k, v in body.items() if k in allowed}
    update["updated_at"] = utcnow_iso()
    result = await db.strategies.update_one(
        {"id": strategy_id, "user_id": user["id"]}, {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Strategy not found")
    doc = await db.strategies.find_one({"id": strategy_id}, {"_id": 0})
    return doc


@api.delete("/strategies/{strategy_id}")
async def delete_strategy(strategy_id: str, user=Depends(current_user)):
    res = await db.strategies.delete_one({"id": strategy_id, "user_id": user["id"]})
    return {"deleted": res.deleted_count}


@api.post("/strategies/{strategy_id}/signal")
async def strategy_signal(strategy_id: str, user=Depends(current_user)):
    strategy = await db.strategies.find_one({"id": strategy_id, "user_id": user["id"]}, {"_id": 0})
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return await strat_engine.generate_signal(strategy)


# ═══════════════════════════ Trading ═══════════════════════════
@api.post("/trade/preview")
async def trade_preview(body: OrderRequest, user=Depends(current_user)):
    """Runs risk checks without executing — returns validation results."""
    bot = await db.bots.find_one({"user_id": user["id"]}, {"_id": 0})
    if not bot or bot.get("status") != "RUNNING":
        return {"ok": False, "reason": "Bot is not running. Start the engine first.", "checks": []}
    try:
        result = await risk_engine.evaluate(user["id"], body.model_dump())
        return {"ok": True, **result}
    except RiskViolation as v:
        return {"ok": False, "reason": "Risk violation", **v.args[0]}


@api.post("/trade/execute")
async def trade_execute(body: OrderRequest, user=Depends(current_user)):
    """Full workflow: validation → risk → execution → record → notify."""
    bot = await db.bots.find_one({"user_id": user["id"]}, {"_id": 0})
    if not bot or bot.get("status") != "RUNNING":
        raise HTTPException(status_code=400, detail="Bot is not running. Start the engine first.")
    try:
        risk_result = await risk_engine.evaluate(user["id"], body.model_dump())
    except RiskViolation as v:
        raise HTTPException(status_code=400, detail={"reason": "Risk violation", **v.args[0]})

    exec_result = await exec_engine.execute(user["id"], body.model_dump(), risk_result)
    return {
        "ok": True,
        "risk_checks": risk_result["checks"],
        "order": exec_result["order"],
        "trade": exec_result["trade"],
    }


@api.get("/trade/orders")
async def list_orders(user=Depends(current_user), limit: int = 100):
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return orders


@api.get("/trade/trades")
async def list_trades(user=Depends(current_user), limit: int = 100):
    trades = await db.trades.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return trades


@api.get("/trade/positions")
async def list_positions(user=Depends(current_user)):
    positions = await db.positions.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return positions


# ═══════════════════════════ Risk & Protection ═══════════════════════════
@api.get("/risk/profile")
async def get_risk(user=Depends(current_user)):
    rec = await db.risk_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return rec or {}


@api.put("/risk/profile")
async def update_risk(body: dict, user=Depends(current_user)):
    allowed = {"level", "max_drawdown_pct", "max_leverage", "max_position_size_usd",
               "max_daily_loss_usd", "max_concurrent_trades"}
    update = {k: v for k, v in body.items() if k in allowed}
    update["updated_at"] = utcnow_iso()
    await db.risk_profiles.update_one({"user_id": user["id"]}, {"$set": update}, upsert=True)
    return await db.risk_profiles.find_one({"user_id": user["id"]}, {"_id": 0})


@api.get("/risk/protection")
async def get_protection(user=Depends(current_user)):
    rec = await db.protection_settings.find_one({"user_id": user["id"]}, {"_id": 0})
    return rec or {}


@api.put("/risk/protection")
async def update_protection(body: dict, user=Depends(current_user)):
    allowed = {"full_risk_protection", "daily_drawdown_limit_pct", "slippage_limit_pct",
               "data_stability_required", "max_orders_per_minute", "circuit_breaker_pct"}
    update = {k: v for k, v in body.items() if k in allowed}
    update["updated_at"] = utcnow_iso()
    await db.protection_settings.update_one({"user_id": user["id"]}, {"$set": update}, upsert=True)
    return await db.protection_settings.find_one({"user_id": user["id"]}, {"_id": 0})


# ═══════════════════════════ Market Data ═══════════════════════════
@api.get("/market/tickers")
async def market_tickers():
    return await fetch_all_tickers()


@api.get("/market/ticker/{symbol}")
async def market_ticker(symbol: str):
    return await get_ticker(symbol)


@api.get("/market/klines/{symbol}")
async def market_klines(symbol: str, interval: str = "1h", limit: int = 100):
    return await get_klines(symbol, interval, limit)


@api.get("/market/depth/{symbol}")
async def market_depth(symbol: str, limit: int = 20):
    return await order_book_depth(symbol, limit)


@api.get("/market/indicators/{symbol}")
async def market_indicators(symbol: str):
    klines = await get_klines(symbol, "1h", 100)
    closes = [k["close"] for k in klines]
    highs = [k["high"] for k in klines]
    lows = [k["low"] for k in klines]
    volumes = [k["volume"] for k in klines]
    return {
        "symbol": symbol.upper(),
        "mfi": money_flow_index(highs, lows, closes, volumes),
        "cci": commodity_channel_index(highs, lows, closes),
        "smc": smart_money_concept(highs, lows, closes),
        "order_flow": order_flow(closes, volumes),
        "binance_url": _binance_deeplink(symbol),
    }


@api.get("/market/opportunities")
async def market_opportunities():
    """Rank tracked symbols by confluence: volatility + momentum + volume."""
    tickers = await fetch_all_tickers()
    ranked = sorted(tickers, key=lambda t: abs(t["change_24h_pct"]) * (t["volume_24h"] ** 0.25), reverse=True)
    top = ranked[:6]
    return [{
        "symbol": t["symbol"],
        "price": t["price"],
        "change_24h_pct": t["change_24h_pct"],
        "volume_24h": t["volume_24h"],
        "binance_url": t["binance_url"],
        "score": round(abs(t["change_24h_pct"]) * 10 + (t["volume_24h"] / 1e9), 2),
    } for t in top]


# ═══════════════════════════ AI Sentiment ═══════════════════════════
@api.get("/ai/sentiment/{symbol}")
async def ai_sentiment(symbol: str, user=Depends(current_user)):
    ticker = await get_ticker(symbol)
    klines = await get_klines(symbol, "1h", 100)
    closes = [k["close"] for k in klines]
    highs = [k["high"] for k in klines]
    lows = [k["low"] for k in klines]
    volumes = [k["volume"] for k in klines]
    indicators = {
        "mfi": money_flow_index(highs, lows, closes, volumes),
        "cci": commodity_channel_index(highs, lows, closes),
        "smc": smart_money_concept(highs, lows, closes),
        "order_flow": order_flow(closes, volumes),
    }
    result = await analyze_sentiment(symbol, ticker["price"], ticker["change_24h_pct"], indicators)
    return {"symbol": symbol.upper(), **result, "indicators": indicators, "price": ticker["price"]}


# ═══════════════════════════ Analytics & Reports ═══════════════════════════
@api.get("/analytics")
async def analytics(period: str = "all", user=Depends(current_user)):
    if period not in ["daily", "weekly", "monthly", "all"]:
        raise HTTPException(status_code=400, detail="Invalid period")
    return await analytics_engine.compute(user["id"], period)


@api.get("/reports/{period}")
async def report(period: str, user=Depends(current_user)):
    if period not in ["daily", "weekly", "monthly"]:
        raise HTTPException(status_code=400, detail="Invalid period")
    return await reporting_engine.generate(user["id"], period)


@api.get("/reports/{period}/csv")
async def report_csv(period: str, user=Depends(current_user)):
    if period not in ["daily", "weekly", "monthly"]:
        raise HTTPException(status_code=400, detail="Invalid period")
    data = await reporting_engine.generate(user["id"], period)
    rows = ["id,created_at,pair,side,quantity,price,notional_usd,realized_pnl,fees"]
    for t in data["trades"]:
        rows.append(f"{t['id']},{t['created_at']},{t['trading_pair']},{t['side']},"
                    f"{t['quantity']},{t['price']},{t['notional_usd']},{t['realized_pnl']},{t['fees']}")
    csv = "\n".join(rows)
    return Response(content=csv, media_type="text/csv", headers={
        "Content-Disposition": f'attachment; filename="{period}_report.csv"'
    })


# ═══════════════════════════ Notifications ═══════════════════════════
@api.get("/notifications")
async def list_notifications(user=Depends(current_user), limit: int = 50):
    rows = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return rows


@api.post("/notifications/mark-read")
async def mark_read(user=Depends(current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ═══════════════════════════ App Lock ═══════════════════════════
@api.get("/lock/state")
async def lock_state(user=Depends(current_user)):
    rec = await db.app_locks.find_one({"user_id": user["id"]}, {"_id": 0, "pin_hash": 0})
    if not rec:
        return {"user_id": user["id"], "pin_configured": False,
                "biometric_enrolled": False, "auto_lock_minutes": 5}
    rec["pin_configured"] = True
    return rec


@api.post("/lock/set-pin")
async def set_pin(body: SetPinRequest, user=Depends(current_user)):
    if not body.pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be digits only")
    pin_hash = hash_password(body.pin)
    await db.app_locks.update_one(
        {"user_id": user["id"]},
        {"$set": {"id": gen_id(), "user_id": user["id"], "pin_hash": pin_hash,
                  "auto_lock_minutes": 5, "lock_on_restart": True, "lock_on_inactivity": True,
                  "created_at": utcnow_iso()}},
        upsert=True,
    )
    await db.users.update_one({"id": user["id"]}, {"$set": {"app_lock_enabled": True}})
    return {"ok": True}


@api.post("/lock/verify")
async def verify_pin(body: VerifyPinRequest, user=Depends(current_user)):
    rec = await db.app_locks.find_one({"user_id": user["id"]})
    if not rec or not rec.get("pin_hash"):
        raise HTTPException(status_code=400, detail="PIN not configured")
    if not verify_password(body.pin, rec["pin_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect PIN")
    return {"ok": True}


@api.post("/lock/enroll-biometric")
async def enroll_biometric(body: EnrollBiometricRequest, user=Depends(current_user)):
    await db.app_locks.update_one(
        {"user_id": user["id"]},
        {"$set": {"biometric_enrolled": True, "biometric_credential_id": body.credential_id}},
        upsert=True,
    )
    return {"ok": True}


@api.post("/lock/disable")
async def disable_lock(user=Depends(current_user)):
    await db.app_locks.delete_one({"user_id": user["id"]})
    await db.users.update_one({"id": user["id"]}, {"$set": {"app_lock_enabled": False}})
    return {"ok": True}


# ═══════════════════════════ Payments ═══════════════════════════
PLANS = {
    "starter": {"name": "Starter", "price": 29.00, "features": ["1 Bot", "Paper Trading", "Email Support"]},
    "pro": {"name": "Pro", "price": 99.00, "features": ["5 Bots", "Real Trading", "AI Sentiment", "Priority Support"]},
    "elite": {"name": "Elite", "price": 299.00, "features": ["Unlimited Bots", "All Strategies", "API Access", "Dedicated Manager"]},
}


@api.get("/payments/plans")
async def list_plans():
    return PLANS


@api.post("/payments/checkout")
async def create_checkout(body: CheckoutRequest, request: Request, user=Depends(current_user)):
    if body.plan_id not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    amount = PLANS[body.plan_id]["price"]

    success_url = f"{body.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{body.origin_url}/subscription"

    if body.provider == "stripe":
        api_key = os.environ["STRIPE_API_KEY"]
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        checkout_req = CheckoutSessionRequest(
            amount=amount,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"plan_id": body.plan_id, "user_id": user["id"]},
        )
        session = await stripe.create_checkout_session(checkout_req)
        await db.payment_transactions.insert_one({
            "id": gen_id(),
            "user_id": user["id"],
            "session_id": session.session_id,
            "provider": "stripe",
            "amount": amount,
            "currency": "USD",
            "status": "pending",
            "plan_id": body.plan_id,
            "metadata": {"plan_id": body.plan_id, "user_id": user["id"]},
            "created_at": utcnow_iso(),
            "updated_at": utcnow_iso(),
        })
        return {"session_id": session.session_id, "url": session.url, "provider": "stripe"}

    # Stub adapters for other providers — ready for activation when keys are added.
    stub_session = f"{body.provider}_stub_{gen_id()}"
    await db.payment_transactions.insert_one({
        "id": gen_id(), "user_id": user["id"], "session_id": stub_session,
        "provider": body.provider, "amount": amount, "currency": "USD",
        "status": "pending", "plan_id": body.plan_id,
        "metadata": {"note": f"{body.provider} adapter stubbed — pending merchant keys"},
        "created_at": utcnow_iso(), "updated_at": utcnow_iso(),
    })
    return {
        "session_id": stub_session,
        "url": None,
        "provider": body.provider,
        "message": f"{body.provider.capitalize()} adapter stubbed. Provide merchant keys to activate.",
    }


@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request, user=Depends(current_user)):
    rec = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=404, detail="Session not found")
    if rec["status"] in ("paid", "failed", "expired"):
        return rec

    if rec["provider"] == "stripe":
        api_key = os.environ["STRIPE_API_KEY"]
        host_url = str(request.base_url).rstrip("/")
        stripe = StripeCheckout(api_key=api_key, webhook_url=f"{host_url}/api/webhook/stripe")
        try:
            status = await stripe.get_checkout_status(session_id)
            new_status = "paid" if status.payment_status == "paid" else (
                "expired" if status.status == "expired" else "pending"
            )
            if new_status != rec["status"]:
                update = {"status": new_status, "updated_at": utcnow_iso()}
                await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})
                if new_status == "paid":
                    await db.users.update_one(
                        {"id": rec["user_id"]},
                        {"$set": {"subscription_plan": rec["plan_id"]}}
                    )
                rec.update(update)
        except Exception as e:
            logging.exception("Stripe status check failed: %s", e)
    return rec


@api.post("/webhook/stripe")
async def webhook_stripe(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    api_key = os.environ["STRIPE_API_KEY"]
    host_url = str(request.base_url).rstrip("/")
    stripe = StripeCheckout(api_key=api_key, webhook_url=f"{host_url}/api/webhook/stripe")
    try:
        event = await stripe.handle_webhook(body, signature)
        if event.session_id:
            if event.payment_status == "paid":
                rec = await db.payment_transactions.find_one({"session_id": event.session_id})
                if rec and rec["status"] != "paid":
                    await db.payment_transactions.update_one(
                        {"session_id": event.session_id},
                        {"$set": {"status": "paid", "updated_at": utcnow_iso()}}
                    )
                    await db.users.update_one(
                        {"id": rec["user_id"]},
                        {"$set": {"subscription_plan": rec.get("plan_id", "pro")}}
                    )
        return {"ok": True}
    except Exception as e:
        logging.exception("Webhook error: %s", e)
        return JSONResponse(status_code=400, content={"ok": False, "error": str(e)})


# ═══════════════════════════ Config / About Bot ═══════════════════════════
@api.get("/config/about")
async def get_about():
    rec = await db.config.find_one({"key": "about_bot"}, {"_id": 0})
    return rec or {}


@api.put("/config/about")
async def update_about(body: dict, user=Depends(current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    allowed = {"bot_name", "version", "developer", "support_email", "description"}
    update = {k: v for k, v in body.items() if k in allowed}
    await db.config.update_one({"key": "about_bot"}, {"$set": update}, upsert=True)
    return await db.config.find_one({"key": "about_bot"}, {"_id": 0})


# ═══════════════════════════ Health ═══════════════════════════
@api.get("/")
async def root():
    return {"app": "MEMOBOT FX-PRO", "status": "ok", "mode": "paper-trading"}


app.include_router(api)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
