@echo off
title IT-to-Human Translator - Starting Servers
echo ===================================================
echo   Starting FastAPI Backend & Vite Frontend Servers
echo ===================================================

echo [1/2] Launching FastAPI Backend on http://localhost:8000 ...
start "FastAPI Backend" cmd /k "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching Frontend on http://localhost:3000 ...
start http://localhost:3000
npm run dev
