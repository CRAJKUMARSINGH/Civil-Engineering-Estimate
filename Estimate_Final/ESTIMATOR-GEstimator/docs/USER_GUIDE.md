# Dynamic Excel Template Processor - User Guide

## Overview

The Dynamic Excel Template Processor allows you to create Excel templates that are automatically discovered, analyzed, and processed by the GEstimator application. This guide explains how to create templates that work seamlessly with the system.

## Template Conventions

### Input Cells

Input cells are where users provide data. The system identifies input cells using these conventions:

#### 1. Yellow Fill Color
- Apply a **yellow background color** (RGB: FFFF00) to any cell you want to mark as an input
- This is the most visual and recommended method

#### 2. Cell Value Prefix
- Start the cell value with `IN_`
- Example: `IN_Length`, `IN_Width`, `IN_Cost`

#### 3. Named Ranges
- Create a named range starting with `INPUT_`
- Example: `INPUT_DIMENSIONS`, `INPUT_COSTS`

### Output Cells

Output cells display calculated results. The system identifies output cells using:

#### 1. Light Green Fill Color
- Apply a **light green background color** (RGB: 90EE90 or similar green shades)
- This visually distinguishes outputs from inputs

#### 2. Cell Value Prefix
- Start the cell value with `OUT_`
- Example: `OUT_Total`, `OUT_Result`

#### 3. Named Ranges
- Create a named range starting with `OUTPUT_`
- Example: `OUTPUT_TOTALS`, `OUTPUT_SUMMARY`

## Supported Formulas

The system preserves and tracks all Excel formulas. Supported formula patterns include:

### Basic Arithmetic
```excel
=A1 + B1
=A1 * B1 / C1
=SUM(A1:A10)
=AVERAGE(B1:B20)
```

### Cell References
```excel
=Sheet1!A1          # Reference to another sheet
='Sheet Name'!A1    # Sheet name with spaces
=$A$1               # Absolute reference
=A$1                # Mixed reference
```

### Complex Formulas
```excel
=IF(A1>100, A1*0.9, A1)
=VLOOKUP(A1, Table1, 2, FALSE)
=SUMIF(A:A, ">100", B:B)
```

### Nested Functions
```excel
=SUM(IF(A1:A10>0, A1:A10, 0))
=ROUND(SUM(A1:A10)/COUNT(A1:A10), 2)
```

## Template Structure

### Recommended Sheet Organization

1. **Input Sheet**
   - Contains all input cells (yellow background)
   - Organized in logical groups
   - Include labels and units

2. **Calculation Sheet**
   - Contains intermediate calculations
   - Formulas reference input sheet
   - Can be hidden from users

3. **Summary/Output Sheet**
   - Contains final results (green background)
   - References calculation sheet
   - Formatted for presentation

### Example Template Structure

```
MyEstimationTemplate.xlsx
├── Input
│   ├── B5: Length (yellow)
│   ├── B6: Width (yellow)
│   └── B7: Height (yellow)
├── Calculation
│   ├── D10: =Input!B5*Input!B6*Input!B7 (Volume)
│   └── D15: =D10*Input!B10 (Cost)
└── Summary
    ├── F20: =Calculation!D15 (green - Total Cost)
    └── F21: =F20/Calculation!D10 (green - Cost per Unit)
```

## Creating Your First Template

### Step 1: Design Your Template
1. Open Excel and create a new workbook
2. Plan your input fields, calculations, and outputs
3. Organize into logical sheets

### Step 2: Mark Input Cells
1. Select cells where users will enter data
2. Apply yellow fill color (Home → Fill Color → Yellow)
3. Add descriptive labels in adjacent cells

### Step 3: Create Formulas
1. Write formulas that reference your input cells
2. Use sheet references for clarity: `=Input!B5`
3. Test formulas with sample data

### Step 4: Mark Output Cells
1. Select cells with final results
2. Apply light green fill color
3. Format numbers appropriately (currency, decimals, etc.)

### Step 5: Save and Deploy
1. Save the file as `.xlsx` format
2. Place in the `Attached_Assets` directory
3. The system will automatically discover it on next startup

## Data Validation

You can add Excel data validation to input cells:

### Numeric Range
1. Select input cell
2. Data → Data Validation
3. Allow: Decimal
4. Minimum: 0, Maximum: 1000

### List of Values
1. Select input cell
2. Data → Data Validation
3. Allow: List
4. Source: Option1,Option2,Option3

The system will extract and respect these validation rules.

## Named Ranges

Named ranges make formulas more readable:

### Creating Named Ranges
1. Select cell or range
2. Formulas → Define Name
3. Name: `INPUT_LENGTH` or `OUTPUT_TOTAL`
4. Click OK

### Using Named Ranges
```excel
=INPUT_LENGTH * INPUT_WIDTH * INPUT_HEIGHT
=SUM(COST_MATERIALS, COST_LABOR)
```

## Best Practices

### 1. Use Descriptive Names
- Label cells clearly: "Length (meters)", "Cost per Unit (INR)"
- Use meaningful named ranges: `INPUT_DIMENSIONS`, not `Range1`

### 2. Organize Logically
- Group related inputs together
- Separate inputs, calculations, and outputs
- Use consistent formatting

### 3. Document Assumptions
- Add comments to complex formulas
- Include units in labels
- Document calculation methods

### 4. Test Thoroughly
- Test with various input values
- Verify formulas calculate correctly
- Check for circular references

### 5. Keep It Simple
- Avoid overly complex nested formulas
- Break complex calculations into steps
- Use intermediate calculation cells

## Configuration Files

You can create a configuration file for advanced template mapping:

### File Location
`Attached_Assets/your_template_name_config.json`

### Example Configuration
```json
{
  "template_name": "bridge_estimation",
  "input_mapping": {
    "length": "Input!B5",
    "width": "Input!B6",
    "height": "Input!B7"
  },
  "output_mapping": {
    "total_cost": "Summary!F20",
    "unit_cost": "Summary!F21"
  },
  "validation_rules": {
    "length": {
      "type": "decimal",
      "min": 0,
      "max": 1000,
      "required": true
    }
  }
}
```

## Troubleshooting

### Template Not Discovered
- Check file is in `Attached_Assets` directory
- Verify file extension is `.xlsx` or `.xls`
- Check application logs in `logs/gestimator.log`

### Formulas Not Working
- Ensure formulas use proper cell references
- Check for circular dependencies
- Verify sheet names match exactly

### Input/Output Cells Not Detected
- Verify fill colors are correct (FFFF00 for yellow, 90EE90 for green)
- Check cell prefixes are exact: `IN_` or `OUT_`
- Ensure named ranges follow pattern: `INPUT_*` or `OUTPUT_*`

### Hot Reload Not Working
- Check `enable_hot_reload` is `true` in config
- Verify file system permissions
- Check logs for error messages

## Examples

See the `Attached_Assets/example_template_config.json` for a complete example configuration.

## Support

For issues or questions:
1. Check the logs: `logs/gestimator.log`
2. Review the developer documentation
3. Verify your template follows the conventions in this guide
