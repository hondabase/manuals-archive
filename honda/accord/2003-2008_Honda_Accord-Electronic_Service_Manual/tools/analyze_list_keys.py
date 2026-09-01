import json

try:
    with open('data/navigation.json', 'r') as f:
        data = json.load(f)
        
    if 'lists' in data:
        keys = list(data['lists'].keys())
        prefixes = set()
        print("\nSample List Keys:")
        for k in keys[:20]:
            print(k)
            parts = k.split('_')
            if parts:
                prefixes.add(parts[0])
        
        print("\nUnique Prefixes found in 'lists':")
        for p in prefixes:
            print(p)
            
except Exception as e:
    print(f"Error: {e}")
