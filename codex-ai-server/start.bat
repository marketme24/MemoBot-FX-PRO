@echo off
REM =====================================================
REM   MEMOCODEX AI — Lightweight Server Launcher (Windows)
REM   Standalone Express + WebSocket + inline HTML UI
REM =====================================================

cd /d "%~dp0"

echo.
echo  ============================================================
echo    MEMOCODEX AI Server — Starting up...
echo  ============================================================
echo.

REM --- Check Node.js ---
where node >nul 2>nul
if errorlevel 1 (
    echo  [ERROR] Node.js is not installed.
    echo  Download from: https://nodejs.org  (LTS version)
    pause
    exit /b 1
)

REM --- Check .env ---
if not exist ".env" (
    echo  [WARN] .env not found. Copying from .env.example...
    copy ".env.example" ".env" >nul
    echo  Edit .env now to add your AI_API_KEY, then re-run.
    notepad .env
    pause
    exit /b 0
)

REM --- Install deps if needed ---
if not exist "node_modules" (
    echo  Installing dependencies (first run only)...
    call npm install
    if errorlevel 1 (
        echo  [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

REM --- Open browser after a short delay ---
start "" /B cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3456"

echo.
echo  Server will start at:  http://localhost:3456
echo  WebSocket port:        3457
echo  Press Ctrl+C to stop.
echo.

call npm run dev

pause
