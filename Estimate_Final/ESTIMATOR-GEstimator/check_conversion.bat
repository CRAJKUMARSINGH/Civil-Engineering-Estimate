@echo off
echo Checking GEstimator conversion files...
echo ======================================
dir *.xlsx
echo.
echo Checking if geodesic_dome_gestimator.xlsx exists...
if exist geodesic_dome_gestimator.xlsx (
    echo File exists!
) else (
    echo File does not exist!
)
echo.
echo Creating a test conversion...
python create_gestimator_converter.py "Attached_Assets/PROJECTS/20-40 Construction of Hall with Geodesic Aluminium Dome Roof at Arthuna.xlsx" -o test_conversion.xlsx