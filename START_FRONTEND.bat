@echo off
echo Starting Frontend Server...
cd frontend
echo Installing dependencies...
call npm install
echo.
echo Starting Vite dev server...
npm run dev
pause




