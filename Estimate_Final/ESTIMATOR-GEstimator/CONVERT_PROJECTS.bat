@echo off
REM Batch script to convert Excel files to .eproj format
REM Converts all .xls* files in Attached_Assets/PROJECTS to .eproj

echo ================================================================================
echo Excel to .eproj Converter for GEstimator
echo ================================================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.7 or later from https://www.python.org/
    pause
    exit /b 1
)

echo Python detected successfully
echo.

REM Check if required packages are installed
echo Checking dependencies...
python -c "import openpyxl" >nul 2>&1
if errorlevel 1 (
    echo Installing required packages...
    python -m pip install openpyxl
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo Dependencies OK
echo.

REM Run the conversion script
echo Starting conversion...
echo.
python convert_attached_projects.py
set EXIT_CODE=%errorlevel%

echo.
if %EXIT_CODE% == 0 (
    echo Conversion completed successfully!
) else (
    echo Conversion completed with errors.
)

echo.
echo Press any key to exit...
pause >nul
exit /b %EXIT_CODE%
