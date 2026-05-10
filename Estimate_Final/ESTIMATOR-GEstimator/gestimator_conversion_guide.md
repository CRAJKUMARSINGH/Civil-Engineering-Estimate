# GEstimator Excel Conversion Guide

## Overview
This guide helps you convert your Excel estimation projects to a format compatible with GEstimator, an open-source civil estimation software.

## GEstimator Expected Format

### Schedule Items Import Format
GEstimator expects Excel files with the following column structure:

| Column | Description | Data Type | Required |
|--------|-------------|-----------|----------|
| Code | Item code/serial number | Text/Number | Yes |
| Description | Detailed description of work item | Text | Yes |
| Unit | Unit of measurement (e.g., Cum, Sqm, Nos) | Text | No |
| Rate | Rate per unit | Number | No |
| Qty | Quantity | Number | No |
| Amount | Total amount (Rate × Qty) | Number | No |
| Remarks | Additional notes | Text | No |

### Example Format:
```
Code | Description | Unit | Rate | Qty | Amount | Remarks
1    | Earth work excavation | Cum | 178 | 720 | 128160 | All kinds of soil
2    | Concrete work M25 | Cum | 5003 | 34.8 | 174104 | Including curing
```

## Your Project Analysis

### Original File Structure:
- **File**: `1-20-40 Construction of Hall with Geodesic Aluminium Dome Roof at Arthuna.xls`
- **Sheets**: 
  - `gen-abstract`: General abstract of cost
  - `GF1_ABS`: Ground floor abstract (Schedule data)
  - `GF1_MES`: Ground floor measurements (Measurement details)

### Conversion Results:
- **Converted to**: `geodesic_dome_gestimator.xlsx`
- **Schedule items extracted**: 44 items
- **Data quality**: All rows have Code and Description populated

## How to Use in GEstimator

### Import Steps:
1. Download and install GEstimator from: https://github.com/manuvarkey/GEstimator/releases
2. Open GEstimator
3. Go to **Schedule Items** tab
4. Click **Import from Excel** button
5. Select your converted file: `geodesic_dome_gestimator.xlsx`
6. Choose the **Schedule** sheet
7. Set column mappings if needed
8. Click **Import**

### Post-Import Tasks:
1. Review imported items in Schedule Items tab
2. Add/edit Unit information where missing
3. Verify Rate and Quantity values
4. Add Analysis data for detailed rate analysis
5. Import measurement details if available

## Conversion Tools Provided

### 1. Primary Converter (`create_gestimator_converter.py`)
```bash
# Convert your Excel file
python create_gestimator_converter.py input_file.xls -o output_file.xlsx

# Analyze file structure only
python create_gestimator_converter.py input_file.xls --analyze
```

### 2. Batch Converter (see below)
For converting multiple Excel files at once.

### 3. Verification Tool (`verify_conversion.py`)
```bash
python verify_conversion.py
```

## Tips for Better Conversion

### Data Preparation:
1. **Clean Headers**: Ensure your Excel file has clear column headers
2. **Consistent Format**: Keep data format consistent across rows
3. **Remove Empty Rows**: Clean up empty rows between data
4. **Numeric Data**: Ensure Rate, Qty, Amount are properly formatted as numbers

### Common Issues:
1. **Mixed Data Types**: Ensure numeric columns contain only numbers
2. **Merged Cells**: Avoid merged cells in data area
3. **Special Characters**: Some special characters may cause import issues
4. **Large Descriptions**: Very long descriptions may need truncation

## Project Structure Mapping

### Your Project → GEstimator
```
Original Sheets:
├── gen-abstract → Summary information
├── GF1_ABS → Schedule Items (main conversion target)
└── GF1_MES → Measurements (can be imported separately)

Converted Structure:
└── geodesic_dome_gestimator.xlsx
    ├── Schedule → All work items with codes, descriptions, rates
    └── [Future: Measurements sheet for detailed measurements]
```

## Advanced Features

### Rate Analysis:
- GEstimator supports detailed rate analysis
- You can break down each item into Materials, Labour, and Equipment
- Add overhead percentages, taxes, etc.

### Measurements:
- Import detailed measurements separately
- Link measurements to schedule items
- Calculate quantities automatically

### Export Options:
- Export to various formats
- Generate professional reports
- Print estimates and BOQs

## Troubleshooting

### Common Import Issues:
1. **File Format**: Ensure Excel file is .xlsx format
2. **Column Order**: Verify columns match expected format
3. **Data Types**: Check that numeric columns contain valid numbers
4. **Encoding**: Ensure text is properly encoded (UTF-8)

### Solutions:
1. Use the verification tool to check data quality
2. Manually edit problematic rows in Excel before import
3. Use the analyzer to understand your file structure
4. Contact GEstimator community for specific issues

## Next Steps

1. **Test Import**: Try importing the converted file into GEstimator
2. **Verify Data**: Check that all items imported correctly
3. **Add Missing Data**: Fill in any missing Units, Rates, or Quantities
4. **Create Templates**: Save successful formats as templates for future projects
5. **Explore Features**: Learn about GEstimator's advanced features like rate analysis

## Resources

- **GEstimator GitHub**: https://github.com/manuvarkey/GEstimator
- **Documentation**: https://manuvarkey.github.io/GEstimator
- **Community Forum**: https://github.com/manuvarkey/GEstimator/discussions
- **Video Tutorials**: Available on the project website

---

**Note**: This conversion tool is designed to work with most Excel estimation formats. If you encounter issues with your specific format, the tools can be customized to handle your data structure.