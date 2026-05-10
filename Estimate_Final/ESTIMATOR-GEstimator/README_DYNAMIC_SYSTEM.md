# Dynamic Excel Template Processing System

Welcome to the Dynamic Excel Template Processing System for GEstimator!

## Quick Start

1. **Run the demonstration**:
   ```bash
   python demonstrate_system.py
   ```

2. **List available templates**:
   ```bash
   python dynamic_template_cli.py list
   ```

3. **Get template information**:
   ```bash
   python dynamic_template_cli.py info example_dynamic_template
   ```

4. **Process a template**:
   ```bash
   python dynamic_template_cli.py process example_dynamic_template -i example_inputs.json
   ```

## System Overview

This system allows you to:

- Automatically discover Excel templates in the `Attached_Assets` directory
- Parse formulas and build dependency graphs
- Identify input and output cells based on formatting conventions
- Process templates with user inputs
- Convert template outputs to GEstimator format
- Hot-reload templates when they change

## Key Components

- `import_templates.py` - Discovers and loads Excel templates
- `template_engine.py` - Parses formulas and manages dependencies
- `dynamic_renderer.py` - Analyzes template structure
- `hot_reload.py` - Monitors templates for changes
- `gestimator_integration.py` - Converts to GEstimator format
- `main_app.py` - Main application orchestrator
- `dynamic_template_cli.py` - Command-line interface

## Template Conventions

### Input Cells
- **Fill Color**: Yellow (`FFFF00`)
- **Prefix**: `IN_` in cell value
- **Named Range**: Pattern `INPUT_*`

### Output Cells
- **Fill Color**: Light Green (`90EE90`)
- **Prefix**: `OUT_` in cell value
- **Named Range**: Pattern `OUTPUT_*`

## Documentation

- [DYNAMIC_TEMPLATE_GUIDE.md](DYNAMIC_TEMPLATE_GUIDE.md) - Complete usage guide
- [DYNAMIC_EXCEL_IMPLEMENTATION_SUMMARY.md](DYNAMIC_EXCEL_IMPLEMENTATION_SUMMARY.md) - Implementation details

## Example Files

- `Attached_Assets/example_dynamic_template.xlsx` - Example template
- `example_inputs.json` - Sample input data
- `Attached_Assets/example_template_config.json` - Template configuration example

## Testing

Run the test suite:
```bash
python test_dynamic_system.py
```