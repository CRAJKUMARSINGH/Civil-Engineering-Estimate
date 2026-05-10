✅ PrecisionEstimator – Development To-Do List (Updated)

🧾 Price Sheet & Service Management

Create data/price_sheet.csv with all service types and pricing ranges (ongoing refinement)

Build function to load and validate the CSV data

Add support for dynamic updates to pricing (e.g., seasonal pricing, taxes, etc.)

    Add custom notes per service (e.g., special conditions or disclaimers)

🛠️ Core Features

CLI interface for selecting service type

Input by square footage, linear footage, or unit count

Allow multiple services in a single quote

Add unit validation and error handling

    Save past estimates to a local history file (e.g., JSON or CSV)

🧾 Output & Reporting

Format output estimate with a heading and date

Add PDF export using ReportLab

Add CSV export of estimate data

    Create printable “Client Quote Sheet” with logo and signature area

🎨 GUI (In Progress — Tkinter)

Design basic GUI using Tkinter

Add dropdowns for service selection

Input fields for quantities

Estimate display panel

Export button (PDF, CSV)

Add field for client name & project address

Add "Clear All" or "New Estimate" reset button

Add date/time auto-stamp to estimate

    Improve GUI layout and styling for easier readability

🌐 Web App (Later Phase)

Flask or FastAPI backend

React or plain HTML/JS frontend

Login/session handling for multiple users

    Admin panel for editing price sheet data

🧪 Testing & QA

Set up tests/ directory with unit tests (e.g., test_core.py)

Write tests for:

    Service loading

    Calculation logic

    Input validation

    Add test data CSV for mock runs

📝 Documentation & Wiki

Create wiki Home page

Create “Using the Estimator” wiki page

Create “Customizing the Price Sheet” page

Add “Roadmap” wiki page

    Add “Contributing” wiki page

⚙️ DevOps / Repo Management

Create README.md

Add LICENSE (MIT)

Create .gitignore for Python

Add GitHub topics/tags to improve repo visibility

Set up GitHub Actions for automated testing (optional)
