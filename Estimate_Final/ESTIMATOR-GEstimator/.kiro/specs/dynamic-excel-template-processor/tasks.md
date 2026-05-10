# Implementation Plan

- [x] 1. Set up project structure and core dependencies


  - Create directory structure for the dynamic template processor modules
  - Add required dependencies to requirements.txt (openpyxl, xlrd, networkx, watchdog)
  - Create configuration file structure (config/app_config.json)
  - Set up logging configuration with file and console handlers
  - _Requirements: 7.1, 7.4, 7.5_





- [x] 2. Implement Excel Template Importer module



  - [ ] 2.1 Create ExcelFileMetadata dataclass with all required fields
    - Define dataclass with filename, filepath, format, sheet_count, last_modified, file_size, has_formulas, named_ranges
    - _Requirements: 1.2_


  - [ ] 2.2 Implement ExcelTemplateImporter class initialization and template registry
    - Create __init__ method with assets_path parameter
    - Initialize templates dictionary for template registry
    - Set up logger for the importer
    - _Requirements: 1.3_


  - [ ] 2.3 Implement scan_for_templates method
    - Use pathlib to glob for .xls and .xlsx files in assets_path
    - Call _extract_metadata for each discovered file
    - Store metadata in templates registry
    - Implement error handling with logging for failed files
    - Return list of ExcelFileMetadata objects

    - _Requirements: 1.1, 1.4_

  - [ ] 2.4 Implement _extract_metadata method for .xlsx files
    - Use openpyxl.load_workbook to open file
    - Extract sheet count, named ranges, and file statistics
    - Call _check_for_formulas_xlsx to detect formulas

    - Return ExcelFileMetadata object
    - _Requirements: 1.2, 1.5_

  - [x] 2.5 Implement _extract_metadata method for .xls files



    - Use xlrd.open_workbook to open file
    - Extract sheet count and file statistics
    - Call _check_for_formulas_xls to detect formulas
    - Return ExcelFileMetadata object
    - _Requirements: 1.2, 1.5_


  - [ ] 2.6 Implement formula detection methods
    - Create _check_for_formulas_xlsx that iterates cells checking data_type == 'f'
    - Create _check_for_formulas_xls that checks cell types for formulas
    - Return boolean indicating formula presence
    - _Requirements: 1.2_

- [x] 3. Implement Formula Dependency Engine module

  - [ ] 3.1 Create FormulaDependencyEngine class with dependency graph
    - Initialize networkx DiGraph for dependency tracking
    - Create dictionaries for cell_formulas and cell_values
    - Set up data structures for formula management
    - _Requirements: 2.3_


  - [ ] 3.2 Implement parse_workbook_formulas method
    - Iterate through all sheets in workbook
    - For each cell, check if data_type == 'f'
    - Store formula in cell_formulas dictionary with sheet!coordinate key
    - Call _extract_dependencies to find referenced cells

    - Add edges to dependency graph (dependency → dependent)
    - Return completed dependency graph
    - _Requirements: 2.1, 2.2_




  - [ ] 3.3 Implement _extract_dependencies method with regex parsing
    - Define regex pattern for cell references: `([\'\"]?(\w+)\1!)?([A-Z]+\d+)`
    - Use re.finditer to find all cell references in formula
    - Handle both Sheet!A1 and A1 reference formats
    - Return list of fully qualified cell references (Sheet!Coordinate)

    - _Requirements: 2.2_

  - [ ] 3.4 Implement calculate_execution_order method
    - Use networkx.topological_sort on dependency graph

    - Return list of cell references in execution order
    - Wrap in try-except to catch NetworkXError for circular dependencies
    - _Requirements: 2.4_

  - [ ] 3.5 Implement _handle_circular_dependencies method
    - Use networkx.strongly_connected_components to find cycles

    - Log warning for each circular dependency detected
    - Return best-effort execution order
    - _Requirements: 2.5_

