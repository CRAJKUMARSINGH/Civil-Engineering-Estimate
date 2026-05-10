@echo off
REM Quick maintenance launcher for Estimate_Final
REM Runs the PowerShell maintenance script

echo.
echo ========================================
echo   Estimate_Final Maintenance
echo ========================================
echo.

REM Check if PowerShell is available
where powershell >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PowerShell not found
    echo Please install PowerShell to run this script
    pause
    exit /b 1
)

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0maintain-estimate-final.ps1"

echo.
echo ========================================
echo   Maintenance Complete
echo ========================================
echo.
pause
