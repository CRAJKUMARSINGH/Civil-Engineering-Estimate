# Design Document

## Overview

The Dynamic Excel Template Processor is a comprehensive system that extends GEstimator to handle Excel templates dynamically. The architecture consists of six core modules that work together to discover, analyze, process, and render Excel templates while preserving formulas and enabling hot reloading.

The system follows a modular design where each component has a single responsibility, making it maintainable and extensible. The architecture supports both legacy .xls and modern .xlsx formats, handles complex formula dependencies, and provides seamless integration with the existing GEstimator workflow.

## Architecture

### High-Level Architecture

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

### Data Flow

1. **Template Discovery**: Template Importer scans attached_assets directory
2. **Metadata Extraction**: Extract file metadata and formula presence
3. **Formula Parsing**: Formula Dependency Engine builds dependency graph
4. **Structure Analysis**: Dynamic Renderer identifies inputs/outputs
5. **User Interaction**: User provides inputs through UI
6. **Recalculation**: Formulas execute in topological order
7. **Result Extraction**: Outputs are extracted and formatted
8. **GEstimator Export**: Adapter converts to GEstimator format

## Components and Interfaces

### 1. Excel Template Importer

**Purpose**: Discovers and loads Excel templates from the file system

**Key Classes**:

```python
@dataclass
class ExcelFileMetadata:
    filename: str
    filepath: Path
    format: str  # '.xls' or '.xlsx'
    sheet_count: int
    last_modified: datetime
    file_size: int
    has_formulas: bool
    named_ranges: List[str]

class ExcelTemplateImporter:
    def __init__(self, assets_path: str = "attached_assets")
    def scan_for_templates(self) -> List[ExcelFileMetadata]
    def _extract_metadata(self, file_path: Path) -> ExcelFileMetadata
    def _check_for_formulas_xlsx(self, workbook) -> bool
    def _check_for_formulas_xls(self, workbook) -> bool
```

**Dependencies**:
- openpyxl: For .xlsx file handling
- xlrd: For .xls file handling
- pathlib: For file path operations

**Interface**:
- Input: Directory path containing Excel files
- Output: List of ExcelFileMetadata objects

### 2. Formula Dependency Engine

**Purpose**: Parses formulas and manages calculation dependencies

**Key Classes**:

```python
class FormulaDependencyEngine:
    def __init__(self)
    def parse_workbook_formulas(self, workbook) -> nx.DiGraph
    def _extract_dependencies(self, formula: str, current_sheet: str) -> List[str]
    def calculate_execution_order(self) -> List[str]
    def _handle_circular_dependencies(self) -> List[str]
```

**Dependencies**:
- networkx: For dependency graph management
- openpyxl.formula: For formula tokenization
- re: For regex pattern matching

**Interface**:
- Input: openpyxl Workbook object
- Output: Directed graph (nx.DiGraph) and execution order (List[str])

**Algorithm**:
1. Iterate through all sheets and cells
2. Identify formula cells (data_type == 'f')
3. Extract cell references using regex: `([\'\"]?(\w+)\1!)?([A-Z]+\d+)`
4. Build directed edges: dependency → dependent
5. Perform topological sort for execution order
6. Handle cycles using strongly connected components

### 3. Dynamic Template Renderer

**Purpose**: Analyzes template structure and identifies input/output cells

**Key Classes**:

```python
class TemplateConfig:
    INPUT_INDICATORS = {
        'fill_color': 'FFFF00',  # Yellow
        'prefix': 'IN_',
        'named_range_pattern': r'INPUT_.*'
    }
    OUTPUT_INDICATORS = {
        'fill_color': '90EE90',  # Light green
        'prefix': 'OUT_',
        'named_range_pattern': r'OUTPUT_.*'
    }

class DynamicTemplateRenderer:
    def __init__(self, template_engine)
    def analyze_template_structure(self, workbook) -> Dict[str, Any]
    def _analyze_sheet(self, sheet, sheet_name: str) -> Dict[str, Any]
    def _is_input_cell(self, cell) -> bool
    def _is_output_cell(self, cell) -> bool
    def _get_validation_rules(self, cell) -> Dict
```

**Dependencies**:
- openpyxl.styles: For cell formatting detection
- FormulaDependencyEngine: For formula tracking

**Interface**:
- Input: openpyxl Workbook object
- Output: Structured dictionary with sheets, inputs, outputs, formulas

**Detection Logic**:
- Input cells: Yellow fill (FFFF00) OR prefix "IN_" OR named range matching "INPUT_*"
- Output cells: Light green fill (90EE90) OR prefix "OUT_" OR named range matching "OUTPUT_*"
- Formula cells: data_type == 'f'

### 4. Hot Reload Manager

**Purpose**: Watches file system and triggers template reloading

