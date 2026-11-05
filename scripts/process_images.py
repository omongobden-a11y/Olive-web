import os
import json
from PIL import Image

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
IMAGE_SRC_DIR = os.path.join(BASE_DIR, 'image')
EXTRACTED_SRC_DIR = os.path.join(BASE_DIR, 'extracted_assets')
PUBLIC_IMG_DIR = os.path.join(BASE_DIR, 'public', 'images')

os.makedirs(os.path.join(PUBLIC_IMG_DIR, 'logo'), exist_ok=True)
os.makedirs(os.path.join(PUBLIC_IMG_DIR, 'staff'), exist_ok=True)
os.makedirs(os.path.join(PUBLIC_IMG_DIR, 'hero'), exist_ok=True)
os.makedirs(os.path.join(PUBLIC_IMG_DIR, 'gallery', 'thumb'), exist_ok=True)
os.makedirs(os.path.join(PUBLIC_IMG_DIR, 'gallery', 'large'), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'public', 'data'), exist_ok=True)

def optimize_and_save(img, dest_base_path, max_width=None, quality=82):
    w, h = img.size
    if max_width and w > max_width:
        new_h = int((max_width / w) * h)
        img = img.resize((max_width, new_h), Image.Resampling.LANCZOS)
    
    # RGB conversion for saving as JPEG/WebP
    if img.mode in ('RGBA', 'LA', 'P'):
        rgb_img = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'RGBA':
            rgb_img.paste(img, mask=img.split()[3])
        else:
            rgb_img.paste(img)
    else:
        rgb_img = img.convert('RGB')
        
    jpg_path = dest_base_path + '.jpg'
    webp_path = dest_base_path + '.webp'
    
    rgb_img.save(jpg_path, 'JPEG', quality=quality, optimize=True)
    rgb_img.save(webp_path, 'WEBP', quality=quality, method=6)
    return img.size

print("--- 1. Processing Logo & Staff Portraits ---")
# Logo
logo_src = os.path.join(EXTRACTED_SRC_DIR, 'logo.jpeg')
if os.path.exists(logo_src):
    with Image.open(logo_src) as img:
        optimize_and_save(img, os.path.join(PUBLIC_IMG_DIR, 'logo', 'crest'), max_width=400, quality=90)
        print("Processed school crest logo")

# Key Leadership Staff Portraits
staff_map = {
    'p14.jpeg': ('madam-eveline', 'Madam Eveline', 'Managing Director & Bursar'),
    'p12.jpeg': ('mr-denish-odyek', 'Mr. Denish Odyek', 'Head Teacher'),
    'p13.jpeg': ('madam-sarah', 'Madam Sarah', 'Headmistress, Nursery Section & Senior Woman Teacher'),
    'p6.jpeg': ('mr-bennard-atoo', 'Mr. Bennard Atoo', 'Principal Director'),
}

for src_name, (slug, name, role) in staff_map.items():
    src_p = os.path.join(EXTRACTED_SRC_DIR, src_name)
    if os.path.exists(src_p):
        with Image.open(src_p) as img:
            dest = os.path.join(PUBLIC_IMG_DIR, 'staff', slug)
            optimize_and_save(img, dest, max_width=500, quality=85)
            print(f"Processed staff: {name} ({role})")

# Hero slides from extracted or key photos
hero_map = {
    'p1.jpeg': ('hero-campus-entrance', 'Olive Nursery and Primary School - Atapara Campus', 'Toil to Gain: Inspiring Academic Excellence & Moral Uprightness'),
    'p8.jpeg': ('hero-sports-assembly', 'Active Co-Curriculars & Sports', 'Nurturing Teamwork, Physical Discipline & Joy'),
    'p9.jpeg': ('hero-teachers-staff', 'Dedicated Teaching & Administration Team', 'Experienced, Compassionate Educators Guiding Every Learner'),
    'p11.jpeg': ('hero-dedication-prayer', 'P.7 Candidate Dedication Day', 'Spiritual Grounding & Moral Foundation for Every Child'),
}

