Write-Host "Running Excel to GEstimator Project Converter - DEBUG MODE"
Write-Host "========================================================="
python convert_projects.py --debug
Write-Host "Press any key to continue..."
$host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")