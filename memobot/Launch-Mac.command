#!/bin/bash
cd "$(dirname "$0")"

# Start the dev server in the background
npm install --legacy-peer-deps > /dev/null 2>&1
npm run dev > /dev/null 2>&1 &

# Wait for server to start
sleep 5

# Open the browser
open http://localhost:3000

# Hide the terminal window (optional attempt for MacOS)
osascript -e 'tell application "Terminal" to set visible of front window to false'
