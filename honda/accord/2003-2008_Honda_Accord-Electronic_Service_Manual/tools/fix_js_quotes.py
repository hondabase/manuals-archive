import glob

def fix_js_quotes():
    files = glob.glob("en/js/*.js")
    print(f"Fixing quotes in {len(files)} JS files...")
    
    count = 0
    for filepath in files:
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            original_content = content
            
            # Fix the broken quotes from previous step
            # We inserted class="v-group" into a double-quoted string.
            # Change to class='v-group'
            content = content.replace('class="v-group"', "class='v-group'")
            content = content.replace('class="v-rect"', "class='v-rect'")
            content = content.replace('class="v-oval"', "class='v-oval'")
            content = content.replace('class="v-line"', "class='v-line'")
            
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                count += 1
                if count % 1000 == 0:
                    print(f"Fixed {count} JS files...")
        except Exception as e:
            print(f"Error processing {filepath}: {e}")
            
    print(f"Total JS files fixed: {count}")

if __name__ == "__main__":
    fix_js_quotes()
