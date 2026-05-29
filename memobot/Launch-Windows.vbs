Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd.exe /c ""npm install --legacy-peer-deps && npm run dev""", 0, False
WScript.Sleep 5000
WshShell.Run "http://localhost:3000"
