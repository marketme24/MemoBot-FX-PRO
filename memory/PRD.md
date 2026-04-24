# MEMOBOT FX-PRO — Product Requirements Document

## Problem Statement
Build a complete, production-ready automated trading platform modeled on MEMOBOT FX-PRO with multi-panel dashboard, execution engine, risk engine, strategy engine, analytics, reporting, payments, and app-lock security.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor) + emergentintegrations (Stripe, Claude Sonnet 4.5)
- **Frontend**: React + Tailwind + shadcn + framer-motion + react-fast-marquee + recharts
- **Mode**: Paper-trading (real market data from CoinGecko with synthetic fallback, simulated fills). Real Binance execution ready — just add API keys.
- **Auth**: JWT Bearer (localStorage) — httpOnly cookies also set but Bearer is used because preview subdomain redirect breaks cookies.

## User Personas
1. **Retail Trader** — sets up a strategy, lets the bot auto-trade in paper mode, monitors PnL.
2. **Strategy Admin** — configures risk profiles, reviews reports, manages subscriptions.
3. **Support Admin** — edits About-Bot config, manages users (role=admin).

## Core Requirements (Static)
- JWT Auth: register / login / logout / me / refresh / forgot / reset
- Bot Control: start / stop / restart / voice toggle / notifications toggle
- Strategy: CRUD + signal generation (Grid, Trend, Mean-Reversion, Breakout, Scalping)
- Risk Engine: position size, concurrent trades, daily loss, volatility circuit, order rate
- Execution Engine: paper-mode fills with real slippage, position tracking, realized PnL
- Market Data: 12 tracked symbols, 24h ticker, OHLCV klines, synthetic order book
- Indicators: MFI, CCI, SMC, Order Flow, ATR
- AI Sentiment: Claude Sonnet 4.5 via Emergent Universal Key
- Analytics: total PnL, win rate, profit factor, Sharpe, max drawdown, cumulative PnL
- Reports: daily / weekly / monthly + CSV export
- Payments: Stripe (live), PayPal/Telr/PayFort/Checkout.com/PayTabs (stub adapters)
- App Lock: PIN (bcrypt) + WebAuthn biometric enrollment
- Notifications: created on trade fills, bot state changes

## What's Implemented (as of 2026-02)
- ✅ Full backend (`server.py` + `auth.py` + `engines.py` + `indicators.py` + `market_data.py` + `ai_sentiment.py` + `models.py`)
- ✅ 13 unique pages (Login, Register, AppLock, Dashboard, Trading, Strategies, Risk, Analytics, Reports, Market, BotControl, Subscription, Settings, PaymentSuccess)
- ✅ Crypto ticker bar (react-fast-marquee, real prices, Binance deep-links)
- ✅ Trading panel with stepper animation (validation → risk → routing → fill → record)
- ✅ Stripe subscription checkout with webhook + polling
- ✅ Recharts (cumulative PnL area chart, profit-by-strategy bars)
- ✅ App lock (PIN + WebAuthn biometric enrollment)
- ✅ Admin seeding + brute-force lockout
- ✅ Tested end-to-end (36/36 backend tests, 100% frontend flows)

## Bugs Fixed (iter 1 → iter 2)
- ✅ HIGH: Partial PUT to risk/protection → KeyError → 500. Fix: defensive default merge in RiskEngine.
- ✅ MEDIUM: CoinGecko 429 propagating as 500. Fix: graceful degrade with cached + synthetic fallback.

## Backlog (P1)
- Real Binance execution (needs user API keys)
- UAE payment gateways (needs merchant keys): Telr, PayFort, Checkout.com, PayTabs
- PayPal live integration (needs client id / secret)
- WebSocket real-time price updates (currently 20s REST polling)
- Arabic i18n (currently prepared; not enabled)
- Email delivery of reports (currently CSV download only)
- Multi-strategy backtester
- Push notifications / mobile PWA
