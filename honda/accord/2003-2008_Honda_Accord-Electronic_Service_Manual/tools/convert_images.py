import os
import re
import glob

HTML_DIR = 'en/html'
IMG_DIR = 'en/img'

def convert_images():
    # Pattern to match the anchor tag wrapping the thumbnail image
    # <a href="javascript:parent.Prt('...','...');">
    # <img src="../tn/...">
    # </a>
    
    # We use DOTALL so . matches newlines.
    pattern = re.compile(
        r'(<a\s+href="javascript:parent\.Prt\([^\)]+\);"[^>]*>\s*<img\s+src="\.\./tn/([^"]+)\.png"[^>]*>\s*</a>)',
        re.IGNORECASE | re.DOTALL
    )

    files = glob.glob(os.path.join(HTML_DIR, '*.html'))
    print(f"Found {len(files)} HTML files.")

    count = 0
    missing_images = 0

    for file_path in files:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        new_content = content
        
        # Replacement function
        def replacement(match):
            nonlocal missing_images
            full_match = match.group(1)
            base_name_raw = match.group(2)
            
            # Clean up base_name (remove newlines/spaces)
            base_name = re.sub(r'\s+', '', base_name_raw)
            
            # Check for .PNG first (most common in en/img/)
            full_img_path = os.path.join(IMG_DIR, base_name + '.PNG')
            if os.path.exists(full_img_path):
                return f'<img src="../img/{base_name}.PNG" style="max-width:100%">'
            
            # Check for .png
            full_img_path_lower = os.path.join(IMG_DIR, base_name + '.png')
            if os.path.exists(full_img_path_lower):
                return f'<img src="../img/{base_name}.png" style="max-width:100%">'
            
            # If not found, keep original
            print(f"Warning: Image not found for {base_name} in {file_path}")
            missing_images += 1
            return full_match

        new_content = pattern.sub(replacement, content)

        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            count += 1

    print(f"Processed {len(files)} files.")
    print(f"Modified {count} files.")
    print(f"Missing images references: {missing_images}")

if __name__ == '__main__':
    convert_images()
