# Dynamic Excel Template Processing System

This guide explains how to use the dynamic Excel template processing system for GEstimator.

## Overview

The dynamic template system allows you to:

1. Automatically discover Excel templates in the `Attached_Assets` directory
2. Parse formulas and build dependency graphs
3. Identify input and output cells based on formatting conventions
4. Process templates with user inputs
5. Convert template outputs to GEstimator format
6. Hot-reload templates when they change

## System Components

### 1. Excel Template Importer (`import_templates.py`)
- Scans for Excel files (.xls and .xlsx) in the assets directory
- Extracts metadata including sheet count, formula presence, and named ranges
- Maintains a registry of discovered templates

### 2. Formula Dependency Engine (`template_engine.py`)
- Parses Excel formulas and extracts cell dependencies
- Builds a dependency graph using NetworkX
- Determines calculation order using topological sorting
- Handles circular dependencies

### 3. Dynamic Template Renderer (`dynamic_renderer.py`)
- Analyzes template structure to identify input/output cells
- Detects cells based on fill colors, prefixes, and named ranges
- Extracts data validation rules
- Creates structured representations for UI rendering

### 4. Hot Reload Manager (`hot_reload.py`)
- Monitors the assets directory for file changes
- Automatically reloads templates when they are modified
- Supports file creation and modification events

### 5. GEstimator Adapter (`gestimator_integration.py`)
- Converts template output data to GEstimator-compatible format
- Maps cell data to schedule items
- Creates and loads configuration files

### 6. Main Application (`main_app.py`)
- Orchestrates all components
- Manages template initialization and processing
- Provides high-level API for template operations

## Template Conventions

### Input Cell Identification
Input cells are identified by:
- **Fill Color**: Yellow (`FFFF00`)
- **Prefix**: `IN_` in cell value
- **Named Range**: Pattern `INPUT_*`

### Output Cell Identification
Output cells are identified by:
- **Fill Color**: Light Green (`90EE90`)
- **Prefix**: `OUT_` in cell value
- **Named Range**: Pattern `OUTPUT_*`

### Standard Sheet Names
- `Input`: For user input cells
- `Calc`: For calculation formulas
- `BOM`: For bill of materials
- `Summary`: For final outputs

## Usage Examples

### Command Line Interface

```bash
# List all available templates
python dynamic_template_cli.py list

# Get template information
python dynamic_template_cli.py info template_name

# Process a template with inputs
python dynamic_template_cli.py process template_name -i inputs.json -o results.json

# Convert template to GEstimator format
python dynamic_template_cli.py convert template_name -o gestimator_output.json
```

### Using the Python API

```python
from main_app import EnhancedGEstimatorApp

# Initialize the application
app = EnhancedGEstimatorApp()

# List available templates
templates = app.list_templates()
print(templates)

# Get template information
info = app.get_template_info("my_template")
print(info)

# Process template with inputs
inputs = {
    "Input!B5": 10.5,
    "Input!B6": 8.2
}
result = app.process_user_input("my_template", inputs)
print(result)

# Convert to GEstimator format
if "my_template" in app.template_structures:
    structure = app.template_structures["my_template"]
    gestimator_data = app.gestimator_adapter.convert_to_gestimator_format(structure)
    print(gestimator_data)
```

## Configuration

The system can be configured using `config/app_config.json`:

```json
{
  "assets_path": "Attached_Assets",
  "enable_hot_reload": true,
  "hot_reload_debounce_seconds": 2,
  "max_formula_depth": 100,
  "calculation_timeout_seconds": 30,
  "log_level": "INFO",
  "log_file": "logs/gestimator.log",
  "supported_formats": [".xls", ".xlsx"],
  "input_indicators": {
    "fill_colors": ["FFFF00"],
    "prefixes": ["IN_"],
    "named_range_patterns": ["INPUT_.*"]
  },
  "output_indicators": {
    "fill_colors": ["90EE90"],
    "prefixes": ["OUT_"],
    "named_range_patterns": ["OUTPUT_.*"]
  }
}
```

## Template Configuration

Each template can have a configuration file in `Attached_Assets/template_name_config.json`:

```json
{
  "template_name": "example_estimation_template",
  "input_mapping": {
    "length": "Input!B5",
    "width": "Input!B6",
    "height": "Input!B7"
  },
  "output_mapping": {
    "total_volume": "Calculation!D10",
    "total_cost": "Summary!F20"
  },
  "calculation_settings": {
    "precision": 2,
    "currency": "INR",
    "unit_system": "metric"
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

## Testing

Run the test suite to verify the system is working:

```bash
python test_dynamic_system.py
```

## Troubleshooting

### Common Issues

1. **Templates not detected**: Ensure Excel files are in the `Attached_Assets` directory
2. **Formulas not parsed**: Check that the Excel file contains actual formulas (not just values)
3. **Input/Output cells not identified**: Verify cell formatting follows the conventions
4. **Hot reload not working**: Check that file system monitoring is supported on your platform

### Logging

Check the `logs/gestimator.log` file for detailed information about system operations and errors.

## Extending the System

### Adding New Template Indicators

Modify the `TemplateConfig` class in `dynamic_renderer.py` to add new indicators for input/output cells.

### Custom Formula Evaluation

Implement a full formula evaluation engine in the `_evaluate_formula` method of `EnhancedGEstimatorApp` in `main_app.py`.

### Additional File Formats

Extend the `ExcelTemplateImporter` class to support additional Excel file formats.