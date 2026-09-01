import glob
import re
import json
import os

def parse_js_args(args_str):
    # Handles quoted strings "..." or '...' or unquoted values
    # This regex captures:
    # 1. "double quoted"
    # 2. 'single quoted'
    # 3. unquoted (excluding comma)
    pattern = re.compile(r'\s*(?:"([^"]*)"|\'([^\']*)\'|([^,]+))\s*')
    args = []
    # findall might return empty strings for groups that didn't match
    for match in pattern.findall(args_str):
        val = match[0] or match[1] or match[2]
        args.append(val.strip())
    return args

def extract_data():
    data = {
        "trees": {},
        "lists": {}
    }

    # 1. Extract Trees (SMT/BRT)
    tree_files = glob.glob("en/html/*T_*.html")
    print(f"Found {len(tree_files)} tree files.")
    for filepath in tree_files:
        filename = os.path.basename(filepath)
        # filename: SMT_CL7_2003.html
        parts = filename.replace(".html", "").split("_")
        if len(parts) < 3: continue
        
        manual_type = parts[0] # SMT or BRT
        model_code = parts[1]
        year = parts[2]
        key = f"{manual_type}_{model_code}_{year}"
        
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
            continue
            
        # Regex for SearchTreeItem(0,"BA","0","","","","!T80","General Information");
        matches = re.findall(r'SearchTreeItem\((.*?)\);', content)
        
        nodes = []
        for match in matches:
            args = parse_js_args(match)
            if len(args) >= 8:
                nodes.append({
                    "level": int(args[0]),
                    "sitq": args[1],
                    "sct": args[2],
                    "sc": args[3],
                    "sys": args[4],
                    "comp": args[5],
                    "supp": args[6],
                    "name": args[7]
                })
        
        data["trees"][key] = nodes

    # 2. Extract Lists (SML/BRL)
    list_files = glob.glob("en/html/*L_*.html")
    print(f"Found {len(list_files)} list files.")
    for filepath in list_files:
        filename = os.path.basename(filepath)
        parts = filename.replace(".html", "").split("_")
        if len(parts) < 3: continue
        
        manual_type = parts[0] # SML or BRL
        model_code = parts[1]
        year = parts[2]
        key = f"{manual_type}_{model_code}_{year}"
        
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
            continue
            
        # SieTitleItem("SEA6E00...","000...","003","NA","","","","\n");
        matches = re.findall(r'SieTitleItem\((.*?)\);', content)
        
        items = []
        for match in matches:
            args = parse_js_args(match)
            if len(args) >= 4:
                sie_key = args[0]
                parsed_key = {}
                if len(sie_key) >= 25:
                    parsed_key = {
                        "sct": sie_key[7:8],
                        "sc": sie_key[8:11],
                        "sys": sie_key[11:14],
                        "comp": sie_key[14:19],
                        "sitq": sie_key[19:21],
                        "supp": sie_key[22:25]
                    }
                
                items.append({
                    "sie_key_raw": sie_key,
                    "parsed_key": parsed_key,
                    "file_id": args[1],
                    "symbol": args[2],
                    "title": args[3],
                    "subtitle": args[4] if len(args) > 4 else ""
                })
        
        data["lists"][key] = items

    output_path = "data/navigation.json"
    print(f"Writing data to {output_path}...")
    with open(output_path, "w", encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print("Done.")

if __name__ == "__main__":
    if not os.path.exists("data"):
        os.makedirs("data")
    extract_data()
