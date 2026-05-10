# Design Document

## Overview

The Schedule and Project Importer is a standalone Python command-line script that automates the import of schedule data from Excel files and registration of GEstimator project files. The script operates independently of the GTK GUI, directly interfacing with GEstimator's SQLite database using the same ORM models (peewee) as the main application.

The design follows a modular architecture with separate components for Excel parsing, database operations, file validation, and logging. The script will be idempotent, allowing safe re-execution without creating duplicates.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│         import_schedule_and_projects.py                 │
│                                                          │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Excel Parser   │  │ Project      │  │ Logger     │ │
│  │ Module         │  │ Registrar    │  │ Module     │ │
│  └────────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
│           │                  │                 │        │
│           └──────────┬───────┴─────────────────┘        │
│                      │                                  │
│           ┌──────────▼──────────┐                      │
│           │  Database Manager   │                      │
│           │  (peewee ORM)       │                      │
│           └──────────┬──────────┘                      │
└──────────────────────┼──────────────────────────────────┘
                       │
            ┌──────────▼──────────┐
            │  SQLite Database    │
            │  (.eproj files)     │
            └─────────────────────┘
```

### Component Interaction Flow

1. **Initialization Phase**: Script initializes logger, validates paths, and connects to database
2. **Excel Import Phase**: Parses Excel files, validates data, and inserts schedule items
3. **Project Registration Phase**: Validates and copies project files to user data directory
4. **Cleanup Phase**: Commits transactions, closes connections, and writes summary log

## Components and Interfaces

### 1. Main Script Controller

**Responsibility**: Orchestrates the import process and handles top-level error management

**Interface**:
```python
def main():
    """Main entry point for the import script"""
    # Initialize components
    # Execute import phases
    # Handle global exceptions
    # Return exit code
```

**Key Functions**:
- `initialize_environment()`: Sets up logging, validates directories
- `run_import_process()`: Executes import phases in sequence
- `cleanup()`: Closes resources and finalizes logs

### 2. Excel Parser Module

**Responsibility**: Reads and validates Excel files, converts rows to ScheduleItemModel objects

**Interface**:
```python
class ExcelScheduleParser:
    def __init__(self, logger):
        """Initialize parser with logger instance"""
        
    def parse_file(self, filepath):
        """
        Parse Excel file and return list of ScheduleItemModel objects
        
        Args:
            filepath: Path to Excel file
            
        Returns:
            tuple: (success: bool, items: list, errors: list)
        """
        
    def validate_headers(self, worksheet):
        """Validate that required columns exist"""
        
    def parse_row(self, row, row_number):
        """Convert Excel row to ScheduleItemModel"""
```

**Expected Excel Format**:
- Column A: Code (text)
- Column B: Description (text)
- Column C: Unit (text)
- Column D: Rate (decimal)
- Column E: Quantity (decimal)
- Column F: Remarks (text, optional)
- Column G: Category (text, optional)

**Validation Rules**:
- Code, Description, Unit must not be empty
- Rate and Quantity must be valid decimal numbers
- Description length must not exceed MAX_DESC_LEN (1000 characters)
- Skip rows where all cells are empty

### 3. Database Manager Module

**Responsibility**: Handles all database operations using GEstimator's ORM models

**Interface**:
```python
class DatabaseManager:
    def __init__(self, database_path, logger):
        """Initialize database connection"""
        
    def connect(self):
        """Open database connection and initialize ORM models"""
        
    def validate_database(self):
        """Verify database schema and version compatibility"""
        
    def insert_schedule_items(self, items):
        """
        Insert schedule items with duplicate checking
        
        Args:
            items: List of ScheduleItemModel objects
            
        Returns:
            tuple: (inserted_count, skipped_count, failed_count)
        """
        
    def check_duplicate(self, code):
        """Check if schedule item with code already exists"""
        
    def get_or_create_category(self, category_name):
        """Get existing category or create new one"""
        
    def commit_transaction(self):
        """Commit current transaction"""
        
    def rollback_transaction(self):
        """Rollback current transaction"""
        
    def close(self):
        """Close database connection"""