**Key Classes**:

```python
class TemplateReloadHandler(FileSystemEventHandler):
    def __init__(self, template_manager, callback)
    def on_modified(self, event)
    def on_created(self, event)

class HotReloadManager:
    def __init__(self, template_manager, watch_path: str = "attached_assets")
    def start_watching(self)
    def stop_watching(self)
    def _template_changed_callback(self, filepath: str)
```

**Dependencies**:
- watchdog: For file system monitoring
- threading: For background observation

**Interface**:
- Input: Directory path to watch
- Output: Callbacks triggered on file changes

**Event Handling**:
- on_modified: Reload existing template
- on_created: Load new template
- Debouncing: 2-second delay to avoid multiple triggers

### 5. GEstimator Adapter

**Purpose**: Converts template data to GEstimator format

**Key Classes**:

```python
class GEstimatorAdapter:
    def __init__(self, template_engine)
    def convert_to_gestimator_format(self, template_data: Dict) -> Dict
    def _map_to_schedule_item(self, cell_data: Dict) -> Dict
    def create_config_file(self, template_name: str, mapping_config: Dict) -> str
```

**Dependencies**:
- json: For configuration file creation
- FormulaDependencyEngine: For accessing template data

**Interface**:
- Input: Template structure dictionary
- Output: GEstimator-compatible dictionary with schedule items

**Mapping**:
```python
{
    'schedule_items': [
        {
            'Code': str,
            'Description': str,
            'Unit': str,
            'Rate': float,
            'Qty': float,
            'Amount': float,
            'Remarks': str
        }
    ],
    'template_metadata': {
        'name': str,
        'version': str,
        'sheets': List[str]
    }
}
```

### 6. Enhanced GEstimator Application

**Purpose**: Main application orchestrating all components

**Key Classes**:

```python
class EnhancedGEstimatorApp:
    def __init__(self, config_path: str = "config/app_config.json")
    def setup_logging(self)
    def initialize_templates(self)
    def start_hot_reload(self)
    def process_user_input(self, template_name: str, inputs: Dict[str, Any]) -> Dict
    def _evaluate_formula(self, formula: str, workbook) -> Any
    def _extract_results(self, workbook) -> Dict
```

**Dependencies**: All above components

**Interface**:
- Input: Configuration file, user inputs
- Output: Calculated results, GEstimator exports

## Data Models

### ExcelFileMetadata

```python
{
    "filename": "estimation_template.xlsx",
    "filepath": Path("attached_assets/estimation_template.xlsx"),
    "format": ".xlsx",
    "sheet_count": 4,
    "last_modified": datetime(2025, 10, 31, 10, 30, 0),
    "file_size": 524288,
    "has_formulas": True,
    "named_ranges": ["INPUT_LENGTH", "OUTPUT_TOTAL"]
}
```

### Template Structure

```python
{
    "sheets": {
        "Input": {
            "input_cells": [
                {
                    "reference": "Input!B5",
                    "value": 100,
                    "validation": {"type": "decimal", "min": 0, "max": 1000}
                }
            ],
            "output_cells": [],
            "formula_cells": []
        },
        "Calculation": {
            "input_cells": [],
            "output_cells": [
                {
                    "reference": "Calculation!D10",
                    "formula": "=Input!B5*2",
                    "value": 200
                }
            ],
            "formula_cells": [
                {
                    "reference": "Calculation!D10",
                    "formula": "=Input!B5*2"
                }
            ]
        }
    },
    "input_fields": {...},
    "output_fields": {...},
    "formulas": {...},
    "named_ranges": {...}
}
```

### Dependency Graph

```python
# NetworkX DiGraph structure
{
    "nodes": ["Input!B5", "Calculation!D10", "Summary!F20"],
    "edges": [
        ("Input!B5", "Calculation!D10"),
        ("Calculation!D10", "Summary!F20")
    ]
}
```

### Configuration File

```python
{
    "template_name": "bridge_estimation",
    "input_mapping": {
        "length": "Input!B5",
        "width": "Input!B6",
        "height": "Input!B7"
    },
    "output_mapping": {
        "total_cost": "Summary!F20",
        "material_cost": "Summary!F15",
        "labor_cost": "Summary!F16"
    },
    "calculation_settings": {
        "precision": 2,
        "currency": "INR"
    },
    "validation_rules": {
        "length": {"min": 0, "max": 1000, "type": "decimal"},
        "width": {"min": 0, "max": 100, "type": "decimal"}
    }
}
```

## Error Handling

### Error Categories

1. **File System Errors**
   - File not found
   - Permission denied
   - Corrupted Excel file
   - **Handling**: Log error, skip file, continue processing

