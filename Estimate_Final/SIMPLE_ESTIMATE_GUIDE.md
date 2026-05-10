# Simple One-Line Estimate Creator

## Overview
Quick tool to create professional construction estimates with a single measurement line.

## Features
✅ One-line measurement entry
✅ Auto-calculates quantity (Nos × L × B × H)
✅ Professional 3-sheet format (Technical Report, Measurements, Abstract)
✅ PWD-style formatting
✅ Instant Excel generation

---

## Quick Start

### Method 1: Pre-built Examples
```bash
python create_simple_estimate.py
```

Creates 4 example estimates:
1. Excavation Work
2. Concrete Work
3. Plastering Work
4. Brick Work

### Method 2: Interactive Mode
```bash
python quick_estimate.py
```

Follow prompts to create custom estimate.

### Method 3: Python Code
```python
from create_simple_estimate import create_simple_estimate

result = create_simple_estimate(
    work_name="Construction of Residential Building",
    item_description="Earth work in excavation",
    nos=1,
    length=25.0,
    breadth=20.0,
    height=1.5,
    unit="Cum",
    rate=92.00
)

print(f"Created: {result['file_name']}")
print(f"Amount: ₹{result['amount']:,.2f}")
```

---

## Estimate Structure

### Sheet 1: Technical Report
- Name of Work
- Location
- Client
- Engineer
- Date

### Sheet 2: Measurements
| S.N. | Particulars | Nos | Length | Breadth | Height | Qty | Unit |
|------|-------------|-----|--------|---------|--------|-----|------|
| 1    | Item desc   | 1   | 25.0   | 20.0    | 1.5    | 750 | Cum  |

### Sheet 3: Abstract
| S.N. | Description | Quantity | Unit | Rate (₹) | Amount (₹) |
|------|-------------|----------|------|----------|------------|
| 1    | Item desc   | 750.000  | Cum  | 92.00    | 69,000.00  |

---

## Calculation Logic

### Volume (3D):
```
Quantity = Nos × Length × Breadth × Height
```

### Area (2D):
```
Quantity = Nos × Length × Breadth
(Height = 0)
```

### Length (1D):
```
Quantity = Nos × Length
(Breadth = 0, Height = 0)
```

### Count:
```
Quantity = Nos
(Length = 0, Breadth = 0, Height = 0)
```

---

## Common Units

| Unit | Description | Example Use |
|------|-------------|-------------|
| Cum  | Cubic meter | Excavation, Concrete |
| Sqm  | Square meter | Plastering, Flooring |
| RM   | Running meter | Walls, Pipes |
| Nos  | Numbers | Doors, Windows |
| Kg   | Kilogram | Steel, Paint |
| MT   | Metric ton | Steel bars |
| LS   | Lump sum | Complete work |

---

## Example Use Cases

### 1. Excavation Work
```python
create_simple_estimate(
    work_name="Foundation Excavation",
    item_description="Earth work in excavation",
    nos=1, length=25.0, breadth=20.0, height=1.5,
    unit="Cum", rate=92.00
)
# Quantity: 750 Cum
# Amount: ₹69,000
```

### 2. Concrete Work
```python
create_simple_estimate(
    work_name="RCC Slab",
    item_description="M-30 grade concrete",
    nos=1, length=15.0, breadth=7.5, height=0.15,
    unit="Cum", rate=5850.00
)
# Quantity: 16.875 Cum
# Amount: ₹98,718.75
```

### 3. Plastering
```python
create_simple_estimate(
    work_name="Wall Plastering",
    item_description="12mm cement plaster",
    nos=2, length=30.0, breadth=3.5, height=0.0,
    unit="Sqm", rate=185.00
)
# Quantity: 210 Sqm
# Amount: ₹38,850
```

### 4. Brick Work
```python
create_simple_estimate(
    work_name="Boundary Wall",
    item_description="Brick work in CM (1:6)",
    nos=1, length=50.0, breadth=0.23, height=2.5,
    unit="Cum", rate=4850.00
)
# Quantity: 28.75 Cum
# Amount: ₹139,437.50
```

---

## Output Files

Files saved to: `generated_estimates/`

Format: `Simple_Estimate_YYYYMMDD_HHMMSS.xlsx`

Example: `Simple_Estimate_20251117_025734.xlsx`

---

## Customization

### Change Colors
Edit in `create_simple_estimate.py`:
```python
header_fill = PatternFill(start_color="4A90E2", ...)  # Blue header
```

### Change Fonts
```python
header_font = Font(bold=True, color="FFFFFF", size=12)
```

### Add More Sheets
```python
ws_new = wb.create_sheet("New Sheet")
```

---

## Integration with Main App

Can be integrated into Streamlit app:

```python
# In streamlit_app.py
def show_quick_estimate():
    st.title("Quick Estimate Creator")
    
    work_name = st.text_input("Name of Work")
    item_desc = st.text_input("Item Description")
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        nos = st.number_input("Nos", value=1)
    with col2:
        length = st.number_input("Length", value=0.0)
    with col3:
        breadth = st.number_input("Breadth", value=0.0)
    with col4:
        height = st.number_input("Height", value=0.0)
    
    if st.button("Create Estimate"):
        result = create_simple_estimate(...)
        st.success(f"Created: {result['file_name']}")
```

---

## Tips

1. **For Area calculations:** Set height = 0
2. **For Length calculations:** Set breadth = 0, height = 0
3. **For Count:** Set all dimensions = 0
4. **Multiple items:** Run script multiple times or use batch mode

---

## Troubleshooting

**Issue:** File not created
- Check `generated_estimates/` folder exists
- Verify write permissions

**Issue:** Wrong quantity
- Check calculation logic
- Verify Nos, L, B, H values

**Issue:** Excel won't open
- Install openpyxl: `pip install openpyxl`
- Check Excel version compatibility

---

## Future Enhancements

Potential additions:
- [ ] Multiple items in one estimate
- [ ] Template selection
- [ ] Rate database integration
- [ ] PDF export
- [ ] Email sending
- [ ] Cloud storage

---

## Files

- `create_simple_estimate.py` - Main creator with examples
- `quick_estimate.py` - Interactive CLI version
- `SIMPLE_ESTIMATE_GUIDE.md` - This guide

---

## Requirements

```
openpyxl>=3.0.0
```

Install:
```bash
pip install openpyxl
```

---

**Created:** November 2025
**Version:** 1.0
**Status:** ✅ Ready to use
