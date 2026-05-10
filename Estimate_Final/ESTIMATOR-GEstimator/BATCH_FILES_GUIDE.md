# Windows Batch Files Guide - Excel to .eproj Converter

This project includes batch files to easily convert Excel files to GEstimator .eproj format on Windows.

## Available Batch Files

### 1. CONVERT_PROJECTS.bat
**Purpose:** Convert Excel files from `Attached_Assets/PROJECTS` directory

**When to use:**
- When you have Excel files in the repository's `Attached_Assets/PROJECTS` folder
- For converting project files that are part of the repository

**How to use:**
1. Place your Excel files (.xls, .xlsx) in `Attached_Assets/PROJECTS/` folder
2. Double-click `CONVERT_PROJECTS.bat`
3. The .eproj files will be created in the same directory

### 2. CONVERT_UPLOADED_FILES.bat ⭐ **NEW**
**Purpose:** Convert uploaded Excel files from `attached_assets` directory

**When to use:**
- When you upload Excel files through drag-and-drop or file upload
- For converting new files without modifying the repository structure
- For quick one-time conversions

**How to use:**
1. Upload your Excel files to the `attached_assets/` folder (or they will be auto-placed there when uploaded)
2. Double-click `CONVERT_UPLOADED_FILES.bat`
3. The .eproj files will be created in the `attached_assets/` folder

## System Requirements

- **Windows**: 7, 8, 10, 11 (any version)
- **Python**: 3.7 or later
  - Download from: https://www.python.org/downloads/
  - Make sure to check "Add Python to PATH" during installation
- **Dependencies**: openpyxl (automatically installed by the batch files)

## What the Batch Files Do

1. ✓ Check if Python is installed
2. ✓ Check and install required dependencies (openpyxl)
3. ✓ Find all Excel files (.xls, .xlsx) in the target directory
4. ✓ Convert each file to .eproj format
5. ✓ Handle duplicate item codes automatically
6. ✓ Display conversion results
7. ✓ Save .eproj files in the same location as the Excel files

## Conversion Features

### Data Integrity
- **100% Data Preservation**: All schedule items are converted
- **Duplicate Handling**: Duplicate codes are automatically renamed (e.g., `1`, `1_dup1`, `1_dup2`)
- **No Data Loss**: Every row from Excel is included in the .eproj file

### Automatic Detection
- Finds schedule sheets automatically
- Detects header rows (S.No, Description, Qty, Rate, etc.)
- Extracts all schedule data (code, description, unit, rate, quantity)

### Error Handling
- Skips files that are already converted
- Reports errors clearly
- Shows summary at the end

## Output Files

The converted `.eproj` files are:
- **Format**: SQLite database files
- **Compatible**: GEstimator software for Windows
- **Structure**: Complete database schema with:
  - Project metadata
  - Schedule items (code, description, unit, rate, qty)
  - Resource tables
  - Measurement tables
  - Analysis tables

## Example Usage

### Example 1: Converting Repository Files
```cmd
C:\ESTIMATOR-GEstimator> CONVERT_PROJECTS.bat
```
Output:
```
Found 3 Excel files:
  - Project1.xlsx
  - Project2.xlsx
  - Project3.xlsx

Converted: 3
Output: Attached_Assets/PROJECTS/
```

### Example 2: Converting Uploaded Files
```cmd
C:\ESTIMATOR-GEstimator> CONVERT_UPLOADED_FILES.bat
```
Output:
```
Found 2 Excel files:
  - Building_Estimate.xlsx
  - Road_Project.xlsx

Converted: 2
Output: attached_assets/
```

## Troubleshooting

### Python not found
**Error:** `Python is not installed or not in PATH`

**Solution:**
1. Download Python from https://www.python.org/
2. During installation, check ☑ "Add Python to PATH"
3. Restart your computer
4. Run the batch file again

### No Excel files found
**Error:** `No Excel files found`

**Solution:**
- Make sure your Excel files are in the correct directory:
  - `Attached_Assets/PROJECTS/` for CONVERT_PROJECTS.bat
  - `attached_assets/` for CONVERT_UPLOADED_FILES.bat
- Check that files have .xlsx or .xls extension

### Conversion errors
**Error:** Individual file conversion fails

**Solution:**
- Check that the Excel file is not corrupted
- Ensure the file contains schedule data with proper columns
- Look at the error message for specific details

## File Locations

After conversion, find your .eproj files in:

| Batch File | Excel Location | .eproj Output Location |
|------------|----------------|------------------------|
| CONVERT_PROJECTS.bat | Attached_Assets/PROJECTS/ | Attached_Assets/PROJECTS/ |
| CONVERT_UPLOADED_FILES.bat | attached_assets/ | attached_assets/ |

## Quick Start Checklist

- [ ] Python 3.7+ installed
- [ ] Python added to PATH
- [ ] Excel files ready (.xlsx or .xls)
- [ ] Files in correct directory
- [ ] Double-click the appropriate .bat file
- [ ] Check output directory for .eproj files
- [ ] Open .eproj files in GEstimator

## Support

If you encounter issues:
1. Check this guide's Troubleshooting section
2. Verify Python installation: `python --version`
3. Check Excel file format and structure
4. Review the conversion log messages

## Notes

- Original Excel files are **never modified or deleted**
- Existing .eproj files are **not overwritten** (conversion is skipped)
- All conversions are logged with detailed information
- The batch files work offline (no internet required after Python/dependencies are installed)
