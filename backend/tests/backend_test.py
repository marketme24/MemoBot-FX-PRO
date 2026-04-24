"""
MEMOBOT FX-PRO — Backend E2E tests
Covers: Auth, Bot, Strategies, Trading, Risk, Market, AI, Analytics, Reports,
Payments, App Lock, Notifications.

Uses JWT Bearer token from login response (primary auth).
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # read from /app/frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = BASE_URL + "/api"
ADMIN_EMAIL = "admin@memobot.com"
ADMIN_PASSWORD = "Admin12345"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(client):
    r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"No access_token in login response: {data}"
    return token


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- Auth ----------
class TestAuth:
    def test_login_admin(self, client):
        r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data or "token" in data
        # Login returns a flattened user object containing email and/or a nested user
        assert data.get("email") == ADMIN_EMAIL or "user" in data

    def test_login_invalid(self, client):
        r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code in (400, 401, 403)

    def test_register_new_user(self, client):
        email = f"TEST_user_{int(time.time())}@memobot.com"
        r = client.post(f"{API}/auth/register", json={
            "email": email, "password": "Test12345", "name": "Test U"
        })
        assert r.status_code in (200, 201), r.text
        data = r.json()
        assert "access_token" in data or "token" in data

    def test_me(self, client, auth_headers):
        r = client.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data.get("email") == ADMIN_EMAIL


# ---------- Bot Control ----------
class TestBot:
    def test_status(self, client, auth_headers):
        r = client.get(f"{API}/bot/status", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "status" in data or "state" in data or "running" in data

    def test_start_then_stop(self, client, auth_headers):
        r = client.post(f"{API}/bot/control", headers=auth_headers, json={"action": "start"})
        assert r.status_code == 200, r.text
        s = client.get(f"{API}/bot/status", headers=auth_headers).json()
        assert (s.get("status") or s.get("state") or "").upper() in ("RUNNING", "STARTED", "ACTIVE") or s.get("running") is True

        r2 = client.post(f"{API}/bot/control", headers=auth_headers, json={"action": "stop"})
        assert r2.status_code == 200

    def test_voice_toggle(self, client, auth_headers):
        r = client.post(f"{API}/bot/voice", headers=auth_headers, json={"enabled": True})
        assert r.status_code in (200, 201)

    def test_notifications_toggle(self, client, auth_headers):
        r = client.post(f"{API}/bot/notifications", headers=auth_headers, json={"enabled": True})
        assert r.status_code in (200, 201)


# ---------- Strategies ----------
class TestStrategies:
    created_id = None

    def test_create_strategy(self, client, auth_headers):
        r = client.post(f"{API}/strategies", headers=auth_headers, json={
            "name": "TEST_Grid",
            "type": "grid",
            "symbol": "BTCUSDT",
            "params": {"grid_levels": 10, "upper": 110000, "lower": 90000},
            "enabled": True
        })
        assert r.status_code in (200, 201), r.text
        data = r.json()
        TestStrategies.created_id = data.get("id") or data.get("_id") or data.get("strategy_id")

    def test_list_strategies(self, client, auth_headers):
        r = client.get(f"{API}/strategies", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list) or isinstance(r.json(), dict)

    def test_signal(self, client, auth_headers):
        if not TestStrategies.created_id:
            pytest.skip("no strategy id")
        r = client.post(f"{API}/strategies/{TestStrategies.created_id}/signal", headers=auth_headers, json={})
        assert r.status_code in (200, 201), r.text

    def test_delete_strategy(self, client, auth_headers):
        if not TestStrategies.created_id:
            pytest.skip("no strategy id")
        r = client.delete(f"{API}/strategies/{TestStrategies.created_id}", headers=auth_headers)
        assert r.status_code in (200, 204)


# ---------- Trading ----------
class TestTrading:
    def test_preview_when_stopped(self, client, auth_headers):
        client.post(f"{API}/bot/control", headers=auth_headers, json={"action": "stop"})
        r = client.post(f"{API}/trade/preview", headers=auth_headers, json={
            "symbol": "BTCUSDT", "side": "buy", "quantity": 0.01, "type": "market"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is False or "error" in data or "reason" in data

    def test_execute_when_running(self, client, auth_headers):
        # Start bot
        client.post(f"{API}/bot/control", headers=auth_headers, json={"action": "start"})
        time.sleep(0.5)
        r_prev = client.post(f"{API}/trade/preview", headers=auth_headers, json={
            "symbol": "BTCUSDT", "side": "buy", "quantity": 0.01, "type": "market"
        })
        assert r_prev.status_code == 200, r_prev.text
        r = client.post(f"{API}/trade/execute", headers=auth_headers, json={
            "symbol": "BTCUSDT", "side": "buy", "quantity": 0.01, "type": "market"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "trade" in data or "fill_price" in data or "order" in data or data.get("ok") is True


# ---------- Risk ----------
class TestRisk:
    def test_get_profile(self, client, auth_headers):
        r = client.get(f"{API}/risk/profile", headers=auth_headers)
        assert r.status_code == 200

    def test_put_profile(self, client, auth_headers):
        r = client.put(f"{API}/risk/profile", headers=auth_headers, json={
            "level": "mid",
            "max_drawdown_pct": 10,
            "max_leverage": 3,
            "max_position_size_usd": 5000,
            "max_daily_loss_usd": 500,
            "max_concurrent_trades": 5
        })
        assert r.status_code in (200, 204), r.text

    def test_get_protection(self, client, auth_headers):
        r = client.get(f"{API}/risk/protection", headers=auth_headers)
        assert r.status_code == 200

    def test_put_protection(self, client, auth_headers):
        r = client.put(f"{API}/risk/protection", headers=auth_headers, json={
            "full_risk_protection": True,
            "daily_drawdown_limit_pct": 5,
            "slippage_limit_pct": 0.5,
            "data_stability_required": True,
            "max_orders_per_minute": 10,
            "circuit_breaker_pct": 8
        })
        assert r.status_code in (200, 204)


# ---------- Market ----------
class TestMarket:
    def test_tickers(self, client):
        r = client.get(f"{API}/market/tickers")
        assert r.status_code == 200
        data = r.json()
        tickers = data if isinstance(data, list) else data.get("tickers") or data.get("data") or []
        assert len(tickers) >= 10
        # verify at least one has binance_url
        found_url = any("binance_url" in t for t in tickers) if isinstance(tickers, list) else False
        assert found_url, f"No binance_url field found. sample={tickers[:1] if tickers else []}"

    def test_indicators(self, client, auth_headers):
        r = client.get(f"{API}/market/indicators/BTCUSDT", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        # at least one of the indicator keys
        keys = set(data.keys()) if isinstance(data, dict) else set()
        assert any(k.lower() in ("mfi", "cci", "smc", "order_flow") for k in keys) or "indicators" in data

    def test_opportunities(self, client, auth_headers):
        r = client.get(f"{API}/market/opportunities", headers=auth_headers)
        assert r.status_code == 200


# ---------- AI Sentiment ----------
class TestAI:
    def test_sentiment(self, client, auth_headers):
        r = client.get(f"{API}/ai/sentiment/BTCUSDT", headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "sentiment" in data or "score" in data or "reasoning" in data


# ---------- Analytics ----------
class TestAnalytics:
    def test_analytics(self, client, auth_headers):
        r = client.get(f"{API}/analytics", headers=auth_headers, params={"period": "all"})
        assert r.status_code == 200


# ---------- Reports ----------
class TestReports:
    def test_daily(self, client, auth_headers):
        r = client.get(f"{API}/reports/daily", headers=auth_headers)
        assert r.status_code == 200

    def test_weekly(self, client, auth_headers):
        r = client.get(f"{API}/reports/weekly", headers=auth_headers)
        assert r.status_code == 200

    def test_monthly(self, client, auth_headers):
        r = client.get(f"{API}/reports/monthly", headers=auth_headers)
        assert r.status_code == 200

    def test_daily_csv(self, client, auth_headers):
        r = client.get(f"{API}/reports/daily/csv", headers=auth_headers)
        assert r.status_code == 200
        ct = r.headers.get("content-type", "").lower()
        assert "csv" in ct or "text" in ct, f"unexpected content-type: {ct}"


# ---------- Payments ----------
class TestPayments:
    def test_plans(self, client, auth_headers):
        r = client.get(f"{API}/payments/plans", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, (list, dict))

    def test_checkout_stripe(self, client, auth_headers):
        r = client.post(f"{API}/payments/checkout", headers=auth_headers, json={
            "plan_id": "pro", "provider": "stripe",
            "origin_url": "https://example.com"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("session_id")
        assert data.get("url"), f"Stripe checkout should return a real url: {data}"

    def test_checkout_paypal_stub(self, client, auth_headers):
        r = client.post(f"{API}/payments/checkout", headers=auth_headers, json={
            "plan_id": "pro", "provider": "paypal",
            "origin_url": "https://example.com"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("session_id")
        # stubbed => url is null or absent
        assert data.get("url") in (None, "", "null")


# ---------- App Lock ----------
class TestAppLock:
    def test_set_pin(self, client, auth_headers):
        r = client.post(f"{API}/lock/set-pin", headers=auth_headers, json={"pin": "123456"})
        assert r.status_code in (200, 201), r.text

    def test_verify_pin(self, client, auth_headers):
        r = client.post(f"{API}/lock/verify", headers=auth_headers, json={"pin": "123456"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True or data.get("valid") is True or data.get("success") is True

    def test_state(self, client, auth_headers):
        r = client.get(f"{API}/lock/state", headers=auth_headers)
        assert r.status_code == 200

    def test_disable(self, client, auth_headers):
        r = client.post(f"{API}/lock/disable", headers=auth_headers, json={"pin": "123456"})
        assert r.status_code in (200, 204)


# ---------- Notifications ----------
class TestNotifications:
    def test_list(self, client, auth_headers):
        r = client.get(f"{API}/notifications", headers=auth_headers)
        assert r.status_code == 200


# ---------- Logout (run last) ----------
class TestZLogout:
    def test_logout(self, client, auth_headers):
        r = client.post(f"{API}/auth/logout", headers=auth_headers)
        assert r.status_code in (200, 204)
