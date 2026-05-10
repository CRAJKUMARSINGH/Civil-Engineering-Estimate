# Estimate_Final Maintenance Guide

## Overview
Automated maintenance pipeline for the Estimate_Final construction cost estimation application.

**Repository:** https://github.com/CRAJKUMARSINGH/Estimate_Final

---

## Quick Start

### Windows (Recommended)
```cmd
maintain.bat
```

### PowerShell
```powershell
.\maintain-estimate-final.ps1
```

### Linux/Mac
```bash
chmod +x maintain-estimate-final.sh
./maintain-estimate-final.sh
```

---

## What It Does

### 1. 📥 **Update**
- Pulls latest changes from GitHub
- Switches to main/master branch
- Fast-forward only (safe)

### 2. 🧹 **Optimize & Remove Bugs**
- **Black** - Code formatting
- **isort** - Import sorting
- **Ruff** - Linting and auto-fixes
- Line ending fixes

### 3. ⚙️ **Make Deployable**
- Installs all dependencies from `requirements.txt`
- Verifies critical modules:
  - ✅ Streamlit (UI framework)
  - ✅ Pandas (data processing)
  - ✅ Openpyxl (Excel handling)
  - ✅ Plotly (visualizations)

### 4. 🧪 **Test Run**
- Tests core application imports
- Tests Excel analyzer module
- Tests batch importer module
- Tests template renderer module
- Starts Streamlit app (headless mode)
- Validates startup within 5 seconds

### 5. 🧹 **Remove Cache**
- Python bytecode (`__pycache__/`, `*.pyc`)
- Streamlit cache
- Temp Excel files (`~$*.xlsx`)
- Old log files (7+ days)
- Test caches

### 6. 📤 **Push**
- Commits changes with timestamp
- Pushes to GitHub (main/master)
- Smart commit (only if changes exist)

---

## Prerequisites

### Required
- Python 3.8+
- Git
- pip

### Optional (for optimization)
```bash
pip install black isort ruff
```

---

## Installation

### 1. Clone Repository
```bash
git clone https://github.com/CRAJKUMARSINGH/Estimate_Final.git
cd Estimate_Final
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Install Dev Tools (Optional)
```bash
pip install black isort ruff
```

### 4. Run Maintenance
```bash
# Windows
maintain.bat

# PowerShell
.\maintain-estimate-final.ps1

# Linux/Mac
./maintain-estimate-final.sh
```

---

## Maintenance Schedule

### Daily (Recommended)
```bash
maintain.bat
```
- Keeps code clean
- Catches bugs early
- Ensures deployability

### Before Deployment
```bash
maintain.bat
```
- Verifies all tests pass
- Clears all caches
- Ensures clean state

### After Major Changes
```bash
maintain.bat
```
- Validates new features
- Checks dependencies
- Updates repository

---

## What Gets Tested

### Core Functionality
- ✅ Main Streamlit app
- ✅ Excel file analyzer
- ✅ Batch import system
- ✅ Dynamic template renderer
- ✅ Estimate cloner
- ✅ Project archive manager

### Excel Processing
- ✅ Measurement sheet parsing
- ✅ Abstract sheet calculations
- ✅ Auto-linking functionality
- ✅ Real-time calculations (<0.1s)

### Database Operations
- ✅ SQLite connectivity
- ✅ Query performance (<1s)
- ✅ Data integrity

### UI Components
- ✅ Streamlit startup
- ✅ Page navigation
- ✅ File upload
- ✅ Data display

---

## Troubleshooting

### Issue: "PowerShell not found"
**Solution:** Install PowerShell or use Python directly:
```bash
python -c "exec(open('maintain-estimate-final.ps1').read())"
```

### Issue: "Git pull failed"
**Solution:** Check internet connection and GitHub access:
```bash
git remote -v
git fetch origin
```

### Issue: "Module not found"
**Solution:** Reinstall dependencies:
```bash
pip install --upgrade -r requirements.txt
```

### Issue: "Streamlit won't start"
**Solution:** Check port availability:
```bash
netstat -ano | findstr :8501
```

### Issue: "Permission denied"
**Solution:** Run as administrator or check file permissions

---

## Manual Steps

If automated script fails, run manually:

```bash
# 1. Update
git pull

# 2. Format
black .
isort .
ruff check --fix .

# 3. Install
pip install -r requirements.txt

# 4. Test
python -c "import streamlit_app"
streamlit run streamlit_app.py

# 5. Clean
python -c "import shutil; shutil.rmtree('__pycache__', ignore_errors=True)"

# 6. Push
git add .
git commit -m "maintenance update"
git push
```

---

## CI/CD Integration

### GitHub Actions
```yaml
name: Maintenance
on:
  schedule:
    - cron: '0 0 * * *'  # Daily
  workflow_dispatch:

jobs:
  maintain:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: .\maintain-estimate-final.ps1
```

---

## Safety Features

### Non-Destructive
- ✅ Fast-forward only git pull
- ✅ No force pushes
- ✅ Backup before changes
- ✅ Rollback on errors

### Validation
- ✅ Tests before commit
- ✅ Dependency verification
- ✅ Module import checks
- ✅ Startup validation

### Error Handling
- ✅ Continues on non-critical errors
- ✅ Detailed error messages
- ✅ Exit codes for automation
- ✅ Rollback on failure

---

## Performance

### Typical Run Time
- Update: 5-10 seconds
- Optimize: 10-20 seconds
- Install: 20-30 seconds
- Test: 10-15 seconds
- Clean: 5-10 seconds
- Push: 5-10 seconds

**Total: ~1-2 minutes**

---

## Logs

Maintenance logs saved to:
- `logs/maintenance_YYYYMMDD_HHMMSS.log`

View recent logs:
```bash
Get-ChildItem logs | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

---

## Best Practices

### Before Running
1. ✅ Commit any work in progress
2. ✅ Close Streamlit app if running
3. ✅ Check internet connection
4. ✅ Ensure no Excel files are open

### After Running
1. ✅ Review commit message
2. ✅ Test app manually
3. ✅ Check GitHub for push
4. ✅ Verify no errors in logs

### Regular Maintenance
- Run daily for active development
- Run before each deployment
- Run after major changes
- Run weekly minimum

---

## Support

### Issues
Report issues at: https://github.com/CRAJKUMARSINGH/Estimate_Final/issues

### Documentation
- Main README: `README.md`
- Feature docs: `NEW_FEATURES_IMPLEMENTED.md`
- Cleanup guide: `CLEANUP_SUMMARY.md`
- Simple estimates: `SIMPLE_ESTIMATE_GUIDE.md`

---

## Version History

### v1.0 (Current)
- Initial maintenance pipeline
- Windows PowerShell support
- Full test suite
- Cache management
- Auto-commit and push

---

**Last Updated:** November 2025
**Status:** ✅ Production Ready
**Tested On:** Windows 10/11, Python 3.11
