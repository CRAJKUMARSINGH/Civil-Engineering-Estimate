# Dynamic Excel Template Processor - Developer Guide

## Architecture Overview

The Dynamic Excel Template Processor is built with a modular architecture consisting of six core components:

```
┌─────────────────────────────────────────────────────────────┐
│                   Enhanced GEstimator App                    │
│                      (main_app.py)                          │
└───────────┬─────────────────────────────────────┬───────────┘
            │                                     │
            ▼                                     ▼
┌───────────────────────┐           ┌───────────────────────┐
│  Excel Template       │           │  Hot Reload Manager   │
│  Importer             │           │  (hot_reload.py)      │
│  (import_templates.py)│           └───────────────────────┘
└───────────┬───────────┘                       │
            │                                   │
            ▼                                   ▼
┌───────────────────────┐           ┌───────────────────────┐
│  Formula Dependency   │           │  File System Watcher  │
│  Engine               │           │  (watchdog)           │
│  (template_engine.py) │           └───────────────────────┘
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Dynamic Template     │
│  Renderer             │
│  (dynamic_renderer.py)│
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  GEstimator Adapter   │
│  (gestimator_         │
│   integration.py)     │
└───────────────────────┘
```

## Core Modules

### 1. Excel Template Importer (`import_templates.py`)

**Purpose**: Discovers and loads Excel templates from the file system.

**Key Classes**:
- `ExcelFileMetadata`: Dataclass storing template metadata
- `ExcelTemplateImporter`: Main importer class

**API**:
```python
from import_templates import ExcelTemplateImporter

# Initialize
importer = ExcelTemplateImporter(assets_path="Attached_Assets")

# Scan for templates
templates = importer.scan_for_templates()

# Access template registry
template = importer.templates['template_name']

# Reload specific template
importer.reload_template('/path/to/template.xlsx')
```

**Extension Points**:
- Override `_extract_metadata()` for custom metadata extraction
- Override `_check_for_formulas_xlsx()` for custom formula detection
- Add support for additional file formats

### 2. Formula Dependency Engine (`template_engine.py`)

**Purpose**: Parses formulas and manages calculation dependencies using graph analysis.

**Key Classes**:
- `FormulaDependencyEngine`: Main engine class

**API**:
```python
from template_engine import FormulaDependencyEngine
import openpyxl

# Initialize
engine = FormulaDependencyEngine()

# Parse workbook
wb = openpyxl.load_workbook('template.xlsx', data_only=False)
graph = engine.parse_workbook_formulas(wb)

# Get execution order
execution_order = engine.calculate_execution_order()

# Query dependencies
dependents = engine.get_dependents('Sheet1!A1')
dependencies = engine.get_dependencies('Sheet1!B1')
```

**Algorithms**:
- **Dependency Extraction**: Regex-based cell reference parsing
- **Graph Construction**: NetworkX directed graph
- **Execution Order**: Topological sorting
- **Circular Dependencies**: Strongly connected components analysis

**Extension Points**:
- Override `_extract_dependencies()` for custom formula parsing
- Override `_handle_circular_dependencies()` for custom cycle handling
- Add support for external references

### 3. Dynamic Template Renderer (`dynamic_renderer.py`)

**Purpose**: Analyzes template structure and identifies input/output cells.

**Key Classes**:
- `TemplateConfig`: Configuration for cell identification
- `DynamicTemplateRenderer`: Main renderer class

**API**:
```python
from dynamic_renderer import DynamicTemplateRenderer, TemplateConfig

# Initialize
renderer = DynamicTemplateRenderer(template_engine)

# Analyze template
structure = renderer.analyze_template_structure(workbook)

# Access results
input_fields = structure['input_fields']
output_fields = structure['output_fields']
formulas = structure['formulas']

# Query specific sheet
input_cells = renderer.get_input_cells_for_sheet('Input', structure)
```

**Cell Detection Logic**:
```python
# Input cells detected by:
# 1. Fill color: FFFF00 (yellow)
# 2. Value prefix: IN_
# 3. Named range pattern: INPUT_*

# Output cells detected by:
# 1. Fill color: 90EE90 (light green)
# 2. Value prefix: OUT_
# 3. Named range pattern: OUTPUT_*
```

