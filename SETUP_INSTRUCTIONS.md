# MindEase - Setup and Run Instructions

## Status
✅ **Frontend server is running on http://localhost:5173**

⚠️ **Backend server requires Python installation**

## Quick Start

### Option 1: Use Batch Files (Recommended)

1. **Start Frontend** (if not already running):
   - Double-click `START_FRONTEND.bat`

2. **Start Backend** (after Python installation):
   - Double-click `START_BACKEND.bat`

3. **Start Both** (after Python installation):
   - Double-click `START_SERVERS.bat`

### Option 2: Manual Start

#### Frontend (Already Running)
```bash
cd frontend
npm install  # First time only
npm run dev
```
Access at: http://localhost:5173

#### Backend (Requires Python)
```bash
cd backend
pip install -r requirements.txt  # First time only
python manage.py runserver
```
Access at: http://localhost:8000

## Python Installation

### Method 1: Official Python Installer (Recommended)
1. Download Python 3.8+ from: https://www.python.org/downloads/
2. **Important**: Check "Add Python to PATH" during installation
3. Verify installation: `python --version`

### Method 2: Microsoft Store
1. Open Microsoft Store
2. Search for "Python 3.11" or "Python 3.12"
3. Click "Install"
4. Verify installation: `python --version`

### Method 3: Using Windows Package Manager (winget)
```powershell
winget install Python.Python.3.11
```

## Project Structure

```
MindEase/
├── frontend/          # React + Vite frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── backend/           # Django REST API backend
│   ├── apps/
│   ├── config/
│   ├── manage.py
│   └── requirements.txt
├── API_Doc/          # API documentation
└── Docs/             # Project documentation
```

## API Endpoints

### Authentication
- `POST /api/auth/signup/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `POST /api/auth/token/refresh/` - Refresh token
- `GET /api/auth/profile/` - Get user profile
- `PATCH /api/auth/profile/` - Update user profile

### Resources
- `GET /api/resources/` - Get resources (supports `?q=search&type=article|video|pdf`)

### Search
- `GET /api/search/counsellors/` - Search counsellors (supports `?q=search&specialization=name`)

## Troubleshooting

### Frontend Issues
- **Port 5173 already in use**: Kill the process using port 5173 or change port in `vite.config.js`
- **Dependencies not installed**: Run `npm install` in the frontend directory

### Backend Issues
- **Python not found**: Install Python and ensure it's in PATH
- **Django not found**: Run `pip install -r requirements.txt` in backend directory
- **Port 8000 already in use**: Kill the process using port 8000 or change port: `python manage.py runserver 8001`
- **Database issues**: Run `python manage.py migrate` in backend directory

### CORS Issues
- Ensure backend CORS settings allow `http://localhost:5173`
- Check `backend/config/settings.py` for CORS configuration

## Development Notes

- Frontend runs on: http://localhost:5173
- Backend runs on: http://localhost:8000
- API Base URL: http://localhost:8000/api/
- Database: SQLite (backend/db.sqlite3)

## Next Steps

1. Install Python if not already installed
2. Start backend server using `START_BACKEND.bat` or manual commands
3. Access the application at http://localhost:5173
4. Register a new account or login
5. Explore the features!

## Support

For issues or questions, refer to the API documentation in the `API_Doc/` folder.




