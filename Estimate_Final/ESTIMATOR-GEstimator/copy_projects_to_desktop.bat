@echo off
echo ================================================================================
echo GEstimator - Copy Converted Projects to Desktop
echo ================================================================================
echo.

set SOURCE_DIR=%LOCALAPPDATA%\CPWD\GEstimator\1\projects
set DEST_DIR=%USERPROFILE%\Desktop

echo Source: %SOURCE_DIR%
echo Destination: %DEST_DIR%
echo.

if not exist "%SOURCE_DIR%" (
    echo ERROR: Source directory does not exist!
    echo %SOURCE_DIR%
    pause
    exit /b 1
)

echo Copying .eproj files...
echo.

xcopy "%SOURCE_DIR%\*.eproj" "%DEST_DIR%\" /Y /I

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================================================
    echo SUCCESS! Projects copied to Desktop
    echo ================================================================================
    echo.
    echo You can now:
    echo 1. Open GEstimator application
    echo 2. Click File ^> Open Project
    echo 3. Select the .eproj file from your Desktop
    echo 4. Click Open
    echo.
    echo The project will load with all schedule items!
    echo ================================================================================
) else (
    echo.
    echo ERROR: Failed to copy files
)

echo.
dir "%DEST_DIR%\*.eproj" 2>nul
echo.
pause