- [ ] 4. Implement Dynamic Template Renderer module
  - [ ] 4.1 Create TemplateConfig class with input/output indicators
    - Define INPUT_INDICATORS dictionary with fill_color, prefix, named_range_pattern
    - Define OUTPUT_INDICATORS dictionary with fill_color, prefix, named_range_pattern
    - Define STANDARD_SHEETS dictionary for common sheet names

    - _Requirements: 3.1, 3.2_

  - [ ] 4.2 Create DynamicTemplateRenderer class initialization
    - Accept template_engine parameter
    - Initialize input_fields and output_fields dictionaries



    - _Requirements: 3.4, 3.5_

  - [ ] 4.3 Implement analyze_template_structure method
    - Create structure dictionary with sheets, input_fields, output_fields, formulas, named_ranges

    - Iterate through all sheets calling _analyze_sheet
    - Populate structure dictionary with analysis results
    - Return complete structure dictionary
    - _Requirements: 3.4, 3.5_

  - [ ] 4.4 Implement _analyze_sheet method
    - Create sheet_info dictionary with input_cells, output_cells, formula_cells, data_validation

    - Iterate through all cells in sheet
    - Call _is_input_cell and _is_output_cell for classification
    - For input cells, extract value and validation rules
    - For output cells, extract formula and value
    - Track all formula cells separately

    - Return sheet_info dictionary
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [ ] 4.5 Implement cell classification methods
    - Create _is_input_cell checking fill color (FFFF00), prefix (IN_), or named range pattern
    - Create _is_output_cell checking fill color (90EE90), prefix (OUT_), or named range pattern

    - Create _get_validation_rules to extract data validation from cells
    - Return appropriate boolean or validation dictionary
    - _Requirements: 3.1, 3.2, 3.3_




- [ ] 5. Implement Hot Reload Manager module
  - [ ] 5.1 Create TemplateReloadHandler class extending FileSystemEventHandler
    - Implement __init__ with template_manager and callback parameters
    - Store references for use in event handlers

    - _Requirements: 4.4_

  - [ ] 5.2 Implement file system event handlers
    - Create on_modified method checking for .xls/.xlsx extensions
    - Call template_manager.reload_template for modified files
    - Create on_created method for new files
    - Call template_manager.load_new_template for new files
    - Invoke callback function after processing

    - _Requirements: 4.2, 4.3_

  - [ ] 5.3 Create HotReloadManager class
    - Implement __init__ with template_manager and watch_path parameters
    - Initialize watchdog Observer

    - Create is_running flag
    - _Requirements: 4.1_

  - [ ] 5.4 Implement start_watching and stop_watching methods
    - In start_watching, create TemplateReloadHandler and schedule with observer



    - Start observer thread and set is_running flag
    - In stop_watching, stop observer and join thread
    - Clear is_running flag
    - _Requirements: 4.1, 4.5_

  - [x] 5.5 Implement _template_changed_callback method

    - Log template change event with filepath
    - Trigger any registered callbacks
    - Handle errors gracefully
    - _Requirements: 4.4_

- [x] 6. Implement GEstimator Adapter module

  - [ ] 6.1 Create GEstimatorAdapter class
    - Implement __init__ accepting template_engine parameter
    - Store reference to template engine
    - _Requirements: 6.1_

  - [ ] 6.2 Implement convert_to_gestimator_format method
    - Extract schedule items from template data
    - Check for SUMMARY sheet in template structure
    - Iterate through output cells in summary sheet

    - Call _map_to_schedule_item for each output cell
    - Build result dictionary with schedule_items and template_metadata
    - Return GEstimator-compatible dictionary
    - _Requirements: 6.1, 6.2, 6.4_


  - [ ] 6.3 Implement _map_to_schedule_item method
    - Map cell data to schedule item fields (Code, Description, Unit, Rate, Qty, Amount, Remarks)
    - Handle missing fields with default values
    - Return schedule item dictionary
    - _Requirements: 6.2, 6.5_

  - [ ] 6.4 Implement create_config_file method
    - Build configuration dictionary with template_name, input_mapping, output_mapping, calculation_settings, validation_rules
    - Create JSON file in attached_assets directory
    - Write configuration with proper formatting (indent=2)

    - Return config file path
    - _Requirements: 6.3_

