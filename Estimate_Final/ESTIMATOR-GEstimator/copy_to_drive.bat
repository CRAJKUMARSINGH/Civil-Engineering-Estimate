@echo off
REM Windows batch script to copy GEstimator tools to a folder

echo Creating gestimator_tools folder...
mkdir gestimator_tools 2>nul

echo Copying files...
copy standalone_converter.py gestimator_tools\ >nul 2>&1
copy convert_projects.py gestimator_tools\ >nul 2>&1
copy import_schedule_and_projects.py gestimator_tools\ >nul 2>&1
copy check_gestimator_projects.py gestimator_tools\ >nul 2>&1
copy show_projects.py gestimator_tools\ >nul 2>&1
copy quick_convert.py gestimator_tools\ >nul 2>&1
copy debug_excel.py gestimator_tools\ >nul 2>&1
copy examine_project.py gestimator_tools\ >nul 2>&1

REM Copy log files
copy *.log gestimator_tools\ >nul 2>&1

REM Copy Excel files if they exist
copy *.xlsx gestimator_tools\ >nul 2>&1

echo.
echo Files copied to: %CD%\gestimator_tools\
echo.
dir gestimator_tools
echo.
echo Done!
pause