2. **Formula Parsing Errors**
   - Invalid formula syntax
   - Circular dependencies
   - Unknown function references
   - **Handling**: Log error, mark formula as invalid, use fallback value

3. **Calculation Errors**
   - Division by zero
   - Type mismatch
   - Reference errors
   - **Handling**: Log error, return error value (#ERROR), continue

4. **Hot Reload Errors**
   - File system watcher failure
   - Template reload failure
   - **Handling**: Log error, maintain previous template version

### Error Response Format

```python
{
    "success": False,
    "error": {
        "code": "FORMULA_PARSE_ERROR",
        "message": "Failed to parse formula in cell Calculation!D10",
        "details": {
            "cell_reference": "Calculation!D10",
            "formula": "=INVALID_FUNC(A1)",
            "exception": "Unknown function: INVALID_FUNC"
        }
    },
    "timestamp": "2025-10-31T10:30:00Z"
}
```

### Logging Strategy

```python
# Log levels and usage
logging.INFO: Template loaded, hot reload triggered, calculation completed
logging.WARNING: Circular dependency detected, validation rule missing
logging.ERROR: File read failed, formula parsing failed, calculation error
logging.DEBUG: Cell value updated, dependency edge added, formula evaluated
```

## Testing Strategy

### Unit Tests

1. **ExcelTemplateImporter Tests**
   - Test metadata extraction for .xlsx files
   - Test metadata extraction for .xls files
   - Test formula detection
   - Test error handling for corrupted files

2. **FormulaDependencyEngine Tests**
   - Test formula parsing with various patterns
   - Test dependency graph construction
   - Test topological sorting
   - Test circular dependency handling

3. **DynamicTemplateRenderer Tests**
   - Test input cell detection (color, prefix, named range)
   - Test output cell detection
   - Test validation rule extraction
   - Test sheet analysis

4. **HotReloadManager Tests**
   - Test file modification detection
   - Test file creation detection
   - Test callback invocation
   - Test start/stop functionality

5. **GEstimatorAdapter Tests**
   - Test template to GEstimator conversion
   - Test schedule item mapping
   - Test configuration file creation

### Integration Tests

1. **End-to-End Template Processing**
   - Load template → Parse formulas → Identify inputs/outputs → Process user input → Extract results

2. **Hot Reload Workflow**
   - Start watching → Modify template → Verify reload → Check updated structure

3. **GEstimator Integration**
   - Process template → Convert to GEstimator format → Verify schedule items

### Test Data

- Simple template: 1 sheet, 5 inputs, 10 formulas
- Complex template: 4 sheets, 20 inputs, 100 formulas, circular dependencies
- Legacy template: .xls format with basic formulas
- Invalid template: Corrupted file, invalid formulas

### Performance Tests

- Template loading time: < 2 seconds for 10 templates
- Formula parsing time: < 1 second for 1000 formulas
- Recalculation time: < 5 seconds for 1000 formulas
- Hot reload response time: < 2 seconds after file modification

## Configuration

### Application Configuration (app_config.json)

```json
{
    "assets_path": "attached_assets",
    "enable_hot_reload": true,
    "hot_reload_debounce_seconds": 2,
    "max_formula_depth": 100,
    "calculation_timeout_seconds": 30,
    "log_level": "INFO",
    "log_file": "gestimator.log",
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

## Dependencies

### Python Packages

```
openpyxl>=3.1.0        # Excel .xlsx file handling
xlrd>=2.0.1            # Excel .xls file handling
networkx>=3.0          # Dependency graph management
watchdog>=3.0.0        # File system monitoring
pathlib                # File path operations (stdlib)
logging                # Logging framework (stdlib)
json                   # JSON handling (stdlib)
re                     # Regular expressions (stdlib)
dataclasses            # Data classes (stdlib)
typing                 # Type hints (stdlib)
datetime               # Date/time handling (stdlib)
```

### External Tools

- None required (all functionality in Python)

## Deployment Considerations

1. **Directory Structure**
   ```
   gestimator/
   ├── attached_assets/          # Excel templates
   ├── config/
   │   └── app_config.json       # Application configuration
   ├── logs/
   │   └── gestimator.log        # Application logs
   ├── import_templates.py
   ├── template_engine.py
   ├── dynamic_renderer.py
   ├── hot_reload.py
   ├── gestimator_integration.py
   └── main_app.py
   ```

2. **Initialization Sequence**
   - Load configuration
   - Setup logging
   - Initialize template importer
   - Scan for templates
   - Build dependency graphs
   - Start hot reload (if enabled)

3. **Resource Management**
   - Close workbooks after processing
   - Stop file system watcher on shutdown
   - Flush logs on exit

4. **Backwards Compatibility**
   - Existing GEstimator functionality remains unchanged
   - New dynamic template features are additive
   - Configuration file is optional (defaults provided)
