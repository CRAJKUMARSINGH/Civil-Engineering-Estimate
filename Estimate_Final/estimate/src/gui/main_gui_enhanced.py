"""
Enhanced Estimator - Main GUI Application
Supports both Bridge and Building estimates
Entry point for the application
"""
import pathlib
import sys

import PySimpleGUI as sg

# Add parent directory to path for imports
sys.path.append(str(pathlib.Path(__file__).parent.parent))

from engine.building_quantities import *
from engine.costing import load_rates, load_rates_full, total_project_cost
from engine.exporters import export_excel, export_pdf
from engine.quantities import *

# Load rates at startup
try:
    rates_bridge = load_rates()
    rates_bridge_full = load_rates_full()
except:
    rates_bridge = {}
    rates_bridge_full = None

# Load building rates
try:
    import pandas as pd
    csv_path = pathlib.Path(__file__).parent.parent / 'data' / 'building_rates_rajssr2024.csv'
    df_building = pd.read_csv(csv_path)
    rates_building = df_building.set_index('item_code')['rate_inr'].to_dict()
    rates_building_full = df_building.set_index('item_code')
except:
    rates_building = {}
    rates_building_full = None

# Set theme if available
try:
    sg.theme('LightBlue2')
except AttributeError:
    pass


def make_bridge_tab():
    """Create bridge estimation tab"""
    inputs = [
        [sg.Text('Span (m)', size=(15, 1)), sg.Input('15.0', key='bridge_span', size=(10, 1))],
        [sg.Text('Width (m)', size=(15, 1)), sg.Input('7.5', key='bridge_width', size=(10, 1))],
        [sg.Text('Deck thick (m)', size=(15, 1)), sg.Input('0.25', key='bridge_deck_thk', size=(10, 1))],
        [sg.Text('Girders #', size=(15, 1)), sg.Input('5', key='bridge_n_girders', size=(10, 1))],
        [sg.Text('Girder area (m²)', size=(15, 1)), sg.Input('0.35', key='bridge_Ag', size=(10, 1))],
        [sg.Text('Pier dia (m)', size=(15, 1)), sg.Input('1.2', key='bridge_pier_d', size=(10, 1))],
        [sg.Text('Pier height (m)', size=(15, 1)), sg.Input('6.0', key='bridge_pier_h', size=(10, 1))],
        [sg.Text('Piers #', size=(15, 1)), sg.Input('2', key='bridge_n_piers', size=(10, 1))],
        [sg.HorizontalSeparator()],
        [sg.Button('Estimate Bridge', size=(15, 1), key='estimate_bridge')]
    ]
    
    return sg.Column(inputs, vertical_alignment='top')


def make_building_tab():
    """Create building estimation tab"""
    inputs = [
        [sg.Text('Building Estimation', font=('Arial', 12, 'bold'))],
        [sg.HorizontalSeparator()],
        [sg.Text('Plot Length (m)', size=(20, 1)), sg.Input('25.0', key='bldg_length', size=(10, 1))],
        [sg.Text('Plot Width (m)', size=(20, 1)), sg.Input('20.0', key='bldg_width', size=(10, 1))],
        [sg.Text('Number of Floors', size=(20, 1)), sg.Input('3', key='bldg_floors', size=(10, 1))],
        [sg.Text('Floor Height (m)', size=(20, 1)), sg.Input('3.5', key='bldg_floor_ht', size=(10, 1))],
        [sg.Text('Slab Thickness (m)', size=(20, 1)), sg.Input('0.15', key='bldg_slab_thk', size=(10, 1))],
        [sg.Text('Wall Thickness (m)', size=(20, 1)), sg.Input('0.23', key='bldg_wall_thk', size=(10, 1))],
        [sg.Text('Number of Columns', size=(20, 1)), sg.Input('18', key='bldg_n_cols', size=(10, 1))],
        [sg.Text('Column Size (m)', size=(20, 1)), sg.Input('0.30x0.60', key='bldg_col_size', size=(10, 1))],
        [sg.HorizontalSeparator()],
        [sg.Checkbox('Include Sanitary', default=True, key='bldg_sanitary')],
        [sg.Checkbox('Include Electrical', default=True, key='bldg_electrical')],
        [sg.Checkbox('Include Flooring', default=True, key='bldg_flooring')],
        [sg.HorizontalSeparator()],
        [sg.Button('Estimate Building', size=(15, 1), key='estimate_building')]
    ]
    
    return sg.Column(inputs, vertical_alignment='top', scrollable=True, size=(400, 500))


def make_window():
    """Create the main application window"""
    
    # Output area
    output = [
        [sg.Multiline(size=(80, 25), key='out', font=('Courier New', 9), disabled=True)]
    ]
    
    # Tabs for different estimate types
    tab_layout = [
        [sg.TabGroup([[
            sg.Tab('Bridge', [[make_bridge_tab()]]),
            sg.Tab('Building', [[make_building_tab()]])
        ]])]
    ]
    
    # Export buttons
    export_buttons = [
        [sg.Button('Export Excel', size=(12, 1)), sg.Button('Export PDF', size=(12, 1)), sg.Button('Exit', size=(12, 1))]
    ]
    
    layout = [
        [sg.Text('PWD Estimator - Rajasthan SSR 2024', font=('Arial', 14, 'bold'))],
        [sg.HorizontalSeparator()],
        [sg.Column(tab_layout, vertical_alignment='top'), 
         sg.VerticalSeparator(),
         sg.Column(output, vertical_alignment='top')],
        [sg.HorizontalSeparator()],
        [sg.Column(export_buttons, justification='center')]
    ]
    
    return sg.Window('PWD Estimator', layout, finalize=True, resizable=True, size=(1200, 700))


