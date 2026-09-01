import glob
import os
import re

def clean_html_files():
    files = glob.glob("en/html/*.html")
    print(f"Found {len(files)} HTML files.")
    
    # Matches onload="anything"
    re_onload = re.compile(r'onload\s*=\s*"[^"]*"', re.IGNORECASE)
    # Matches specific IE/VML junk
    re_vml_ns = re.compile(r'xmlns:v="urn:schemas-microsoft-com:vml"', re.IGNORECASE)
    
    count = 0
    for filepath in files:
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            original_content = content
            
            # 1. Remove onload (prevents looking for parent.Old)
            content = re_onload.sub('', content)
            
            # 2. Remove VML namespace
            content = re_vml_ns.sub('', content)
            
            # 3. Remove VML CSS behavior
            # Use raw string for regex-like replacement or just careful escaping
            content = content.replace(r'v\:*	{ behavior: url(#default#VML); }', '')
            
            # 4. Inject modern CSS
            # Check if we haven't already injected it
            if 'modern_content.css' not in content:
                if '</head>' in content:
                    # Use replacement without implicit newline issues
                    content = content.replace('</head>', '<link href="../../css/modern_content.css" rel="stylesheet"></head>')
            
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                count += 1
                if count % 500 == 0:
                    print(f"Processed {count} HTML files...")
        except Exception as e:
            print(f"Error processing {filepath}: {e}")
    print(f"Total HTML files processed: {count}")

def clean_js_files():
    files = glob.glob("en/js/*.js")
    print(f"Found {len(files)} JS files.")
    
    count = 0
    for filepath in files:
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            original_content = content
            
            # Replace VML tags with Divs
            content = content.replace('<v:group', '<div class="v-group"')
            content = content.replace('</v:group>', '</div>')
            
            content = content.replace('<v:rect', '<div class="v-rect"')
            content = content.replace('</v:rect>', '</div>')
            
            content = content.replace('<v:oval', '<div class="v-oval"')
            content = content.replace('</v:oval>', '</div>')
            
            content = content.replace('<v:line', '<div class="v-line"')
            content = content.replace('</v:line>', '</div>')
            
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                count += 1
                if count % 500 == 0:
                    print(f"Processed {count} JS files...")
        except Exception as e:
            print(f"Error processing {filepath}: {e}")
    print(f"Total JS files processed: {count}")

if __name__ == "__main__":
    print("Starting batch cleaning...")
    clean_html_files()
    clean_js_files()
    print("Batch cleaning complete.")