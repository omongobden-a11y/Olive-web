import os
import json
from PIL import Image

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
IMAGE_SRC_DIR = os.path.join(BASE_DIR, 'image')
PUBLIC_IMG_DIR = os.path.join(BASE_DIR, 'public', 'images')

os.makedirs(os.path.join(PUBLIC_IMG_DIR, 'gallery', 'thumb'), exist_ok=True)
os.makedirs(os.path.join(PUBLIC_IMG_DIR, 'gallery', 'large'), exist_ok=True)
os.makedirs(os.path.join(PUBLIC_IMG_DIR, 'hero'), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'public', 'data'), exist_ok=True)

# 30 curated, distinct, ultra-sharp photos with NO duplicates
# Categorized into: compound (School Grounds), learning (Classrooms), prayer (Prayer & Dedication), sports (Sports & Games), life (School Life)
CURATED_PHOTOS = [
  # School Grounds & Buildings
  { 'file': '20261026_125547.jpg', 'cat': 'grounds', 'label': 'School Grounds', 'title': 'Olive School Main Compound', 'desc': 'Wide view of the school buildings, trees, and clean grounds in Atapara.' },
  { 'file': '20261026_125634.jpg', 'cat': 'grounds', 'label': 'School Grounds', 'title': 'Classroom Blocks & Verandah', 'desc': 'Spacious brick classroom blocks providing good shade and safe study spaces.' },
  { 'file': '20261026_125657.jpg', 'cat': 'grounds', 'label': 'School Grounds', 'title': 'School Pathways & Flowers', 'desc': 'Well-kept school compound with flowers and green playing areas.' },
  { 'file': '20261026_172826.jpg', 'cat': 'grounds', 'label': 'School Grounds', 'title': 'Administration Office Block', 'desc': 'Where parents meet the Head Teacher, Directors, and Bursar.' },
  { 'file': '20261026_181648.jpg', 'cat': 'grounds', 'label': 'School Grounds', 'title': 'School Boarding Houses', 'desc': 'Safe and secure dormitories with matrons looking after boys and girls.' },

  # Classroom & Learning
  { 'file': '20261026_130331_001.jpg', 'cat': 'learning', 'label': 'Classrooms', 'title': 'Pupils During Reading Class', 'desc': 'Children reading English books and writing exercises on desks.' },
  { 'file': '20261026_172555.jpg', 'cat': 'learning', 'label': 'Classrooms', 'title': 'Teacher Explaining Lesson on Blackboard', 'desc': 'Interactive teaching with pupils asking questions and taking notes.' },
  { 'file': '20261026_174903.jpg', 'cat': 'learning', 'label': 'Classrooms', 'title': 'Nursery Section Phonics & Letters', 'desc': 'Little children learning ABC, counting numbers, and drawing shapes.' },
  { 'file': 'IMG-20261026-WA0008.jpg', 'cat': 'learning', 'label': 'Classrooms', 'title': 'Pupils Sitting for Class Tests', 'desc': 'Quiet and disciplined classroom during end-of-month assessments.' },
  { 'file': 'IMG-20261026-WA0011.jpg', 'cat': 'learning', 'label': 'Classrooms', 'title': 'Science Lesson & Experiments', 'desc': 'Children observing plants and practical science specimens.' },
  { 'file': 'IMG-20261026-WA0014.jpg', 'cat': 'learning', 'label': 'Classrooms', 'title': 'Primary Seven Pupils in Study', 'desc': 'Candidate class preparing hard for Primary Leaving Examinations.' },

  # Prayer & Dedication Day
  { 'file': '20261026_175348.jpg', 'cat': 'prayer', 'label': 'Prayers & Values', 'title': 'P.7 Candidates in Full Uniform', 'desc': 'Candidates gathered for the special dedication prayer before exams.' },
  { 'file': '20261026_175557.jpg', 'cat': 'prayer', 'label': 'Prayers & Values', 'title': 'Parents & Teachers Praying Together', 'desc': 'Parents joining hands with school leaders to pray for the children.' },
  { 'file': '20261026_180124.jpg', 'cat': 'prayer', 'label': 'Prayers & Values', 'title': 'Clergy Blessing the Candidates', 'desc': 'Church ministers praying and blessing the P.7 pupils on speech day.' },
  { 'file': '20261026_180234.jpg', 'cat': 'prayer', 'label': 'Prayers & Values', 'title': 'Candidates Receiving Blessed Pens', 'desc': 'Pupils receiving examination pens and prayer cards from the Head Teacher.' },
  { 'file': '20261026_180303.jpg', 'cat': 'prayer', 'label': 'Prayers & Values', 'title': 'Singing School Hymns & Anthems', 'desc': 'Pupils choir singing the school anthem and songs of praise.' },
  { 'file': '20261026_180427.jpg', 'cat': 'prayer', 'label': 'Prayers & Values', 'title': 'Managing Director Encouraging Pupils', 'desc': 'Madam Eveline giving words of encouragement to candidates and parents.' },

  # Sports & Games
  { 'file': '20261026_180509.jpg', 'cat': 'sports', 'label': 'Sports & Games', 'title': 'Football & Games on School Field', 'desc': 'Pupils playing football on the green pitch after evening classes.' },
  { 'file': '20261026_180800.jpg', 'cat': 'sports', 'label': 'Sports & Games', 'title': 'Girls Playing Netball Match', 'desc': 'Inter-house netball competition with teachers cheering the teams.' },
  { 'file': '20261026_180826.jpg', 'cat': 'sports', 'label': 'Sports & Games', 'title': 'Athletics & Running Track', 'desc': 'Pupils participating in races, jumps, and fun games.' },
  { 'file': '20261026_180948.jpg', 'cat': 'sports', 'label': 'Sports & Games', 'title': 'Music, Dance and Drama (MDD)', 'desc': 'Children performing traditional cultural dances with drums and songs.' },
  { 'file': '20261026_181110.jpg', 'cat': 'sports', 'label': 'Sports & Games', 'title': 'Debating Club in Session', 'desc': 'Pupils speaking with confidence in the school hall during debate.' },

  # School Life & Meals
  { 'file': '20261026_181147.jpg', 'cat': 'life', 'label': 'School Life', 'title': 'Clean Water & Handwashing Point', 'desc': 'Clean drinking water and handwashing stations for good health.' },
  { 'file': '20261027_111019.jpg', 'cat': 'life', 'label': 'School Life', 'title': 'School Dining & Hot Meals', 'desc': 'Pupils enjoying warm posho, beans, porridge, and healthy school food.' },
  { 'file': 'IMG-20261026-WA0020.jpg', 'cat': 'life', 'label': 'School Life', 'title': 'Morning Assembly & Uniform Check', 'desc': 'Pupils lining up smartly in red and grey uniforms for morning devotion.' },
  { 'file': 'IMG-20261026-WA0023.jpg', 'cat': 'life', 'label': 'School Life', 'title': 'Happy Nursery Pupils at Play', 'desc': 'Little boys and girls playing together with toys and swings.' },
  { 'file': 'IMG-20261026-WA0028.jpg', 'cat': 'life', 'label': 'School Life', 'title': 'Teachers Staff Room Meeting', 'desc': 'Teachers planning weekly lesson plans and checking homework books.' },
  { 'file': 'IMG-20261026-WA0032.jpg', 'cat': 'life', 'label': 'School Life', 'title': 'School Garden & Farming Activity', 'desc': 'Pupils learning how to plant vegetables, beans, and maize in the garden.' },
]

