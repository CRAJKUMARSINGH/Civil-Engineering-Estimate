# PowerShell script to copy GEstimator tools

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("="*79) -ForegroundColor Cyan
Write-Host "GEstimator Tools Copy Script" -ForegroundColor Yellow
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("="*79) -ForegroundColor Cyan

# Create destination folder
$destFolder = "gestimator_tools"
Write-Host "`nCreating folder: $destFolder" -ForegroundColor Green

if (!(Test-Path $destFolder)) {
    New-Item -ItemType Directory -Path $destFolder | Out-Null
    Write-Host "  ✓ Folder created" -ForegroundColor Green
} else {
    Write-Host "  ✓ Folder already exists" -ForegroundColor Yellow
}

# Copy Python scripts
Write-Host "`nCopying Python scripts..." -ForegroundColor Green
$pythonFiles = @(
    "standalone_converter.py",
    "convert_projects.py", 
    "import_schedule_and_projects.py",
    "check_gestimator_projects.py",
    "show_projects.py",
    "quick_convert.py",
    "debug_excel.py",
    "examine_project.py",
    "test_import.py",
    "simple_test.py"
)

$copiedCount = 0
foreach ($file in $pythonFiles) {
    if (Test-Path $file) {
        Copy-Item $file $destFolder -Force
        Write-Host "  ✓ $file" -ForegroundColor Gray
        $copiedCount++
    }
}
Write-Host "  Copied $copiedCount Python files" -ForegroundColor Green

# Copy log files
Write-Host "`nCopying log files..." -ForegroundColor Green
$logFiles = Get-ChildItem -Filter "*.log" -ErrorAction SilentlyContinue
if ($logFiles) {
    foreach ($file in $logFiles) {
        Copy-Item $file.FullName $destFolder -Force
        Write-Host "  ✓ $($file.Name)" -ForegroundColor Gray
    }
    Write-Host "  Copied $($logFiles.Count) log files" -ForegroundColor Green
} else {
    Write-Host "  No log files found" -ForegroundColor Yellow
}

# Copy Excel files
Write-Host "`nCopying Excel files..." -ForegroundColor Green
$excelFiles = Get-ChildItem -Filter "*.xlsx" -ErrorAction SilentlyContinue
if ($excelFiles) {
    foreach ($file in $excelFiles) {
        Copy-Item $file.FullName $destFolder -Force
        Write-Host "  ✓ $($file.Name)" -ForegroundColor Gray
    }
    Write-Host "  Copied $($excelFiles.Count) Excel files" -ForegroundColor Green
} else {
    Write-Host "  No Excel files found" -ForegroundColor Yellow
}

# Copy batch files
Write-Host "`nCopying batch files..." -ForegroundColor Green
$batFiles = Get-ChildItem -Filter "*.bat" -ErrorAction SilentlyContinue
if ($batFiles) {
    foreach ($file in $batFiles) {
        if ($file.Name -ne "copy_to_drive.bat") {
            Copy-Item $file.FullName $destFolder -Force
            Write-Host "  ✓ $($file.Name)" -ForegroundColor Gray
        }
    }
}

# Create README
Write-Host "`nCreating README..." -ForegroundColor Green
$readme = @"
# GEstimator Tools

This folder contains tools for converting Excel projects to GEstimator format.

## Main Scripts

1. **standalone_converter.py** - Main conversion script
   - Converts Excel files from Attached_Assets/PROJECTS to .eproj format
   - Usage: python standalone_converter.py

2. **show_projects.py** - Show converted projects
   - Lists all converted .eproj files
   - Shows project details and how to open them
   - Usage: python show_projects.py

3. **check_gestimator_projects.py** - Verify project files
   - Checks database integrity
   - Verifies GEstimator installation
   - Usage: python check_gestimator_projects.py

## Converted Projects Location

Your converted .eproj files are saved to:
C:\Users\$env:USERNAME\AppData\Local\CPWD\GEstimator\1\projects\

## How to Open in GEstimator

1. Launch GEstimator application
2. Click "Open Project" or File > Open
3. Navigate to the projects folder above
4. Select a .eproj file and click Open

## Files Copied

- Python conversion scripts
- Log files from conversions
- Excel source files
- Batch helper scripts

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

$readme | Out-File -FilePath "$destFolder\README.txt" -Encoding UTF8
Write-Host "  ✓ README.txt created" -ForegroundColor Green

# Summary
Write-Host "`n" -NoNewline
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("="*79) -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Yellow
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("="*79) -ForegroundColor Cyan

$destPath = Resolve-Path $destFolder
Write-Host "`nAll files copied to:" -ForegroundColor Green
Write-Host "  $destPath" -ForegroundColor White

Write-Host "`nFolder contents:" -ForegroundColor Green
Get-ChildItem $destFolder | Format-Table Name, Length, LastWriteTime -AutoSize

Write-Host "`n✓ Done!" -ForegroundColor Green
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("="*79) -ForegroundColor Cyan
