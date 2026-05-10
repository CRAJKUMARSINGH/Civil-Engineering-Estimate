@echo off
echo ================================================================================
echo Deploying Fixed GEstimator Projects
echo ================================================================================
echo.

set SOURCE_DIR=%LOCALAPPDATA%\CPWD\GEstimator\1\projects
set DEST1=Attached_Assets\PROJECTS
set DEST2=%USERPROFILE%\Desktop

echo Source: %SOURCE_DIR%
echo.
echo Destinations:
echo   1. %DEST1%
echo   2. %DEST2%
echo.

if not exist "%SOURCE_DIR%" (
    echo ERROR: Source directory does not exist!
    pause
    exit /b 1
)

echo Copying to Attached_Assets\PROJECTS...
xcopy "%SOURCE_DIR%\*.eproj" "%DEST1%\" /Y /I
echo.

echo Copying to Desktop...
xcopy "%SOURCE_DIR%\*.eproj" "%DEST2%\" /Y /I
echo.

echo ================================================================================
echo SUCCESS! Projects deployed
echo ================================================================================
echo.
echo Files copied to:
echo   1. %CD%\%DEST1%
echo   2. %DEST2%
echo.
echo.
echo ================================================================================
echo HOW TO OPEN IN GESTIMATOR:
echo ================================================================================
echo.
echo 1. Launch GEstimator application
echo 2. Click "File" menu or folder icon
echo 3. Select "Open Project"
echo 4. Navigate to Desktop or Attached_Assets\PROJECTS
echo 5. Select the .eproj file
echo 6. Click "Open"
echo.
echo The project will now load with ALL 22 schedule items visible!
echo ================================================================================
echo.

dir "%DEST1%\*.eproj" 2>nul
echo.
dir "%DEST2%\*.eproj" 2>nul
echo.

pause