- [ ] 7. Implement Enhanced GEstimator Application
  - [x] 7.1 Create EnhancedGEstimatorApp class initialization

    - Implement __init__ with config_path parameter
    - Load configuration from JSON file
    - Initialize all component instances (template_importer, template_engine, renderer, hot_reload, gestimator_adapter)
    - Call setup_logging and initialize_templates
    - _Requirements: 7.1, 7.2_




  - [ ] 7.2 Implement setup_logging method
    - Configure logging with INFO level
    - Create file handler for gestimator.log
    - Create console handler for stdout
    - Set log format with timestamp, name, level, message
    - _Requirements: 7.1, 7.2, 7.4, 7.5_


  - [ ] 7.3 Implement initialize_templates method
    - Call template_importer.scan_for_templates
    - For each template with formulas, load workbook
    - Parse formulas with template_engine.parse_workbook_formulas
    - Analyze structure with renderer.analyze_template_structure

    - Convert to GEstimator format with gestimator_adapter
    - Log successful template loading
    - Handle errors gracefully per template





    - _Requirements: 1.1, 2.1, 3.4, 6.1, 7.3, 8.1, 8.2_

  - [x] 7.4 Implement start_hot_reload method

    - Call hot_reload.start_watching
    - Log hot reload startup
    - _Requirements: 4.1, 7.3_

  - [ ] 7.5 Implement process_user_input method
    - Validate template_name exists in registry
    - Load workbook for specified template

    - Update input cells with provided values
    - Get execution order from template_engine
    - Iterate through execution order calling _evaluate_formula
    - Update cell values with calculated results
    - Call _extract_results to get final outputs
    - Return results dictionary

    - Handle errors and log appropriately
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.4_

  - [ ] 7.6 Implement _evaluate_formula method (simplified)
    - Accept formula string and workbook



    - For initial implementation, return placeholder indicating formula
    - Add TODO comment for full formula engine implementation
    - _Requirements: 5.2_





  - [ ] 7.7 Implement _extract_results method
    - Iterate through output cells identified by renderer
    - Extract current values from workbook
    - Build results dictionary with cell references and values

    - Return results dictionary
    - _Requirements: 5.3_

- [ ] 8. Create configuration and setup files
  - [x] 8.1 Create app_config.json with default configuration

    - Set assets_path to "attached_assets"
    - Configure hot reload settings (enable_hot_reload, debounce_seconds)
    - Set calculation parameters (max_formula_depth, timeout)
    - Configure logging (log_level, log_file)
    - Define input/output indicators
    - _Requirements: 7.1_

  - [ ] 8.2 Update requirements.txt with new dependencies
    - Add openpyxl>=3.1.0
    - Add xlrd>=2.0.1
    - Add networkx>=3.0
    - Add watchdog>=3.0.0
    - _Requirements: 1.5, 2.3, 4.1_

  - [ ] 8.3 Create example template configuration file
    - Create example JSON configuration showing input_mapping, output_mapping, validation_rules
    - Save as attached_assets/example_template_config.json
    - _Requirements: 6.3_

- [ ] 9. Integration and testing
  - [ ] 9.1 Create main entry point script
    - Create main.py that instantiates EnhancedGEstimatorApp
    - Add command-line argument parsing for config file
    - Implement graceful shutdown handling
    - _Requirements: 7.1_

  - [ ] 9.2 Test with sample Excel template
    - Create simple test template with inputs, formulas, and outputs
    - Place in attached_assets directory
    - Run application and verify template discovery
    - Verify formula parsing and dependency graph
    - Test input processing and recalculation
    - _Requirements: 1.1, 2.1, 3.1, 5.1_

  - [ ] 9.3 Test hot reload functionality
    - Start application with hot reload enabled
    - Modify test template in Excel
    - Verify automatic reload within 2 seconds
    - Check logs for reload events
    - _Requirements: 4.2, 7.3_

  - [ ] 9.4 Test GEstimator integration
    - Process template and convert to GEstimator format
    - Verify schedule items are correctly mapped
    - Check template metadata is preserved
    - _Requirements: 6.1, 6.2, 6.4_

  - [ ] 9.5 Test error handling
    - Test with corrupted Excel file
    - Test with circular formula dependencies
    - Test with invalid formulas
    - Verify application continues running and logs errors appropriately
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [ ] 10. Documentation and examples
  - [ ] 10.1 Create user guide for template creation
    - Document input/output cell conventions (colors, prefixes)
    - Provide examples of supported formulas
    - Explain named range usage
    - _Requirements: 3.1, 3.2_

  - [ ] 10.2 Create developer documentation
    - Document architecture and component interactions
    - Provide API documentation for each module
    - Include examples of extending the system
    - _Requirements: All_

  - [ ] 10.3 Create example templates
    - Create simple estimation template
    - Create complex template with multiple sheets
    - Create template demonstrating all features
    - _Requirements: 1.1, 3.1, 3.2_
