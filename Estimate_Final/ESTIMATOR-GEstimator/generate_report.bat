@echo off
echo Generating GEstimator Project Report...
echo ======================================
python project_report.py
echo.
echo Report generation complete.
echo Opening report in browser...
start project_report.html
pause