@echo off
echo ========================================
echo Starting MindEase Application
echo ========================================
echo.

echo [1/2] Starting Frontend Server...
cd frontend
start "Frontend Server" cmd /k "npm run dev"
timeout /t 2 /nobreak > nul

echo [2/2] Starting Backend Server...
cd ..\backend
start "Backend Server" cmd /k "python manage.py runserver"
timeout /t 2 /nobreak > nul

echo.
echo ========================================
echo Servers are starting...
echo ========================================
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo.
echo Press any key to exit this window (servers will continue running)
pause > nul




