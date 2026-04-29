@echo off
echo Starting John Fabric development servers...

:: Backend
start "John Fabric Backend" cmd /k "cd /d %~dp0backend && pip install -r requirements.txt && python -m app.db.seed && uvicorn app.main:app --reload --port 8000"

:: Frontend
start "John Fabric Frontend" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"

echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo Admin:    http://localhost:3000/admin
