# Civil Engineering Estimate Workbench

A professional, high-performance web platform for civil engineering estimation, consolidated from legacy Excel-based tools into a modern Full-Stack suite.

## 🚀 Features
- **Multi-Component Architecture**: Unified General Abstract with multiple Component Abstract/Measurement sheet pairs.
- **Smart Formula Engine**: Automatic Excel formula generation based on units (`cum`, `sqm`, `m`, `MT`, `Kg`).
- **Hierarchical Item Management**: Support for deep (a, b, c, d) SOR hierarchies with "Silent Reaper" recursive deletion.
- **Massive Project Library**: 44+ real-world project samples converted from legacy `.xls` estimates.
- **Premium UI**: Glassmorphism dark-mode interface designed for high productivity.
- **Live-Link Export**: Exports formula-linked, print-ready A4 Portrait Excel workbooks.

## 🛠️ Technology Stack
- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons.
- **Backend**: FastAPI, Openpyxl, Pandas.
- **Deployment**: Optimized for Vercel/Netlify.

## 📦 Project Structure
- `/api`: Core FastAPI application and Multi-Component Engine.
- `/api/modules`: Advanced modules for Fuzzy Search, Analytics, and SOR Integration.
- `/src`: React source code and component library.
- `/src/seed`: Pre-loaded project sample database.
- `/public/data`: Comprehensive library of BSR PDFs, Excel SORs, and reference projects.

## 🚦 Getting Started

### Local Development
1. Install Python dependencies: `pip install -r requirements.txt`
2. Install Frontend dependencies: `npm install`
3. Run Backend: `uvicorn api.index:app --reload`
4. Run Frontend: `npm run dev`

### Deployment
Connect this repository to **Vercel**. It will automatically detect the Vite frontend and Python API functions.

---
*Developed by Antigravity AI*