def estimate_bridge(vals):
    """Calculate bridge estimate"""
    try:
        s = float(vals['bridge_span'])
        w = float(vals['bridge_width'])
        dt = float(vals['bridge_deck_thk'])
        ng = int(vals['bridge_n_girders'])
        Ag = float(vals['bridge_Ag'])
        pd = float(vals['bridge_pier_d'])
        ph = float(vals['bridge_pier_h'])
        np_val = int(vals['bridge_n_piers'])
    except Exception as e:
        return None, None, f'Input error: {e}'
    
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
        'FORMWORK': d_fw + ng * s * 0.4,
        'EXCAV_SOFT': 1.2 * total_conc,
    }
    
    # Calculate costs
    cost_summary = total_project_cost(boq, rates_bridge)
    
    # Format output
    out = []
    out.append('=' * 80)
    out.append('BRIDGE ESTIMATE - BILL OF QUANTITIES')
    out.append('=' * 80)
    out.append(f"{'Item Code':<15} {'Qty':>10}  {'Unit':<6} {'Rate':>10}  {'Amount':>12}")
    out.append('-' * 80)
    
    for c, q in boq.items():
        rate_val = rates_bridge.get(c, 0)
        amount = q * rate_val
        unit = rates_bridge_full.loc[c, 'unit'] if rates_bridge_full is not None and c in rates_bridge_full.index else 'unit'
        out.append(f"{c:<15} {q:>10.3f}  {unit:<6} ₹{rate_val:>9,.0f}  ₹{amount:>11,.0f}")
    
    out.append('-' * 80)
    out.append(f"{'Net Cost:':<50} ₹{cost_summary['net_cost']:>15,.0f}")
    out.append(f"{'Overhead (8%):':<50} ₹{cost_summary['overhead']:>15,.0f}")
    out.append(f"{'Contingency (10%):':<50} ₹{cost_summary['contingency']:>15,.0f}")
    out.append(f"{'GST (18%):':<50} ₹{cost_summary['gst']:>15,.0f}")
    out.append('=' * 80)
    out.append(f"{'GRAND TOTAL:':<50} ₹{cost_summary['grand_total']:>15,.0f}")
    out.append('=' * 80)
    
    return boq, cost_summary, '\n'.join(out)


