# Excel to .eproj Converter - Usage Guide

## Overview
This tool converts Excel estimation files (`.xls`, `.xlsx`) from the `Attached_Assets/PROJECTS` directory into GEstimator `.eproj` format files that can be opened in Windows.

## What Was Done
All Excel files in `Attached_Assets/PROJECTS` have been converted to `.eproj` format:

### Converted Files:
1. **20-40 Construction of Hall with Geodesic Aluminium Dome Roof at Arthuna.eproj** ✓
   - Source: 20-40 Construction of Hall with Geodesic Aluminium Dome Roof at Arthuna.xlsx
   - Items: Schedule data successfully imported

2. **ESTIMATE COMMERCIAL COMPLEX FOR PANCHAYAT SAMITI GIRWA.eproj** ✓
   - Source: ESTIMATE COMMERCIAL COMPLEX FOR PANCHAYAT SAMITI GIRWA.xlsx
   - Items: 148 schedule items successfully imported

3. **RCC-20-40 Construction of Hall with Geodesic Aluminium Dome Roof at Arthuna.eproj** ✓
   - Source: RCC-20-40 Construction of Hall with Geodesic Aluminium Dome Roof at Arthuna.xlsx
   - Items: Schedule data successfully imported

## File Format
The `.eproj` files are SQLite databases compatible with GEstimator software and contain:
- Project metadata (name, version)
- Schedule items (code, description, unit, rate, quantity)
- Complete database schema for resources, measurements, and analysis

## How to Use in Windows

### Option 1: Using the Batch File (Recommended)
1. Double-click `CONVERT_PROJECTS.bat`
2. The script will:
   - Check if Python is installed
   - Install required dependencies if needed
   - Convert all Excel files in `Attached_Assets/PROJECTS`
   - Display conversion results

### Option 2: Using Python Directly
```cmd
python convert_attached_projects.py
```

### Option 3: Opening the .eproj Files
The `.eproj` files are located in `Attached_Assets/PROJECTS/` and can be:
- Opened directly in GEstimator software
- Copied to your GEstimator projects folder
- Shared with other users

## Requirements
- Python 3.7 or later
- openpyxl package (automatically installed by the batch script)

## File Structure
```
Attached_Assets/PROJECTS/
├── 20-40 Construction of Hall with Geodesic Aluminium Dome Roof at Arthuna.xlsx
├── 20-40 Construction of Hall with Geodesic Aluminium Dome Roof at Arthuna.eproj  ← Converted
├── ESTIMATE COMMERCIAL COMPLEX FOR PANCHAYAT SAMITI GIRWA.xlsx
├── ESTIMATE COMMERCIAL COMPLEX FOR PANCHAYAT SAMITI GIRWA.eproj  ← Converted
├── RCC-20-40 Construction of Hall with Geodesic Aluminium Dome Roof at Arthuna.xlsx
└── RCC-20-40 Construction of Hall with Geodesic Aluminium Dome Roof at Arthuna.eproj  ← Converted
```

## What the Converter Does
1. Scans `Attached_Assets/PROJECTS` for all `.xls` and `.xlsx` files
2. Parses each Excel file to extract schedule items
3. Creates a new `.eproj` file (SQLite database) with GEstimator schema
4. Imports all schedule data (code, description, unit, rate, quantity)
5. Saves the `.eproj` file in the same directory as the source Excel file

## Conversion Details
- The converter automatically detects schedule sheets in Excel files
- Identifies header rows containing columns like "S.No", "Description", "Qty", etc.
- Extracts all schedule items and their properties
- Handles duplicate codes and invalid data gracefully
- Creates Windows-compatible `.eproj` files

## Verification
All `.eproj` files have been verified to contain:
- Correct SQLite database structure
- Project metadata matching the source file name
- Complete schedule data from Excel files
- Proper GEstimator file version (GESTIMATOR_FILE_REFERENCE_VER_2)

## Notes
- Existing `.eproj` files are not overwritten (conversion is skipped)
- The original Excel files remain unchanged
- All `.eproj` files are ready to be opened in GEstimator on Windows
