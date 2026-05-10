"""
Quick Interactive Estimate Creator
===================================
Create simple one-line estimates interactively
"""

from create_simple_estimate import create_simple_estimate


def get_input(prompt, default=None, input_type=str):
    """Get user input with default value"""
    if default:
        prompt = f"{prompt} [{default}]: "
    else:
        prompt = f"{prompt}: "
    
    value = input(prompt).strip()
    
    if not value and default:
        return default
    
    if input_type == float:
        return float(value) if value else 0.0
    elif input_type == int:
        return int(value) if value else 0
    else:
        return value


def main():
    """Interactive estimate creator"""
    print("\n" + "="*80)
    print("QUICK ESTIMATE CREATOR")
    print("="*80)
    print("\nCreate a simple one-line measurement estimate")
    print()
    
    # Get inputs
    work_name = get_input("Name of Work", "Construction of Building")
    item_description = get_input("Item Description", "Earth work in excavation")
    
    print("\n--- Measurements ---")
    nos = get_input("Nos", 1, int)
    length = get_input("Length (m)", 0.0, float)
    breadth = get_input("Breadth (m)", 0.0, float)
    height = get_input("Height (m)", 0.0, float)
    
    print("\n--- Rate ---")
    unit = get_input("Unit", "Cum")
    rate = get_input("Rate (₹)", 0.0, float)
    
    print("\n--- Project Details ---")
    location = get_input("Location", "Udaipur")
    client = get_input("Client", "PWD Rajasthan")
    engineer = get_input("Engineer", "Er. Rajkumar")
    
    # Create estimate
    print("\n" + "-"*80)
    print("Creating estimate...")
    
    result = create_simple_estimate(
        work_name=work_name,
        item_description=item_description,
        nos=nos,
        length=length,
        breadth=breadth,
        height=height,
        unit=unit,
        rate=rate,
        location=location,
        client=client,
        engineer=engineer
    )
    
    # Show results
    print("\n" + "="*80)
    print("✅ ESTIMATE CREATED SUCCESSFULLY!")
    print("="*80)
    print(f"\nWork: {result['work_name']}")
    print(f"Quantity: {result['quantity']:.3f} {unit}")
    print(f"Amount: ₹{result['amount']:,.2f}")
    print(f"\nFile: {result['file_name']}")
    print(f"Location: {result['file_path']}")
    print("\n" + "="*80)


if __name__ == "__main__":
    main()