**Extension Points**:
- Modify `TemplateConfig` for custom indicators
- Override `_is_input_cell()` for custom input detection
- Override `_get_validation_rules()` for custom validation extraction

### 4. Hot Reload Manager (`hot_reload.py`)

**Purpose**: Watches file system and triggers template reloading.

**Key Classes**:
- `TemplateReloadHandler`: File system event handler
- `HotReloadManager`: Main manager class

**API**:
```python
from hot_reload import HotReloadManager

# Initialize
hot_reload = HotReloadManager(template_manager, watch_path="Attached_Assets")

# Register callback
def on_template_change(filepath):
    print(f"Template changed: {filepath}")

hot_reload.register_callback(on_template_change)

# Start/stop watching
hot_reload.start_watching()
hot_reload.stop_watching()

# Context manager support
with HotReloadManager(template_manager) as hr:
    # Watching is active
    pass
# Automatically stopped
```

**Event Handling**:
- `on_modified`: Triggered when template file is modified
- `on_created`: Triggered when new template file is created
- Debouncing: 2-second delay to avoid multiple triggers

**Extension Points**:
- Override `TemplateReloadHandler` for custom event handling
- Modify debounce timing in `on_modified()`
- Add support for file deletion events

### 5. GEstimator Adapter (`gestimator_integration.py`)

**Purpose**: Converts template data to GEstimator format.

**Key Classes**:
- `GEstimatorAdapter`: Main adapter class

**API**:
```python
from gestimator_integration import GEstimatorAdapter

# Initialize
adapter = GEstimatorAdapter(template_engine)

# Convert template
gestimator_data = adapter.convert_to_gestimator_format(template_structure)

# Access results
schedule_items = gestimator_data['schedule_items']
metadata = gestimator_data['template_metadata']

# Create configuration
config_path = adapter.create_config_file('template_name', mapping_config)

# Load configuration
config = adapter.load_config_file('template_name')
```

**Schedule Item Format**:
```python
{
    'Code': str,
    'Description': str,
    'Unit': str,
    'Rate': float,
    'Qty': float,
    'Amount': float,
    'Remarks': str
}
```

**Extension Points**:
- Override `_map_to_schedule_item()` for custom mapping logic
- Override extraction methods (`_extract_code()`, etc.) for custom field extraction
- Add support for additional GEstimator fields

### 6. Enhanced GEstimator Application (`main_app.py`)

**Purpose**: Main application orchestrating all components.

**Key Classes**:
- `EnhancedGEstimatorApp`: Main application class

**API**:
```python
from main_app import EnhancedGEstimatorApp

# Initialize
app = EnhancedGEstimatorApp(config_path="config/app_config.json")

# Start hot reload
app.start_hot_reload()

# List templates
templates = app.list_templates()

# Get template info
info = app.get_template_info('template_name')

# Process user input
inputs = {
    'Input!B5': 100,
    'Input!B6': 50
}
results = app.process_user_input('template_name', inputs)

# Shutdown
app.shutdown()
```

## Data Flow

### Template Loading Flow
1. `ExcelTemplateImporter.scan_for_templates()` discovers files
2. `_extract_metadata()` extracts file information
3. `FormulaDependencyEngine.parse_workbook_formulas()` builds dependency graph
4. `DynamicTemplateRenderer.analyze_template_structure()` identifies inputs/outputs
5. `GEstimatorAdapter.convert_to_gestimator_format()` converts to GEstimator format

### User Input Processing Flow
1. User provides input values via API
2. `process_user_input()` validates template exists
3. Workbook is loaded with `openpyxl`
4. Input cells are updated with new values
5. `calculate_execution_order()` determines calculation sequence
6. Formulas are evaluated in order (simplified in current implementation)
7. `_extract_results()` retrieves output values
8. Results are returned to user

## Configuration

### Application Configuration (`config/app_config.json`)
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

## Extending the System

### Adding Custom Cell Indicators

```python
# Modify TemplateConfig in dynamic_renderer.py
class TemplateConfig:
    INPUT_INDICATORS = {
        'fill_color': 'FFFF00',
        'prefix': 'IN_',
        'named_range_pattern': r'INPUT_.*',
        'custom_indicator': 'YOUR_PATTERN'  # Add custom
    }
```

