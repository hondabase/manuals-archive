import json

try:
    with open('data/navigation.json', 'r') as f:
        data = json.load(f)
        
    if 'trees' in data:
        keys = list(data['trees'].keys())
        prefixes = set()
        print("Sample Keys:")
        for k in keys[:20]:
            print(k)
            parts = k.split('_')
            if parts:
                prefixes.add(parts[0])
        
        print("\nUnique Prefixes found in 'trees':")
        for p in prefixes:
            print(p)
            
    else:
        print("No 'trees' key found in JSON.")

except Exception as e:
    print(f"Error: {e}")
