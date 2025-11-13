@echo off
echo Starting Backend Server...
cd backend
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo Starting Django server...
python manage.py runserver
pause