### Adding Custom Formula Functions

```python
# Extend FormulaDependencyEngine
class CustomFormulaDependencyEngine(FormulaDependencyEngine):
    def _extract_dependencies(self, formula, current_sheet):
        # Call parent implementation
        deps = super()._extract_dependencies(formula, current_sheet)
        
        # Add custom logic
        # ... your code here ...
        
        return deps
```

### Adding Custom Template Processors

```python
# Create custom processor
class CustomTemplateProcessor:
    def __init__(self, template_engine):
        self.template_engine = template_engine
    
    def process(self, workbook):
        # Your custom processing logic
        pass

# Register with main app
app = EnhancedGEstimatorApp()
app.custom_processor = CustomTemplateProcessor(app.template_engine)
```

## Testing

### Unit Testing Example
```python
import unittest
from import_templates import ExcelTemplateImporter

class TestTemplateImporter(unittest.TestCase):
    def setUp(self):
        self.importer = ExcelTemplateImporter('test_assets')
    
    def test_scan_for_templates(self):
        templates = self.importer.scan_for_templates()
        self.assertGreater(len(templates), 0)
    
    def test_metadata_extraction(self):
        templates = self.importer.scan_for_templates()
        template = templates[0]
        self.assertIsNotNone(template.filename)
        self.assertIsNotNone(template.sheet_count)
```

### Integration Testing Example
```python
def test_end_to_end():
    app = EnhancedGEstimatorApp()
    
    # Test template loading
    templates = app.list_templates()
    assert len(templates) > 0
    
    # Test input processing
    inputs = {'Input!B5': 100}
    results = app.process_user_input(templates[0], inputs)
    assert results['success'] == True
```

## Performance Considerations

### Template Loading
- Templates are loaded once at startup
- Metadata is cached in memory
- Workbooks are closed after processing to free memory

### Formula Parsing
- Dependency graph is built once per template
- Topological sort is O(V + E) where V=cells, E=dependencies
- Circular dependency detection uses Tarjan's algorithm

### Hot Reload
- File system watching runs in background thread
- Debouncing prevents multiple reloads
- Only modified templates are reloaded

## Logging

### Log Levels
- **DEBUG**: Cell updates, dependency edges, formula evaluations
- **INFO**: Template loaded, hot reload triggered, calculation completed
- **WARNING**: Circular dependency detected, validation rule missing
- **ERROR**: File read failed, formula parsing failed, calculation error

### Log Format
```
2025-10-31 10:30:00 - module_name - LEVEL - message
```

### Accessing Logs
```python
import logging

logger = logging.getLogger('import_templates')
logger.info("Custom log message")
```

## Dependencies

### Required Packages
```
openpyxl>=3.1.0        # Excel .xlsx file handling
xlrd>=2.0.1            # Excel .xls file handling
networkx>=3.0          # Dependency graph management
watchdog>=3.0.0        # File system monitoring
```

### Installing Dependencies
```bash
pip install -r requirements.txt
```

## Troubleshooting

### Common Issues

**Import Errors**
- Ensure all dependencies are installed
- Check Python version compatibility (3.7+)

**Template Not Loading**
- Verify file permissions
- Check file format (.xlsx or .xls)
- Review logs for specific errors

**Formula Parsing Failures**
- Check for unsupported formula syntax
- Verify cell references are valid
- Look for circular dependencies

**Hot Reload Not Working**
- Ensure watchdog is installed
- Check file system permissions
- Verify `enable_hot_reload` in config

## Contributing

### Code Style
- Follow PEP 8 guidelines
- Use type hints where appropriate
- Document all public methods
- Add docstrings to classes and functions

### Adding Features
1. Create feature branch
2. Implement feature with tests
3. Update documentation
4. Submit pull request

## API Reference

See individual module docstrings for detailed API documentation:
- `import_templates.py`: Template discovery and loading
- `template_engine.py`: Formula parsing and dependency management
- `dynamic_renderer.py`: Template structure analysis
- `hot_reload.py`: File system watching
- `gestimator_integration.py`: GEstimator format conversion
- `main_app.py`: Main application orchestration
