import json

try:
    with open('data/navigation.json', 'r') as f:
        data = json.load(f)
        
    print("Searching for 'Wiring' in lists...")
    found_wiring = False
    for list_key, items in data.get('lists', {}).items():
        for item in items:
            if 'Wiring' in item.get('title', '') or 'Wiring' in item.get('subtitle', ''):
                print(f"Found in {list_key}: {item['title']} {item['subtitle']}")
                found_wiring = True
                break # Show one per list
        if found_wiring: break # Just checking if it exists at all
        
    if not found_wiring:
        print("No explicit 'Wiring' titles found in lists.")

except Exception as e:
    print(f"Error: {e}")
