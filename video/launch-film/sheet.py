"""python sheet.py out/contact-9x16 0.5 8  -> tiles frames with time labels."""
import sys, glob, os
from PIL import Image, ImageDraw
folder, step, cols = sys.argv[1], float(sys.argv[2]), int(sys.argv[3])
files = sorted(glob.glob(os.path.join(folder, '*.png')))
first = Image.open(files[0]); w, h = first.size
scale = 270 / min(w, h) if w < h else 384 / w
tw, th = int(w * scale), int(h * scale)
rows = -(-len(files) // cols)
sheet = Image.new('RGB', (cols * (tw + 6), rows * (th + 6)), (60, 60, 60))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    x, y = (i % cols) * (tw + 6), (i // cols) * (th + 6)
    sheet.paste(Image.open(f).convert('RGB').resize((tw, th)), (x, y))
    d.rectangle([x, y, x + 46, y + 18], fill=(0, 0, 0)); d.text((x + 4, y + 3), f'{i * step:.1f}s', fill=(255, 220, 0))
sheet.save(folder + '.png'); print(folder + '.png', len(files))
