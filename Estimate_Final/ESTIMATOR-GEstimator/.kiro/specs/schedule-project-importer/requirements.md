# Requirements Document

## Introduction

This feature enables automated import of Schedule data from Excel files and Project files into the GEstimator application database. The system will provide a standalone Python script that can import schedule items from Excel spreadsheets located in the `Attached_Assets/SCHEDULES/` directory and register project files from the `Attached_Assets/PROJECTS/` directory into GEstimator's SQLite database system. The importer will maintain data integrity, prevent duplicates, and provide comprehensive logging of all import operations.

## Glossary

- **GEstimator**: A civil estimation software application for preparing cost and quantity estimates with detailed rate analysis
- **Schedule Item**: A work item in an estimate containing code, description, unit, rate, quantity, and analysis details
- **Resource Item**: Materials, labour, or tools/plants used in rate analysis with associated rates and units
- **Project File**: A GEstimator database file with `.eproj` extension containing schedule, resource, and measurement data
- **Import Script**: The standalone Python script (`import_schedule_and_projects.py`) that performs automated imports
- **Database**: SQLite database used by GEstimator to store project data
- **Analysis View**: Interface for editing rate analysis of schedule items
- **Measurement Details**: Detailed quantity calculations associated with schedule items

## Requirements

### Requirement 1

**User Story:** As a GEstimator user, I want to automatically import schedule data from Excel files, so that I can quickly populate my project database without manual data entry

#### Acceptance Criteria

1. WHEN the Import Script is executed, THE Import Script SHALL locate all Excel files with pattern `*.xlsx` in the `Attached_Assets/SCHEDULES/` directory
2. WHEN an Excel file is found, THE Import Script SHALL validate that the file contains required columns: Code, Description, Unit, Rate, and Quantity
3. WHEN schedule data is valid, THE Import Script SHALL parse each row and create Schedule Item objects with code, description, unit, rate, quantity, remarks, and category fields
4. IF a Schedule Item with the same code already exists in the Database, THEN THE Import Script SHALL skip the duplicate entry and log a warning message
5. WHEN all valid Schedule Items are parsed, THE Import Script SHALL insert the items into the Database using batch insertion for performance

### Requirement 2

**User Story:** As a GEstimator user, I want to register project files from a designated folder, so that they appear in my project list when I launch the application

#### Acceptance Criteria

1. WHEN the Import Script is executed, THE Import Script SHALL locate all files with extension `.eproj` in the `Attached_Assets/PROJECTS/` directory
2. WHEN a project file is found, THE Import Script SHALL validate the file is a valid SQLite database with GEstimator schema
3. WHEN a project file is valid, THE Import Script SHALL check if a project with the same filename already exists in the target location
4. IF the project file does not exist in the target location, THEN THE Import Script SHALL copy the file to the GEstimator user data directory
5. WHEN the project file is copied, THE Import Script SHALL log the successful registration with the project filename

### Requirement 3

**User Story:** As a GEstimator user, I want the import process to maintain existing database relationships, so that schedule items, resources, and measurements remain properly linked

#### Acceptance Criteria

1. WHEN importing Schedule Items, THE Import Script SHALL preserve all foreign key relationships to Resource Items referenced in analysis data
2. WHEN a Schedule Item references a Resource Item that does not exist, THE Import Script SHALL create the missing Resource Item with default values
3. WHEN importing Schedule Items with measurement details, THE Import Script SHALL maintain the linkage between Schedule Items and Measurement Details
4. WHEN the import completes, THE Import Script SHALL verify database integrity by checking all foreign key constraints are satisfied
5. IF any database integrity check fails, THEN THE Import Script SHALL rollback the transaction and log an error message

### Requirement 4

**User Story:** As a GEstimator user, I want comprehensive logging of all import operations, so that I can review what was imported and troubleshoot any issues

#### Acceptance Criteria

1. WHEN the Import Script starts execution, THE Import Script SHALL create a log file named `import_log.txt` in the current working directory
2. WHEN processing each file, THE Import Script SHALL log the filename, timestamp, and processing status (success, warning, or error)
3. WHEN Schedule Items are imported, THE Import Script SHALL log the count of successfully imported items, skipped duplicates, and failed items
4. WHEN Project files are registered, THE Import Script SHALL log each project filename and registration status
5. WHEN the Import Script completes, THE Import Script SHALL write a summary section containing total counts of all imported and skipped items

### Requirement 5

**User Story:** As a GEstimator user, I want the import script to validate files before processing, so that invalid or corrupted files do not cause database corruption

#### Acceptance Criteria

1. WHEN an Excel file is encountered, THE Import Script SHALL verify the file can be opened and read without errors
2. WHEN a project file is encountered, THE Import Script SHALL verify the file is a valid SQLite database with expected GEstimator tables
3. IF a file fails validation, THEN THE Import Script SHALL log the validation error and continue processing remaining files
4. WHEN validating Excel data, THE Import Script SHALL check that numeric fields (rate, quantity) contain valid decimal values
5. WHEN validating Excel data, THE Import Script SHALL check that required text fields (code, description, unit) are not empty

### Requirement 6

**User Story:** As a GEstimator user, I want the import script to be compatible with the Windows GTK-based GEstimator build, so that it works seamlessly with my existing installation

#### Acceptance Criteria

1. THE Import Script SHALL use Python 3 syntax compatible with Python 3.5 or higher
2. THE Import Script SHALL use the same database access libraries (peewee, sqlite3) as the main GEstimator application
3. THE Import Script SHALL locate the GEstimator user data directory using the appdirs library consistent with the main application
4. THE Import Script SHALL handle Windows file paths correctly using os.path or pathlib modules
5. THE Import Script SHALL not require GTK or GUI libraries, allowing it to run as a command-line script

### Requirement 7

**User Story:** As a GEstimator user, I want the import script to handle errors gracefully, so that a single problematic file does not stop the entire import process

#### Acceptance Criteria

1. WHEN an exception occurs while processing a file, THE Import Script SHALL catch the exception and log the error details
2. WHEN an error occurs, THE Import Script SHALL continue processing remaining files in the queue
3. WHEN a database transaction fails, THE Import Script SHALL rollback the transaction to prevent partial imports
4. WHEN the Import Script encounters a file access error, THE Import Script SHALL log the error with the specific file path
5. WHEN the Import Script completes with errors, THE Import Script SHALL exit with a non-zero status code indicating partial failure