def estimate_building(vals):
    """Calculate building estimate"""
    try:
        length = float(vals['bldg_length'])
        width = float(vals['bldg_width'])
        n_floors = int(vals['bldg_floors'])
        floor_ht = float(vals['bldg_floor_ht'])
        slab_thk = float(vals['bldg_slab_thk'])
        wall_thk = float(vals['bldg_wall_thk'])
        n_cols = int(vals['bldg_n_cols'])
        col_size_str = vals['bldg_col_size']
        
        # Parse column size
        col_w, col_d = map(float, col_size_str.replace('x', ' ').replace('X', ' ').split())
        
    except Exception as e:
        return None, None, f'Input error: {e}'
    
    # Calculate quantities
    floor_area = length * width
    total_height = n_floors * floor_ht
    
    # Foundation
    excav_vol = excavation_foundation(length + 2, width + 2, 1.5)
    pcc_vol = floor_area * 0.15
    
    # Columns
    col_vol = rcc_column(col_w, col_d, floor_ht, n_cols) * n_floors
    
    # Beams (approximate)
    beam_length = 2 * (length + width) * n_floors
    beam_vol = beam_length * 0.23 * 0.45
    
    # Slabs
    slab_vol = rcc_slab(floor_area, slab_thk) * n_floors
    
    # Walls (approximate perimeter walls)
    wall_vol = brick_masonry(2 * (length + width), wall_thk, total_height)
    
    # Steel
    steel_footings = steel_reinforcement(pcc_vol, 25)
    steel_cols = steel_reinforcement(col_vol, 150)
    steel_beams = steel_reinforcement(beam_vol, 250)
    steel_slabs = steel_reinforcement(slab_vol, 100)
    total_steel = steel_footings + steel_cols + steel_beams + steel_slabs
    
    # Shuttering
    shutter_cols = shuttering_area(2 * (col_w + col_d), floor_ht) * n_cols * n_floors
    shutter_beams = beam_length * 0.68  # sides
    shutter_slabs = floor_area * n_floors
    
    # Plaster
    plaster_int = plaster_area(2 * (length + width), total_height)
    plaster_ext = plaster_area(2 * (length + width), total_height)
    
    # Flooring
    flooring = floor_area * n_floors if vals['bldg_flooring'] else 0
    
    # Build BOQ
    boq = {
        'EXCAV_FOUND': excav_vol,
        'PCC_148': pcc_vol,
        'RCC_M25': col_vol + beam_vol + slab_vol,
        'STEEL_FE500': total_steel,
        'SHUTTERING_COL': shutter_cols,
        'SHUTTERING_BEAM': shutter_beams,
        'SHUTTERING_SLAB': shutter_slabs,
        'BRICK_230_CM16': wall_vol,
        'PLASTER_20MM_CM16': plaster_int + plaster_ext,
        'FLOOR_KOTA_STONE': flooring,
    }
    
    # Add sanitary if selected
    if vals['bldg_sanitary']:
        boq['SANITARY_WC'] = n_floors * 2
        boq['SANITARY_WASHBASIN'] = n_floors * 2
        boq['PLUMB_PVC_110MM'] = total_height * 2
    
    # Add electrical if selected
    if vals['bldg_electrical']:
        boq['ELEC_MCB_DB'] = n_floors
        boq['ELEC_SWITCH_SOCKET'] = floor_area * 0.5
        boq['ELEC_LED_LIGHT'] = floor_area * 0.3
    
    # Calculate costs
    cost_summary = total_project_cost(boq, rates_building)
    
    # Format output
    out = []
    out.append('=' * 80)
    out.append('BUILDING ESTIMATE - BILL OF QUANTITIES')
    out.append('=' * 80)
    out.append(f"Building: {length}m x {width}m, {n_floors} floors")
    out.append(f"Total Built-up Area: {floor_area * n_floors:.2f} sqm")
    out.append('=' * 80)
    out.append(f"{'Item Code':<20} {'Qty':>10}  {'Unit':<6} {'Rate':>10}  {'Amount':>12}")
    out.append('-' * 80)
    
    for c, q in boq.items():
        rate_val = rates_building.get(c, 0)
        amount = q * rate_val
        unit = rates_building_full.loc[c, 'unit'] if rates_building_full is not None and c in rates_building_full.index else 'unit'
        desc = rates_building_full.loc[c, 'description'][:30] if rates_building_full is not None and c in rates_building_full.index else c
        out.append(f"{c:<20} {q:>10.2f}  {unit:<6} ₹{rate_val:>9,.0f}  ₹{amount:>11,.0f}")
    
    out.append('-' * 80)
    out.append(f"{'Net Cost:':<50} ₹{cost_summary['net_cost']:>15,.0f}")
    out.append(f"{'Overhead (8%):':<50} ₹{cost_summary['overhead']:>15,.0f}")
    out.append(f"{'Contingency (10%):':<50} ₹{cost_summary['contingency']:>15,.0f}")
    out.append(f"{'GST (18%):':<50} ₹{cost_summary['gst']:>15,.0f}")
    out.append('=' * 80)
    out.append(f"{'GRAND TOTAL:':<50} ₹{cost_summary['grand_total']:>15,.0f}")
    out.append(f"{'Cost per sqm:':<50} ₹{cost_summary['grand_total']/(floor_area*n_floors):>15,.0f}")
    out.append('=' * 80)
    
    return boq, cost_summary, '\n'.join(out)


def main():
    """Main application loop"""
    window = make_window()
    boq = {}
    cost_summary = {}
    rates_current = rates_bridge
    rates_full_current = rates_bridge_full
    
    while True:
        event, vals = window.read()
        
        if event in (sg.WINDOW_CLOSED, 'Exit'):
            break
        
        if event == 'estimate_bridge':
            boq, cost_summary, output = estimate_bridge(vals)
            if boq is None:
                sg.popup_error(output)
            else:
                window['out'].update(output)
                rates_current = rates_bridge
                rates_full_current = rates_bridge_full
        
        if event == 'estimate_building':
            boq, cost_summary, output = estimate_building(vals)
            if boq is None:
                sg.popup_error(output)
            else:
                window['out'].update(output)
                rates_current = rates_building
                rates_full_current = rates_building_full
        
        if event == 'Export Excel':
            if not boq:
                sg.popup('Nothing to export. Please run an estimate first.')
                continue
            
            f = sg.popup_get_file(
                'Save Excel',
                save_as=True,
                file_types=(("Excel Files", "*.xlsx"),),
                default_extension='.xlsx',
                default_path='estimate.xlsx'
            )
            
            if f:
                try:
                    export_excel(boq, rates_current, rates_full_current, cost_summary, f)
                    sg.popup('Excel file saved successfully!')
                except Exception as e:
                    sg.popup_error(f'Export error: {e}')
        
        if event == 'Export PDF':
            if not boq:
                sg.popup('Nothing to export. Please run an estimate first.')
                continue
            
            f = sg.popup_get_file(
                'Save PDF',
                save_as=True,
                file_types=(("PDF Files", "*.pdf"),),
                default_extension='.pdf',
                default_path='estimate.pdf'
            )
            
            if f:
                try:
                    export_pdf(boq, rates_current, rates_full_current, cost_summary, f)
                    sg.popup('PDF file saved successfully!')
                except Exception as e:
                    sg.popup_error(f'Export error: {e}')
    
    window.close()


if __name__ == '__main__':
    main()