```

**Database Schema Usage**:
- Uses existing `ScheduleTable` model from `estimator.data.schedule`
- Uses existing `ScheduleCategoryTable` for category management
- Leverages peewee ORM for transaction management
- Maintains foreign key integrity

### 4. Project Registrar Module

**Responsibility**: Validates and registers project files into GEstimator

**Interface**:
```python
class ProjectRegistrar:
    def __init__(self, source_dir, target_dir, logger):
        """Initialize with source and target directories"""
        
    def discover_projects(self):
        """Find all .eproj files in source directory"""
        
    def validate_project_file(self, filepath):
        """
        Validate that file is a valid GEstimator project
        
        Args:
            filepath: Path to .eproj file
            
        Returns:
            tuple: (is_valid: bool, error_message: str)
        """
        
    def register_project(self, filepath):
        """
        Copy project file to target directory
        
        Args:
            filepath: Source project file path
            
        Returns:
            tuple: (success: bool, target_path: str, message: str)
        """
        
    def check_existing(self, filename):
        """Check if project already exists in target directory"""
```

**Validation Checks**:
- File is a valid SQLite database
- Database contains required GEstimator tables (ProjectTable, ScheduleTable, ResourceTable)
- File version is compatible with current GEstimator version

**Target Directory Resolution**:
- Uses `appdirs.AppDirs` to locate user data directory
- Path: `{user_data_dir}/projects/` (create if not exists)
- Preserves original filename

### 5. Logger Module

**Responsibility**: Provides structured logging to file and console

**Interface**:
```python
class ImportLogger:
    def __init__(self, log_filepath):
        """Initialize logger with output file"""
        
    def info(self, message):
        """Log informational message"""
        
    def warning(self, message):
        """Log warning message"""
        
    def error(self, message, exception=None):
        """Log error message with optional exception details"""
        
    def log_file_processing(self, filename, status, details):
        """Log file processing result"""
        
    def write_summary(self, stats):
        """Write final summary statistics"""
```

**Log Format**:
```
[TIMESTAMP] [LEVEL] Message
```

**Summary Statistics**:
- Total Excel files processed
- Total schedule items imported
- Total schedule items skipped (duplicates)
- Total schedule items failed
- Total project files registered
- Total project files skipped (already exist)
- Total errors encountered

## Data Models

### ScheduleItemModel (from estimator.data.schedule)

```python
class ScheduleItemModel:
    code: str              # Unique item code
    description: str       # Item description
    unit: str             # Unit of measurement
    rate: Decimal         # Rate per unit
    qty: Decimal          # Quantity
    remarks: str          # Optional remarks
    ana_remarks: str      # Analysis remarks
    category: str         # Category name (optional)
    parent: str           # Parent item code (optional)
