@echo off
title GEstimator Tools Demo

echo ==========================================
echo GEstimator Tools Usage Examples
echo ==========================================
echo.
echo This batch file demonstrates how to use the GEstimator conversion tools.
echo.
pause
echo.
echo 1. Converting a single Excel file to GEstimator format:
echo    python create_gestimator_converter.py "input_file.xlsx" -o "output_file.xlsx"
echo.
echo 2. Converting multiple Excel files at once:
echo    python batch_gestimator_converter.py "folder_path"
echo.
echo 3. Creating a complete GEstimator template:
echo    python create_gestimator_template.py --type complete -o "template.xlsx"
echo.
echo 4. Analyzing an Excel file structure:
echo    python analyze_excel.py
echo.
echo 5. Verifying a converted file:
echo    python verify_conversion.py
echo.
echo ==========================================
echo Available Tools in This Directory:
echo ==========================================
dir *.py | findstr converter
dir *.py | findstr template
dir *.py | findstr verify
dir *.py | findstr analyze
echo.
echo ==========================================
echo Available Excel Files:
echo ==========================================
dir *.xlsx
echo.
echo ==========================================
echo Native GEstimator Project Files:
echo ==========================================
dir PROJECTS\*.eproj
echo.
echo All tools and files are ready for use!
pause