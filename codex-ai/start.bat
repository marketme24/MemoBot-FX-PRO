@echo off
REM =====================================================
REM   MEMOCODEX AI — One-Click Launcher (Windows)
REM   Full SPA: editor, chat, terminal, preview
REM =====================================================

cd /d "%~dp0"

echo.
echo  ============================================================
echo    MEMOCODEX AI — Starting up...
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

REM --- Check .env.local ---
if not exist ".env.local" (
    echo  [WARN] .env.local not found. Copying from .env.example...
    copy ".env.example" ".env.local" >nul
    echo  Edit .env.local now to add your AI_API_KEY, then re-run.
    notepad .env.local
    pause
    exit /b 0
)

REM --- Install deps if needed ---
if not exist "node_modules" (
    echo  Installing dependencies (first run only, ~2 min)...
    call npm install
    if errorlevel 1 (
        echo  [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

REM --- Open browser after a short delay ---
start "" /B cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

echo.
echo  Server will start at:  http://localhost:3000
echo  Press Ctrl+C to stop.
echo.

call npm run dev

pause