```

### Database Tables (peewee ORM)

**ScheduleTable**:
- code (CharField, unique)
- description (CharField)
- unit (CharField)
- rate (DecimalField)
- qty (DecimalField)
- remarks (CharField, nullable)
- ana_remarks (CharField, nullable)
- category (ForeignKey to ScheduleCategoryTable)
- parent (ForeignKey to self)
- order (IntegerField)
- suborder (IntegerField, nullable)
- colour (CharField, nullable)

**ScheduleCategoryTable**:
- description (CharField, unique)
- order (IntegerField)

## Error Handling

### Error Categories

1. **File Access Errors**
   - Missing source directories
   - Permission denied on file read/write
   - Corrupted Excel files
   - **Handling**: Log error, skip file, continue processing

2. **Data Validation Errors**
   - Invalid data types in Excel cells
   - Missing required fields
   - Data exceeding length limits
   - **Handling**: Log warning, skip row, continue processing

3. **Database Errors**
   - Connection failures
   - Constraint violations
   - Transaction failures
   - **Handling**: Rollback transaction, log error, attempt recovery

4. **Project File Errors**
   - Invalid SQLite database
   - Incompatible schema version
   - Missing required tables
   - **Handling**: Log error, skip file, continue processing

### Transaction Management

- Each Excel file import wrapped in a database transaction
- On error: rollback transaction, log error, continue to next file
- On success: commit transaction, log success
- Final commit at end of all operations

### Recovery Strategies

1. **Partial Import Recovery**: If some items fail, successfully imported items are retained
2. **Duplicate Handling**: Silently skip duplicates with warning log
3. **Category Auto-Creation**: If category doesn't exist, create it automatically
4. **Graceful Degradation**: Continue processing remaining files even if one fails

## Testing Strategy

### Unit Tests

1. **ExcelScheduleParser Tests**
   - Test valid Excel file parsing
   - Test invalid data type handling
   - Test missing required fields
   - Test empty row handling
   - Test header validation

2. **DatabaseManager Tests**
   - Test database connection
   - Test schedule item insertion
   - Test duplicate detection
   - Test category creation
   - Test transaction rollback

3. **ProjectRegistrar Tests**
   - Test project file discovery
   - Test project file validation
   - Test file copying
   - Test duplicate project handling

4. **ImportLogger Tests**
   - Test log file creation
   - Test message formatting
   - Test summary generation

### Integration Tests

1. **End-to-End Import Test**
   - Create sample Excel file with valid data
   - Create sample project files
   - Run import script
   - Verify database contents
   - Verify log file contents

2. **Error Handling Test**
   - Test with corrupted Excel file
   - Test with invalid project file
   - Test with missing directories
   - Verify graceful error handling

3. **Duplicate Handling Test**
   - Import same data twice
   - Verify no duplicates created
   - Verify appropriate warnings logged

### Manual Testing

1. **Windows Compatibility Test**
   - Run on Windows with GEstimator installed
   - Verify file paths handled correctly
   - Verify user data directory located correctly

2. **Large Dataset Test**
   - Import Excel file with 1000+ rows
   - Verify performance acceptable
   - Verify memory usage reasonable

3. **GEstimator Integration Test**
   - Run import script
   - Launch GEstimator
   - Verify imported items visible
   - Verify registered projects appear in project list

## Configuration

### Hardcoded Paths (Configurable via Constants)

```python
# Source directories
SCHEDULES_DIR = "Attached_Assets/SCHEDULES"
PROJECTS_DIR = "Attached_Assets/PROJECTS"

# Output
LOG_FILE = "import_log.txt"

# GEstimator constants (from estimator.misc)
PROGRAM_NAME = "GEstimator"
PROGRAM_AUTHOR = "CPWD"
PROGRAM_VER = "1"
PROJECT_EXTENSION = ".eproj"
```

### User Data Directory Resolution

Uses `appdirs` library to locate platform-specific user data directory:
```python
import appdirs
dirs = appdirs.AppDirs(PROGRAM_NAME, PROGRAM_AUTHOR, version=PROGRAM_VER)
user_data_dir = dirs.user_data_dir
```

## Dependencies

### Required Python Packages

- **openpyxl** (v2.5.1+): Excel file reading
- **peewee** (v3.2.0+): ORM for database operations
- **appdirs** (v1.4.3+): Platform-specific directory resolution
- **sqlite3**: Built-in Python module for SQLite operations

### GEstimator Modules

- **estimator.data.schedule**: ScheduleItemModel, ResourceItemModel, get_orm_model
- **estimator.misc**: Constants (PROGRAM_NAME, PROJECT_EXTENSION, etc.)

## Performance Considerations

### Batch Operations

- Use peewee's `insert_many()` for bulk inserts when possible
- Process Excel files one at a time to manage memory
- Commit transactions per file rather than per row

### Memory Management

- Stream Excel rows rather than loading entire file into memory
- Close database connections properly
- Clear processed data structures after each file

### Expected Performance

- Excel import: ~100-500 rows/second
- Project registration: ~1-5 files/second
- Total runtime for typical dataset (5 Excel files, 10 projects): <30 seconds

## Security Considerations

1. **File Path Validation**: Validate all file paths to prevent directory traversal
2. **SQL Injection Prevention**: Use peewee ORM parameterized queries (automatic)
3. **File Permission Checks**: Verify read/write permissions before operations
4. **Database Backup**: Recommend users backup database before running import
5. **Input Sanitization**: Validate and sanitize all Excel data before database insertion
