# Requirements Document

## Introduction

This feature enhances the GEstimator application to dynamically process Excel templates with full formula preservation, dependency tracking, and hot reloading capabilities. The system will automatically discover Excel files, analyze their structure, maintain formula dependencies, and provide a future-proof architecture that works with any Excel template following established conventions.

## Glossary

- **GEstimator**: The main estimation application that converts Excel files to project estimation format
- **Template Engine**: The system component that processes Excel templates and manages formula dependencies
- **Hot Reload Manager**: Component that watches for file system changes and automatically reloads templates
- **Dependency Graph**: A directed graph representing formula dependencies between cells
- **Dynamic Renderer**: Component that converts Excel templates into UI forms
- **Excel Template**: An Excel file (.xls or .xlsx) containing formulas, inputs, and outputs for estimation calculations

## Requirements

### Requirement 1

**User Story:** As a project estimator, I want the system to automatically discover and load Excel templates from the attached_assets directory, so that I can add new templates without modifying code

#### Acceptance Criteria

1. WHEN the application starts, THE Template Importer SHALL scan the attached_assets directory for all Excel files with .xls and .xlsx extensions
2. WHEN an Excel file is discovered, THE Template Importer SHALL extract comprehensive metadata including filename, format, sheet count, modification date, file size, formula presence, and named ranges
3. THE Template Importer SHALL maintain a registry of all discovered templates indexed by template name
4. WHEN template scanning fails for a specific file, THE Template Importer SHALL log the error and continue processing remaining files
5. THE Template Importer SHALL support both legacy .xls format using xlrd and modern .xlsx format using openpyxl

### Requirement 2

**User Story:** As a developer, I want the system to parse and preserve all Excel formulas with their dependencies, so that calculations remain accurate when inputs change

#### Acceptance Criteria

1. WHEN a template with formulas is loaded, THE Formula Dependency Engine SHALL parse all formula cells across all sheets
2. THE Formula Dependency Engine SHALL extract cell references from each formula using regex pattern matching
3. THE Formula Dependency Engine SHALL build a directed dependency graph where edges represent formula dependencies
4. THE Formula Dependency Engine SHALL calculate the correct execution order using topological sorting
5. IF circular dependencies are detected, THE Formula Dependency Engine SHALL handle them gracefully and log a warning

### Requirement 3

**User Story:** As a project estimator, I want the system to automatically identify input and output cells in templates, so that I can interact with templates through a dynamic UI

#### Acceptance Criteria

1. WHEN analyzing a template, THE Dynamic Renderer SHALL identify input cells based on yellow fill color (FFFF00) or IN_ prefix
2. WHEN analyzing a template, THE Dynamic Renderer SHALL identify output cells based on light green fill color (90EE90) or OUT_ prefix
3. THE Dynamic Renderer SHALL extract validation rules from input cells including data type and allowed value ranges
4. THE Dynamic Renderer SHALL create a structured representation of all input fields with their cell references and current values
5. THE Dynamic Renderer SHALL create a structured representation of all output fields with their formulas and calculated values

### Requirement 4

**User Story:** As a project estimator, I want templates to automatically reload when I modify them in Excel, so that I can iterate quickly without restarting the application

#### Acceptance Criteria

1. WHEN hot reload is enabled, THE Hot Reload Manager SHALL watch the attached_assets directory for file system events
2. WHEN an Excel template file is modified, THE Hot Reload Manager SHALL trigger a template reload within 2 seconds
3. WHEN a new Excel template file is created in the watched directory, THE Hot Reload Manager SHALL automatically load the new template
4. THE Hot Reload Manager SHALL invoke registered callback functions when templates change
5. WHEN hot reload is stopped, THE Hot Reload Manager SHALL cleanly terminate the file system observer thread

### Requirement 5

**User Story:** As a project estimator, I want to input values into template fields and see calculated results immediately, so that I can perform what-if analysis efficiently

#### Acceptance Criteria

1. WHEN user provides input values for a template, THE Application SHALL update the corresponding Excel cells with the new values
2. THE Application SHALL recalculate all dependent formulas in the correct execution order determined by the dependency graph
3. THE Application SHALL extract and return all output values after recalculation completes
4. THE Application SHALL complete input processing and recalculation within 5 seconds for templates with up to 1000 formulas
5. IF formula evaluation fails, THE Application SHALL log the error with cell reference and formula details

### Requirement 6

**User Story:** As a developer, I want the dynamic template system to integrate with existing GEstimator format, so that templates can export to the standard project format

#### Acceptance Criteria

1. THE GEstimator Adapter SHALL convert template output data to GEstimator schedule item format
2. THE GEstimator Adapter SHALL map output cells to schedule fields including Code, Description, Unit, Rate, Qty, Amount, and Remarks
3. THE GEstimator Adapter SHALL create configuration files in JSON format for template-to-GEstimator mapping
4. THE GEstimator Adapter SHALL include template metadata in the converted output including name, version, and sheet list
5. THE GEstimator Adapter SHALL preserve all schedule items extracted from the template's summary sheet

### Requirement 7

**User Story:** As a system administrator, I want comprehensive logging of all template operations, so that I can troubleshoot issues and audit template usage

#### Acceptance Criteria

1. THE Application SHALL log all template loading operations with INFO level including template filename and load status
2. THE Application SHALL log all template scanning errors with ERROR level including filepath and exception details
3. THE Application SHALL log hot reload events with INFO level including the changed filepath
4. THE Application SHALL write logs to both a file (gestimator.log) and console output
5. THE Application SHALL include timestamp, logger name, log level, and message in each log entry

### Requirement 8

**User Story:** As a developer, I want the system to handle errors gracefully, so that one problematic template does not crash the entire application

#### Acceptance Criteria

1. WHEN template metadata extraction fails, THE Template Importer SHALL log the error and continue processing other templates
2. WHEN formula parsing fails for a cell, THE Formula Dependency Engine SHALL log the error and skip that formula
3. WHEN file watching encounters an error, THE Hot Reload Manager SHALL log the error and continue monitoring
4. WHEN template conversion fails, THE GEstimator Adapter SHALL return an error response with details
5. THE Application SHALL never terminate due to a single template processing error
