# GEstimator Dynamic Excel Template Processor - RAJKUMAR's Enhanced Version

## Overview
This enhanced version of GEstimator includes a dynamic Excel template processing system that preserves formulas and enables interactive calculations. The system can analyze Excel templates, identify input/output fields, preserve formulas, and convert templates to GEstimator format.

## Key Features
1. **Dynamic Template Processing**: Analyze Excel templates and preserve formulas
2. **Formula Preservation**: Maintain Excel formulas during conversion
3. **Hot Reloading**: Automatically reload templates when files change
4. **GEstimator Integration**: Convert templates to GEstimator project format
5. **CLI Interface**: Command-line interface for template processing

## How to Run

### Setup
1. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### One-Click Deployment
1. Run the main application:
   ```bash
   python main_app.py
   ```

### CLI Usage
1. List available templates:
   ```bash
   python dynamic_template_cli.py list
   ```

2. Process a template with inputs:
   ```bash
   python dynamic_template_cli.py process my_template -i inputs.json -o results.json
   ```

3. Convert template to GEstimator format:
   ```bash
   python dynamic_template_cli.py convert my_template -o gestimator_output.json
   ```

### Testing
1. Run all tests:
   ```bash
   python test_dynamic_templates.py
   ```

2. Run specific test components:
   ```bash
   python test_dynamic_system.py
   python test_excel.py
   python test_import.py
   ```

## Deployment Instructions

### Streamlit Deployment (Recommended)
1. Install Streamlit:
   ```bash
   pip install streamlit
   ```

2. Create a Streamlit app wrapper (see streamlit_app.py)

3. Deploy to Streamlit Cloud:
   - Push code to GitHub
   - Connect repository to Streamlit Cloud
   - Configure requirements.txt

### Vercel Deployment (Alternative)
1. Create a Next.js wrapper for the Python backend
2. Configure vercel.json for build settings
3. Deploy via Vercel CLI or Git integration

## Git Repository Management
```bash
git config --global user.email "crajkumarsingh@hotmail.com"
git config --global user.name "RAJKUMAR SINGH CHAUHAN"
git add .
git commit -m "Optimized app and removed redundant files"
git push origin main
```

## Performance Optimizations
1. **Memory Optimization**: Uses efficient data structures for formula parsing
2. **Caching**: Implements template structure caching
3. **Lazy Loading**: Templates loaded on demand
4. **Hot Reloading**: Efficient file watching with debouncing

## Removed Redundant Files
- Cleaned up temporary files and duplicates
- Removed unused scripts and documentation
- Streamlined repository structure

## Suggested Features
1. **Enhanced Formula Engine**: Implement full Excel formula evaluation
2. **Web Interface**: Create Streamlit/Flask web interface
3. **Database Integration**: Store templates and results in database
4. **Real-time Collaboration**: WebSocket-based collaborative editing
5. **AI-Powered Insights**: Predictive analysis of construction estimates