# Test SSR File Upload

## Sample Excel Structure for Testing

Create an Excel file with the following structure to test the SSR file upload:

### Sheet 1: "Civil Works"
| Code | Description | Unit | Rate | Category |
|------|-------------|------|------|----------|
| CW-001 | Excavation in ordinary soil | cum | 150.00 | Civil Works |
| CW-002 | Plain Cement Concrete 1:4:8 | cum | 4500.00 | Civil Works |
| CW-003 | Brick work in cement mortar | sqm | 580.00 | Civil Works |

### Sheet 2: "Electrical Works"
| Code | Description | Unit | Rate | Category |
|------|-------------|------|------|----------|
| EW-001 | Wiring with PVC insulated copper conductor | mtr | 45.00 | Electrical Works |
| EW-002 | 15A socket outlet with earth terminal | each | 125.00 | Electrical Works |
| EW-003 | MCB single pole 16A | each | 85.00 | Electrical Works |

## Features Implemented:

1. **File Upload**: Upload complete Excel files with multiple sheets
2. **Automatic Parsing**: Extract all SSR items from all sheets
3. **Batch Import**: Create multiple SSR items in one operation
4. **File Management**: Store and manage uploaded files
5. **Download**: Download original uploaded files
6. **Validation**: Validate Excel file format before processing
7. **Metadata**: Track file information, item counts, categories
8. **Duplicate Handling**: Skip items with existing codes

## API Endpoints:

- `POST /api/ssr-files/upload` - Upload SSR Excel file
- `GET /api/ssr-files` - List all uploaded files
- `GET /api/ssr-files/:id` - Get specific file details
- `GET /api/ssr-files/:id/download` - Download original file
- `DELETE /api/ssr-files/:id` - Delete file and cleanup
- `GET /api/ssr-files/:id/export` - Export current SSR items to Excel

## Usage:

1. Navigate to SSR Database page
2. Click "Upload SSR File" button
3. Select an Excel file (.xlsx or .xls)
4. Optionally add description, version, and category
5. Upload will process all sheets and create SSR items
6. View uploaded files in the files section
7. Download or manage files as needed