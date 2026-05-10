# Implementation Plan

- [x] 1. Set up project structure and core imports


  - Create `import_schedule_and_projects.py` in the root directory
  - Import required modules: os, sys, logging, pathlib, sqlite3, decimal, openpyxl, peewee, appdirs
  - Import GEstimator modules: estimator.data.schedule, estimator.misc
  - Define global constants (SCHEDULES_DIR, PROJECTS_DIR, LOG_FILE, etc.)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_


- [x] 2. Implement ImportLogger class


  - Create ImportLogger class with __init__ method accepting log_filepath parameter
  - Implement info(), warning(), and error() methods for structured logging
  - Implement log_file_processing() method to log file processing results with timestamp
  - Implement write_summary() method to output statistics (total files, imported items, skipped items, errors)
  - Configure logging to write to both file and console with timestamp format


  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Implement DatabaseManager class

  - Create DatabaseManager class with __init__ accepting database_path and logger
  - Implement connect() method to initialize peewee database connection and ORM models using get_orm_model()
  - Implement validate_database() method to check schema version compatibility
  - Implement check_duplicate() method to query ScheduleTable by code
  - Implement get_or_create_category() method to handle ScheduleCategoryTable entries
  - Implement insert_schedule_items() method with transaction management and duplicate checking


  - Implement commit_transaction(), rollback_transaction(), and close() methods
  - Enable foreign key support with PRAGMA foreign_keys=ON
  - _Requirements: 1.4, 3.1, 3.2, 3.4, 6.2_

- [x] 4. Implement ExcelScheduleParser class

  - Create ExcelScheduleParser class with __init__ accepting logger parameter
  - Implement parse_file() method to open Excel file using openpyxl and return tuple (success, items, errors)
  - Implement validate_headers() method to check for required columns: Code, Description, Unit, Rate, Quantity
  - Implement parse_row() method to convert Excel row to ScheduleItemModel with data type validation
  - Add validation for empty required fields (code, description, unit)


  - Add validation for numeric fields (rate, quantity) using Decimal conversion with error handling
  - Add validation for description length (MAX_DESC_LEN = 1000)
  - Skip empty rows where all cells are empty
  - Handle Excel parsing exceptions and return error details
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.4, 5.5_

- [x] 5. Implement ProjectRegistrar class

  - Create ProjectRegistrar class with __init__ accepting source_dir, target_dir, and logger

  - Implement discover_projects() method to find all .eproj files in source directory using pathlib.glob()
  - Implement validate_project_file() method to verify SQLite database with required tables (ProjectTable, ScheduleTable, ResourceTable)
  - Implement check_existing() method to verify if project file already exists in target directory
  - Implement register_project() method to copy validated project files to target directory using shutil.copy2()
  - Return tuple (success, target_path, message) from register_project()
  - Handle file access errors and permission issues gracefully
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.2_


- [x] 6. Implement main script initialization and environment setup


  - Create initialize_environment() function to validate source directories exist
  - Create directory validation for SCHEDULES_DIR and PROJECTS_DIR with error handling
  - Resolve GEstimator user data directory using appdirs.AppDirs with PROGRAM_NAME, PROGRAM_AUTHOR, PROGRAM_VER
  - Create target projects directory if it doesn't exist
  - Initialize ImportLogger with LOG_FILE path
  - Log script startup with timestamp and configuration details
  - _Requirements: 4.1, 6.3, 6.4_


- [x] 7. Implement Excel import workflow

  - Create run_excel_import() function accepting database_manager, parser, and logger
  - Discover all .xlsx files in SCHEDULES_DIR using pathlib.glob()
  - For each Excel file: call parser.parse_file() and handle returned items
  - For each parsed item: call database_manager.insert_schedule_items() within transaction
  - Log processing status for each file (filename, timestamp, success/warning/error)
  - Accumulate statistics: total files, imported items, skipped duplicates, failed items
  - Handle exceptions per file and continue processing remaining files
  - Commit transaction after successful file processing, rollback on error


  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.2, 4.3, 7.1, 7.2, 7.3_

- [x] 8. Implement project registration workflow

  - Create run_project_registration() function accepting registrar and logger
  - Call registrar.discover_projects() to find all .eproj files
  - For each project file: call registrar.validate_project_file()
  - For valid projects: call registrar.register_project() to copy to target directory
  - Log registration status for each project (filename, success/skipped/error)
  - Accumulate statistics: total projects, registered projects, skipped projects, errors
  - Handle exceptions per project and continue processing remaining projects
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.2, 4.4, 7.1, 7.2_

- [x] 9. Implement main execution flow and error handling

  - Create main() function as script entry point

  - Call initialize_environment() and handle initialization errors
  - Determine GEstimator database path (use default or from environment variable)
  - Instantiate DatabaseManager and call connect() with error handling
  - Instantiate ExcelScheduleParser with logger
  - Instantiate ProjectRegistrar with source and target directories
  - Call run_excel_import() and capture statistics
  - Call run_project_registration() and capture statistics
  - Call logger.write_summary() with combined statistics

  - Implement cleanup() function to close database connections and finalize logs
  - Add try-except block around entire main flow to catch and log unexpected errors
  - Return exit code 0 on success, non-zero on failure
  - Add if __name__ == '__main__': block to call main()
  - _Requirements: 4.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10. Add comprehensive error handling and validation


  - Add file access error handling with specific error messages for permission denied, file not found
  - Add data validation error handling for invalid Excel data types with row number in error message
  - Add database error handling with transaction rollback and detailed error logging
  - Add project file validation error handling with specific validation failure reasons
  - Ensure all exceptions include file path and operation context in error messages
  - Verify graceful continuation after errors (don't stop entire process for single file failure)
  - _Requirements: 5.3, 7.1, 7.2, 7.3, 7.4_

- [x] 11. Implement database integrity verification


  - Add verify_database_integrity() method to DatabaseManager
  - Check foreign key constraints are satisfied after import
  - Verify all referenced categories exist in ScheduleCategoryTable
  - Log integrity check results
  - If integrity check fails, log detailed error and rollback transaction
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 12. Add Windows path compatibility


  - Use os.path.join() or pathlib.Path for all path operations
  - Test path handling with Windows-style backslashes
  - Ensure appdirs returns correct Windows user data directory
  - Verify file copying works with Windows paths
  - _Requirements: 6.4_

- [ ]* 13. Create sample test data and documentation
  - Create sample Excel file with valid schedule data in Attached_Assets/SCHEDULES/
  - Create sample project file in Attached_Assets/PROJECTS/
  - Add README section documenting script usage and requirements
  - Document expected Excel format and column headers
  - Document log file format and location
  - _Requirements: All_

- [ ]* 14. Write unit tests for core components
  - Write tests for ExcelScheduleParser.parse_row() with valid and invalid data
  - Write tests for DatabaseManager.check_duplicate() and insert_schedule_items()
  - Write tests for ProjectRegistrar.validate_project_file()
  - Write tests for ImportLogger message formatting
  - Use pytest or unittest framework
  - _Requirements: All_

- [ ]* 15. Perform integration testing
  - Test end-to-end import with sample Excel and project files
  - Verify database contents after import using SQLite browser
  - Verify log file contains expected entries
  - Test duplicate import scenario (run script twice)
  - Test error scenarios (corrupted files, missing directories)
  - Test on Windows system with GEstimator installed
  - _Requirements: All_
