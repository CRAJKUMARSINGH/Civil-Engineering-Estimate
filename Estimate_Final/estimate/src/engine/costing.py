"""
Costing engine with rate loading and cost calculations
"""
import pathlib
import sys

import pandas as pd


def get_csv_path():
    """Get the path to unit rates CSV"""
    # Handle both development and PyInstaller bundled scenarios
    if getattr(sys, 'frozen', False):
        # Running as compiled executable
        base_path = pathlib.Path(sys._MEIPASS)
    else:
        # Running as script
        base_path = pathlib.Path(__file__).parent.parent
    
    return base_path / 'data' / 'unit_rates_rajssr2024.csv'


def load_rates():
    """Load unit rates from CSV file"""
    csv_path = get_csv_path()
    df = pd.read_csv(csv_path)
    return df.set_index('item_code')['rate_inr'].to_dict()


def load_rates_full():
    """Load full rate data including descriptions and units"""
    csv_path = get_csv_path()
    return pd.read_csv(csv_path).set_index('item_code')


def cost_item(qty, item_code, rates):
    """Calculate cost for a single item"""
    return qty * rates.get(item_code, 0)


def total_project_cost(boq_dict, rates, overhead=0.08, contingency=0.10, gst=0.18):
    """
    Calculate total project cost with overheads
    
    Parameters:
    - boq_dict: Dictionary of {item_code: quantity}
    - rates: Dictionary of {item_code: rate}
    - overhead: Overhead percentage (default 8%)
    - contingency: Contingency percentage (default 10%)
    - gst: GST percentage (default 18%)
    """
    net = sum(cost_item(q, code, rates) for code, q in boq_dict.items())
    oh = net * overhead
    cont = (net + oh) * contingency
    tax = (net + oh + cont) * gst
    
    return {
        'net_cost': net,
        'overhead': oh,
        'contingency': cont,
        'gst': tax,
        'grand_total': net + oh + cont + tax
    }
