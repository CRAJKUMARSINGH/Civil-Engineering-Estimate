"""
Quantity calculation functions for building components
Based on PWD specifications and measurements
"""


def excavation_foundation(length, breadth, depth):
    """Calculate excavation volume for foundation"""
    return length * breadth * depth


def earth_filling(area, depth, deductions=0):
    """Calculate earth filling volume"""
    net_area = area - deductions
    return net_area * depth


def pcc_foundation(footings_list):
    """
    Calculate PCC (Plain Cement Concrete) for footings
    footings_list: list of tuples [(length, breadth, thickness), ...]
    """
    total = 0
    for length, breadth, thickness in footings_list:
        total += length * breadth * thickness
    return total


def rcc_footing(footings_list):
    """
    Calculate RCC footing volume
    footings_list: list of tuples [(length, breadth, height), ...]
    """
    total = 0
    for length, breadth, height in footings_list:
        total += length * breadth * height
    return total


def rcc_column(width, depth, height, n_columns):
    """Calculate RCC column volume"""
    return width * depth * height * n_columns


def rcc_beam(length, width, depth):
    """Calculate RCC beam volume"""
    return length * width * depth


def rcc_slab(area, thickness):
    """Calculate RCC slab volume"""
    return area * thickness


def brick_masonry(length, thickness, height):
    """Calculate brick masonry volume"""
    return length * thickness * height


def plaster_area(length, height, deductions=0):
    """Calculate plaster area"""
    gross_area = length * height
    return gross_area - deductions


def flooring_area(length, breadth, deductions=0):
    """Calculate flooring area"""
    gross_area = length * breadth
    return gross_area - deductions


def steel_reinforcement(concrete_volume, ratio_kg_per_cum):
    """
    Calculate steel reinforcement
    ratio_kg_per_cum: typical values
    - Footings: 25 kg/cum
    - Beams: 250 kg/cum
    - Slabs: 35-100 kg/cum
    - Columns: 125-400 kg/cum
    """
    return concrete_volume * ratio_kg_per_cum


def shuttering_area(perimeter, height):
    """Calculate shuttering/formwork area"""
    return perimeter * height


def door_window_area(width, height, nos):
    """Calculate door/window area"""
    return width * height * nos


def painting_area(surface_area, coats=2):
    """Calculate painting area (multiply by number of coats)"""
    return surface_area * coats


def waterproofing_area(roof_area):
    """Calculate waterproofing area (typically roof area)"""
    return roof_area


def tile_area(floor_area):
    """Calculate tile area"""
    return floor_area
