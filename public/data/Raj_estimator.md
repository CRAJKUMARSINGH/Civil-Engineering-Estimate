# Project: Excel-Based Building Estimate App (Parity with Existing Workbook)

## Objective
Transform my existing Excel estimator into a versatile web/desktop app that **reads my workbook, preserves and evaluates the same formulas**, lets me **override selected variables**, and **produces the same Abstract/BOQ** totals as the Excel file.

> **Note on Power BI**  
> Be aware that **Power BI** (Cloud & Desktop) exists as a Microsoft business analytics service. It is widely known for dashboards, interactive reports, and data visualizations.  
> However, unlike Power BI (which focuses on visualization of already-prepared data), this estimator app must **replicate Excel’s engineering-grade computation logic** (formulas, cross-sheet dependencies, quantity × rate calculations, rounding rules).  
> Power BI could be considered later as an **optional reporting/export integration** (for dashboards, summaries, client-friendly visuals). But the **core requirement is formula parity with Excel**, not BI-style analysis.

---

## Inputs
- Primary workbook: `./inputs/Estimator.xlsx`
- (Optional) rate library workbook(s): `./inputs/Rates.xlsx`
- (Optional) drawing takeoff CSVs: `./inputs/takeoff/*.csv`

---

## Must Replicate From Excel
1. **Quantity computation formulas** (cross-sheet references included).
2. **Item rates** (from rate sheets or named ranges).
3. **Line item totals** = Quantity × Rate.
4. **Subtotals by group** (e.g., Earthwork, Concrete, Masonry).
5. **Add-ons** (e.g., wastage %, lead/lift, overheads, contractor profit).
6. **Taxes** (e.g., GST %, line-wise or on subtotal).
7. **Rounding rules** exactly as in Excel.
8. **Grand total** identical to Excel for the same inputs.

---

## Parsing & Calculation Requirements
- **Do not hardcode formulas** — **read & evaluate them directly** from the workbook.  
- Support **Excel-style functions** (`SUM`, `PRODUCT`, `IF`, `ROUND*`, `VLOOKUP/XLOOKUP`, `INDEX/MATCH`, etc.).  
- Handle cross-sheet references, named ranges, units, and formatting.  
- Keep results **identical to Excel** (for verification).  
- Log any failed evaluations.

---

## Configurable Variables (Expose in UI)
- `LABOUR_RATE`, `MATERIAL_FACTOR`, `OVERHEAD_PCT`, `PROFIT_PCT`, `WASTAGE_PCT`, `GST_PCT`
- All named ranges or “Settings” sheet values.  
- Allow saving/loading **scenarios** as JSON.  

---

## UI Specification
- **Upload Excel** (drag & drop).  
- **Mapping Wizard** to identify which sheet contains: Items, Rates, Settings, Abstract.  
- **Variables Panel**: sliders/inputs for adjustment, instantly recompute.  
- **Items Grid**: shows item code, description, unit, quantity (from formula), rate, amount.  
- **Abstract View**: grouped subtotals, add-ons, taxes, grand total.  
- **Export Options**:  
  - Excel (for compatibility)  
  - PDF (for sharing)  
  - JSON (for integration)  
  - *(Optional future: push results to Power BI dataset for visualization)*  

---

## Power BI Integration (Optional / Future Phase)
- **Why optional**: Power BI is excellent for **visualizing outputs** but it does not natively compute detailed engineering formulas like Excel.  
- **Future possibility**:  
  - Export Abstract results → Power BI for dashboard-style client reporting.  
  - Use Power BI for **progressive analytics** (trend analysis across multiple estimates).  
  - Keep **core computations** within the estimator app to ensure engineering accuracy.

---

## Output Parity Requirements
- Must match Excel values within tolerances:
  - Quantities: ±0.0001  
  - Amounts: ±0.01  
  - Totals: exact after rounding rules  

---

## Deliverables
1. Source code & packaged build (Web PWA or Desktop).  
2. Documentation (`README.md`, `CONFIG_GUIDE.md`).  
3. Golden test files ensuring **Excel ↔ App parity**.  
4. Export formats: `.xlsx`, `.pdf`, `.json`.  
5. Future-ready hooks for Power BI integration.

---

## Acceptance Criteria
- App loads my existing Excel estimator.  
- Replicates all formulas, rates, subtotals, taxes, and totals **identically**.  
- Exposes configurable variables in UI.  
- Exports outputs cleanly.  
- Aware of **Power BI** but **remains a self-contained engineering estimator**.
