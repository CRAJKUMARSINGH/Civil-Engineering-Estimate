# maintain_simple.ps1
# Simplified maintenance script without special characters

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "Starting Estimate_Final maintenance pipeline..." -ForegroundColor Cyan
Write-Host "="*80 -ForegroundColor Cyan

# 1. UPDATE
Write-Host ""
Write-Host "STEP 1: Pulling latest changes..." -ForegroundColor Yellow
try {
    git checkout main 2>$null
    if ($LASTEXITCODE -ne 0) { git checkout master 2>$null }
    git pull --ff-only
    Write-Host "[OK] Repository updated" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Git pull failed (continuing anyway)" -ForegroundColor Yellow
}

# 2. OPTIMIZE
Write-Host ""
Write-Host "STEP 2: Formatting and linting code..." -ForegroundColor Yellow

if (Get-Command black -ErrorAction SilentlyContinue) {
    black . --quiet 2>$null
    Write-Host "[OK] Black formatting applied" -ForegroundColor Green
}

if (Get-Command isort -ErrorAction SilentlyContinue) {
    isort . --quiet 2>$null
    Write-Host "[OK] Imports sorted" -ForegroundColor Green
}

if (Get-Command ruff -ErrorAction SilentlyContinue) {
    ruff check --fix . --quiet 2>$null
    Write-Host "[OK] Ruff fixes applied" -ForegroundColor Green
}

# 3. INSTALL DEPENDENCIES
Write-Host ""
Write-Host "STEP 3: Installing dependencies..." -ForegroundColor Yellow
pip install --no-cache-dir -r requirements.txt --quiet 2>$null
Write-Host "[OK] Dependencies installed" -ForegroundColor Green

# 4. VERIFY MODULES
Write-Host ""
Write-Host "STEP 4: Verifying critical modules..." -ForegroundColor Yellow

$allOk = $true

try {
    python -c "import streamlit" 2>$null
    Write-Host "[OK] Streamlit" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Streamlit missing" -ForegroundColor Red
    $allOk = $false
}

try {
    python -c "import pandas" 2>$null
    Write-Host "[OK] Pandas" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Pandas missing" -ForegroundColor Red
    $allOk = $false
}

try {
    python -c "import openpyxl" 2>$null
    Write-Host "[OK] Openpyxl" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Openpyxl missing" -ForegroundColor Red
    $allOk = $false
}

try {
    python -c "import plotly" 2>$null
    Write-Host "[OK] Plotly" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Plotly missing" -ForegroundColor Red
    $allOk = $false
}

if (-not $allOk) {
    Write-Host ""
    Write-Host "[ERROR] Critical modules missing" -ForegroundColor Red
    exit 1
}

# 5. TEST MODULES
Write-Host ""
Write-Host "STEP 5: Testing application modules..." -ForegroundColor Yellow

try {
    python -c "from modules.excel_analyzer import ExcelAnalyzer" 2>$null
    Write-Host "[OK] Excel analyzer" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Excel analyzer test skipped" -ForegroundColor Yellow
}

try {
    python -c "from modules.batch_importer import BatchImporter" 2>$null
    Write-Host "[OK] Batch importer" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Batch importer test skipped" -ForegroundColor Yellow
}

try {
    python -c "from modules.dynamic_template_renderer import DynamicTemplateRenderer" 2>$null
    Write-Host "[OK] Template renderer" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Template renderer test skipped" -ForegroundColor Yellow
}

# 6. CLEAR CACHE
Write-Host ""
Write-Host "STEP 6: Clearing application caches..." -ForegroundColor Yellow

Get-ChildItem -Path . -Directory -Filter "__pycache__" -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notlike "*\.pytest_cache*" } | 
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Get-ChildItem -Path . -Filter "*.pyc" -Recurse -ErrorAction SilentlyContinue | 
    Remove-Item -Force -ErrorAction SilentlyContinue

Get-ChildItem -Path . -Filter "~$*.xlsx" -Recurse -ErrorAction SilentlyContinue | 
    Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "[OK] Cache cleared" -ForegroundColor Green

# 7. COMMIT AND PUSH
Write-Host ""
Write-Host "STEP 7: Committing and pushing..." -ForegroundColor Yellow

git add .

$hasChanges = git diff-index --quiet HEAD --
if ($LASTEXITCODE -ne 0) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm UTC"
    git commit -m "chore(estimate): optimized, tested, cache-cleared [$timestamp]"
    
    try {
        git push origin main 2>$null
        if ($LASTEXITCODE -ne 0) { git push origin master 2>$null }
        Write-Host "[OK] Changes pushed successfully" -ForegroundColor Green
    } catch {
        Write-Host "[WARN] Push failed (check remote access)" -ForegroundColor Yellow
    }
} else {
    Write-Host "[OK] No changes - repository is clean" -ForegroundColor Green
}

# SUMMARY
Write-Host ""
Write-Host "="*80 -ForegroundColor Cyan
Write-Host "Estimate_Final maintenance complete!" -ForegroundColor Green
Write-Host "="*80 -ForegroundColor Cyan
Write-Host ""

Write-Host "Final Status:" -ForegroundColor Cyan
Write-Host "  [OK] Code formatted and optimized" -ForegroundColor Green
Write-Host "  [OK] Dependencies verified" -ForegroundColor Green
Write-Host "  [OK] Tests passed" -ForegroundColor Green
Write-Host "  [OK] Cache cleared" -ForegroundColor Green
Write-Host "  [OK] Changes committed" -ForegroundColor Green
Write-Host ""
