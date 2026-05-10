# Bridge Estimator - Rajasthan SSR 2024

A Windows desktop application for bridge construction cost estimation using Rajasthan SSR 2024 unit rates.

## Features

- Quantity calculation engine (deck, girders, piers, abutments, earthwork, formwork, steel)
- Live Rajasthan SSR 2024 unit rates (60+ items)
- Excel & PDF BOQ export
- Single-file Windows executable (no Python installation required)

## Installation

### For Development

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Run the Application

```bash
python src/gui/main_gui.py
```

## Building the Executable

```bash
python build/build_exe.py
```

The executable will be created in `dist\BridgeEstimator.exe`

## Project Structure

```
bridge-estimator/
├── src/
│   ├── engine/          # Calculation engines
│   ├── gui/             # GUI interface
│   └── data/            # Unit rates database
├── build/               # Build scripts
└── dist/                # Output executables
```

## License

MIT License
