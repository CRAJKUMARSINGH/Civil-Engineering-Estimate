@echo off
REM ========================================
REM ULTIMATE CONSTRUCTION ESTIMATOR
REM One-Click Deployment Script
REM ========================================

echo.
echo ========================================
echo   ULTIMATE CONSTRUCTION ESTIMATOR
echo   Deployment Script v7.0
echo ========================================
echo.

REM Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ from python.org
    pause
    exit /b 1
)

echo [1/5] Checking Python version...
python --version

echo.
echo [2/5] Installing/Updating dependencies...
pip install --upgrade pip
pip install -r requirements.txt

if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [3/5] Checking database...
if not exist "construction_estimates.db" (
    echo Creating new database...
    python -c "from modules.database import SmartIntegratedDatabase; db = SmartIntegratedDatabase(); print('Database initialized successfully')"
)

echo.
echo [4/5] Running quick health check...
python -c "import streamlit; import pandas; import openpyxl; import plotly; print('All core modules OK')"

if errorlevel 1 (
    echo [ERROR] Health check failed
    pause
    exit /b 1
)

echo.
echo [5/5] Starting application...
echo.
echo ========================================
echo   APPLICATION STARTING
echo ========================================
echo.
echo   Local URL: http://localhost:8501
echo   Network URL: http://YOUR_IP:8501
echo.
echo   Press Ctrl+C to stop the server
echo ========================================
echo.

streamlit run streamlit_app.py

pause
