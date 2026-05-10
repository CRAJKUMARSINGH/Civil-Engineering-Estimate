"""
Quantity calculation functions for bridge components
"""
import math


def deck_concrete(span, width, deck_thk):
    """Calculate deck slab concrete volume"""
    return span * width * deck_thk


def deck_formwork(span, width):
    """Calculate deck formwork area (soffit only)"""
    return span * width


def girder_concrete(n_girders, span, area_m2):
    """Calculate total girder concrete volume"""
    return n_girders * span * area_m2


def pier_concrete(dia_m, height_m, n_piers):
    """Calculate pier concrete volume (circular piers)"""
    vol = math.pi / 4 * dia_m**2 * height_m
    return vol * n_piers


def abutment_wall_concrete(height, length, width):
    """Calculate abutment wall concrete volume"""
    return height * length * width


def steel_from_concrete(conc_m3, ratio=0.012, density=7850):
    """
    Calculate steel reinforcement from concrete volume
    ratio = steel mass / concrete mass (≈1.2% for bridge)
    """
    conc_mass = conc_m3 * 2400  # concrete density kg/m3
    return conc_mass * ratio  # kg


def excavation_open_foundation(pit_L, pit_W, pit_D, n_pits):
    """Calculate excavation volume for open foundations"""
    return pit_L * pit_W * pit_D * n_pits


def formwork_sides(perimeter, height):
    """Calculate formwork for vertical sides"""
    return perimeter * height


def backfill_volume(excav_vol, concrete_vol):
    """Calculate backfill volume"""
    return excav_vol - concrete_vol