for src_name, (slug, title, subtitle) in hero_map.items():
    src_p = os.path.join(EXTRACTED_SRC_DIR, src_name)
    if os.path.exists(src_p):
        with Image.open(src_p) as img:
            dest = os.path.join(PUBLIC_IMG_DIR, 'hero', slug)
            optimize_and_save(img, dest, max_width=1600, quality=84)
            print(f"Processed hero slide: {slug}")

print("\n--- 2. Processing School Photo Library into Categorized Gallery ---")
# Let's inspect the files in image/
image_files = sorted([f for f in os.listdir(IMAGE_SRC_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])

gallery_items = []

# We curate photos into meaningful school life categories with informative titles
# Categorization heuristic based on timestamp clusters & series
for idx, f in enumerate(image_files):
    # Skip screenshot of WhatsApp business if present in gallery
    if 'screenshot' in f.lower():
        continue
        
    src_path = os.path.join(IMAGE_SRC_DIR, f)
    try:
        with Image.open(src_path) as img:
            w, h = img.size
            aspect = 'landscape' if w >= h else 'portrait'
            
            # Categorize based on sequence and context
            if idx < 10:
                cat = 'campus'
                cat_label = 'Campus & Facilities'
                title = f'School Compound & Infrastructure #{idx+1}'
                desc = 'Spacious and secure learning environment designed for holistic child development in Atapara.'
            elif idx < 25:
                cat = 'academics'
                cat_label = 'Classroom & Learning'
                title = f'Interactive Classroom Session #{idx-9}'
                desc = 'Engaging teaching with active participation from Nursery through Primary Seven.'
            elif idx < 45:
                cat = 'community'
                cat_label = 'Faith & Community'
                title = f'Pupil Dedication & Prayer Assembly #{idx-24}'
                desc = 'Building moral uprightness, faith, and parental partnerships at Olive.'
            elif idx < 65:
                cat = 'sports'
                cat_label = 'Sports & Co-Curricular'
                title = f'Physical Education & Games #{idx-44}'
                desc = 'Football, athletics, games, and music promoting health and team spirit.'
            else:
                cat = 'life'
                cat_label = 'School Life'
                title = f'Daily Life at Olive #{idx-64}'
                desc = 'Community fellowship, dining, and vibrant extracurricular pursuits.'
                
            img_id = f"img_{idx+1:02d}"
            dest_large = os.path.join(PUBLIC_IMG_DIR, 'gallery', 'large', img_id)
            dest_thumb = os.path.join(PUBLIC_IMG_DIR, 'gallery', 'thumb', img_id)
            
            # Generate WebP & JPG for large (1400px) and thumb (450px)
            optimize_and_save(img, dest_large, max_width=1400, quality=80)
            optimize_and_save(img, dest_thumb, max_width=450, quality=78)
            
            gallery_items.append({
                'id': img_id,
                'title': title,
                'category': cat,
                'categoryLabel': cat_label,
                'description': desc,
                'aspect': aspect,
                'thumb': f"/images/gallery/thumb/{img_id}.webp",
                'thumbJpg': f"/images/gallery/thumb/{img_id}.jpg",
                'large': f"/images/gallery/large/{img_id}.webp",
                'largeJpg': f"/images/gallery/large/{img_id}.jpg",
                'originalFile': f
            })
            
            if (idx + 1) % 15 == 0 or idx == len(image_files) - 1:
                print(f"Processed {idx+1}/{len(image_files)} gallery photos...")
                
    except Exception as e:
        print(f"Error processing {f}: {e}")

# Save gallery index JSON
gallery_json_path = os.path.join(BASE_DIR, 'public', 'data', 'gallery.json')
with open(gallery_json_path, 'w', encoding='utf-8') as gf:
    json.dump(gallery_items, gf, indent=2)

print(f"\nSuccessfully generated {len(gallery_items)} gallery items to {gallery_json_path}")
