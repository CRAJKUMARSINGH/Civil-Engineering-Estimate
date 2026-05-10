"""
Bridge Estimator - Main GUI Application
Entry point for the application
"""
import pathlib
import sys

import PySimpleGUI as sg

# Add parent directory to path for imports
sys.path.append(str(pathlib.Path(__file__).parent.parent))

from engine.costing import load_rates, load_rates_full, total_project_cost
from engine.exporters import export_excel, export_pdf
from engine.quantities import *

# Load rates at startup
rates = load_rates()
rates_full = load_rates_full()

# Set theme if available (compatibility with different PySimpleGUI versions)
try:
    sg.theme('LightBlue2')
except AttributeError:
    pass  # Older or newer versions may not have theme


def make_window():
    """Create the main application window"""
    
    inputs = [
        [sg.Text('Span (m)', size=(15, 1)), sg.Input('15.0', key='span', size=(10, 1))],
        [sg.Text('Width (m)', size=(15, 1)), sg.Input('7.5', key='width', size=(10, 1))],
        [sg.Text('Deck thick (m)', size=(15, 1)), sg.Input('0.25', key='deck_thk', size=(10, 1))],
        [sg.Text('Girders #', size=(15, 1)), sg.Input('5', key='n_girders', size=(10, 1))],
        [sg.Text('Girder area (m²)', size=(15, 1)), sg.Input('0.35', key='Ag', size=(10, 1))],
        [sg.Text('Pier dia (m)', size=(15, 1)), sg.Input('1.2', key='pier_d', size=(10, 1))],
        [sg.Text('Pier height (m)', size=(15, 1)), sg.Input('6.0', key='pier_h', size=(10, 1))],
        [sg.Text('Piers #', size=(15, 1)), sg.Input('2', key='n_piers', size=(10, 1))],
        [sg.HorizontalSeparator()],
        [sg.Button('Estimate', size=(12, 1)), sg.Button('Export Excel', size=(12, 1))],
        [sg.Button('Export PDF', size=(12, 1)), sg.Button('Exit', size=(12, 1))]
    ]
    
    output = [
        [sg.Multiline(size=(70, 20), key='out', font=('Courier New', 9), disabled=True)]
    ]
    
    layout = [
        [sg.Text('Bridge Estimator - Rajasthan SSR 2024', font=('Arial', 14, 'bold'))],
        [sg.HorizontalSeparator()],
        [sg.Column(inputs, vertical_alignment='top'), 
         sg.VerticalSeparator(),
         sg.Column(output, vertical_alignment='top')]
    ]
    
    return sg.Window('Bridge Estimator', layout, finalize=True, resizable=True)


def main():
    """Main application loop"""
    window = make_window()
    boq = {}  # Global buffer for BOQ
    cost_summary = {}  # Cost summary buffer
    
    while True:
        event, vals = window.read()
        
        if event in (sg.WINDOW_CLOSED, 'Exit'):
            break
        
        if event == 'Estimate':
            try:
                # Parse inputs
                s = float(vals['span'])
                w = float(vals['width'])
                dt = float(vals['deck_thk'])
                ng = int(vals['n_girders'])
                Ag = float(vals['Ag'])
                pd = float(vals['pier_d'])
                ph = float(vals['pier_h'])
                np_val = int(vals['n_piers'])
                
            except Exception as e:
                sg.popup_error(f'Input error: {e}')
                continue
            
            # Calculate quantities
            d_conc = deck_concrete(s, w, dt)
            d_fw = deck_formwork(s, w)
            g_conc = girder_concrete(ng, s, Ag)
            p_conc = pier_concrete(pd, ph, np_val)
            total_conc = d_conc + g_conc + p_conc
            steel_kg = steel_from_concrete(total_conc)
            
            # Build BOQ
            boq = {
                'CONC_M30': total_conc,
                'REBAR_FE500': steel_kg,
                'FORMWORK': d_fw + ng * s * 0.4,  # soffit + girder sides
                'EXCAV_SOFT': 1.2 * total_conc,  # rule-of-thumb
            }
            
            # Calculate costs
            cost_summary = total_project_cost(boq, rates)
            
            # Format output
            out = []
            out.append('=' * 70)
            out.append('BILL OF QUANTITIES')
            out.append('=' * 70)
            out.append(f"{'Item Code':<15} {'Qty':>10}  {'Unit':<6} {'Rate':>10}  {'Amount':>12}")
            out.append('-' * 70)
            
            for c, q in boq.items():
                rate_val = rates.get(c, 0)
                amount = q * rate_val
                unit = rates_full.loc[c, 'unit'] if c in rates_full.index else 'unit'
                out.append(f"{c:<15} {q:>10.3f}  {unit:<6} ₹{rate_val:>9,.0f}  ₹{amount:>11,.0f}")
            
            out.append('-' * 70)
            out.append(f"{'Net Cost:':<50} ₹{cost_summary['net_cost']:>15,.0f}")
            out.append(f"{'Overhead (8%):':<50} ₹{cost_summary['overhead']:>15,.0f}")
            out.append(f"{'Contingency (10%):':<50} ₹{cost_summary['contingency']:>15,.0f}")
            out.append(f"{'GST (18%):':<50} ₹{cost_summary['gst']:>15,.0f}")
            out.append('=' * 70)
            out.append(f"{'GRAND TOTAL:':<50} ₹{cost_summary['grand_total']:>15,.0f}")
            out.append('=' * 70)
            
            window['out'].update('\n'.join(out))
        
        if event == 'Export Excel':
            if not boq:
                sg.popup('Nothing to export. Please run Estimate first.')
                continue
            
            f = sg.popup_get_file(
                'Save Excel',
                save_as=True,
                file_types=(("Excel Files", "*.xlsx"),),
                default_extension='.xlsx',
                default_path='bridge_estimate.xlsx'
            )
            
            if f:
                try:
                    export_excel(boq, rates, rates_full, cost_summary, f)
                    sg.popup('Excel file saved successfully!')
                except Exception as e:
                    sg.popup_error(f'Export error: {e}')
        
        if event == 'Export PDF':
            if not boq:
                sg.popup('Nothing to export. Please run Estimate first.')
                continue
            
            f = sg.popup_get_file(
                'Save PDF',
                save_as=True,
                file_types=(("PDF Files", "*.pdf"),),
                default_extension='.pdf',
                default_path='bridge_estimate.pdf'
            )
            
            if f:
                try:
                    export_pdf(boq, rates, rates_full, cost_summary, f)
                    sg.popup('PDF file saved successfully!')
                except Exception as e:
                    sg.popup_error(f'Export error: {e}')
    
    window.close()


if __name__ == '__main__':
    main()