def optimize_sharp(img, dest_base_path, max_width=None, quality=86):
    w, h = img.size
    if max_width and w > max_width:
        new_h = int((max_width / w) * h)
        img = img.resize((max_width, new_h), Image.Resampling.LANCZOS)
    
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

print(f"Processing {len(CURATED_PHOTOS)} clean, distinct, non-repeated photos...")

gallery_items = []
for idx, pinfo in enumerate(CURATED_PHOTOS):
    f = pinfo['file']
    src_path = os.path.join(IMAGE_SRC_DIR, f)
    if not os.path.exists(src_path):
        print(f"Warning: {f} not found!")
        continue
        
    with Image.open(src_path) as img:
        img_id = f"photo_{idx+1:02d}"
        dest_large = os.path.join(PUBLIC_IMG_DIR, 'gallery', 'large', img_id)
        dest_thumb = os.path.join(PUBLIC_IMG_DIR, 'gallery', 'thumb', img_id)
        
        # 1400px large, 480px thumb - sharp and clean
        optimize_sharp(img, dest_large, max_width=1400, quality=86)
        optimize_sharp(img, dest_thumb, max_width=480, quality=84)
        
        gallery_items.append({
            'id': img_id,
            'title': pinfo['title'],
            'category': pinfo['cat'],
            'categoryLabel': pinfo['label'],
            'description': pinfo['desc'],
            'thumb': f"/images/gallery/thumb/{img_id}.webp",
            'thumbJpg': f"/images/gallery/thumb/{img_id}.jpg",
            'large': f"/images/gallery/large/{img_id}.webp",
            'largeJpg': f"/images/gallery/large/{img_id}.jpg",
            'originalFile': f
        })

# Write clean gallery.json
gallery_json_path = os.path.join(BASE_DIR, 'public', 'data', 'gallery.json')
with open(gallery_json_path, 'w', encoding='utf-8') as gf:
    json.dump(gallery_items, gf, indent=2)

print(f"Done! Saved {len(gallery_items)} non-repeated, sharp photos to {gallery_json_path}")
