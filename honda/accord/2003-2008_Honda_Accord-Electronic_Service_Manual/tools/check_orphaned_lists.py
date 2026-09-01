import json

try:
    with open('data/navigation.json', 'r') as f:
        data = json.load(f)
        
    tree_keys = set(data.get('trees', {}).keys())
    list_keys = set(data.get('lists', {}).keys())
    
    # Convert Tree keys to expected List keys
    expected_list_keys = set()
    for k in tree_keys:
        if k.startswith('SMT_'):
            expected_list_keys.add(k.replace('SMT_', 'SML_'))
        elif k.startswith('BRT_'):
            expected_list_keys.add(k.replace('BRT_', 'BRL_'))
            
    missing_trees = list_keys - expected_list_keys
    
    print(f"Total Tree Keys: {len(tree_keys)}")
    print(f"Total List Keys: {len(list_keys)}")
    print(f"Lists without Trees: {len(missing_trees)}")
    
    if missing_trees:
        print("\nOrphaned Lists (Potential missing categories):")
        for k in sorted(missing_trees):
            print(k)

except Exception as e:
    print(f"Error: {e}")
