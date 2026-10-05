"""python video/launch-film/film-towers.py -> mobile/film/towers/*.png

Illustrated skylines for film mode's watched buildings. The app's bundled building
exteriors are third-party photos not cleared for public use, so the film shows
these drawings instead. Deterministic: the same seed draws the same skyline.
"""
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

W, H = 1200, 800
OUT = Path(__file__).resolve().parents[2] / 'mobile' / 'film' / 'towers'
BUILDINGS = {'act-one': 11, 'burj-khalifa': 23, 'boulevard-point': 37, 'opera-grand': 41}


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def skyline(seed):
    rng = random.Random(seed)
    top, horizon = (22, 34, 58), (232, 168, 124)
    image = Image.new('RGB', (W, H))
    draw = ImageDraw.Draw(image)
    for y in range(H):
        draw.line([(0, y), (W, y)], fill=mix(top, horizon, min(1, (y / H) ** 1.6)))
    ground = int(H * 0.86)
    # A far, hazy row, then the near towers with lit windows.
    for layer, shade, count in ((0, (92, 92, 120), 9), (1, (34, 40, 58), 5)):
        x = rng.randint(-60, 0)
        for _ in range(count):
            width = rng.randint(70, 150) if layer else rng.randint(60, 120)
            height = rng.randint(int(H * 0.25), int(H * (0.5 if layer == 0 else 0.72)))
            left, right, roof = x, x + width, ground - height
            draw.rectangle([left, roof, right, ground], fill=shade)
            if layer and rng.random() < 0.6:  # tapered crown or spire
                draw.polygon([(left + width * 0.25, roof), (left + width * 0.5, roof - rng.randint(30, 90)), (left + width * 0.75, roof)], fill=shade)
            if layer:
                for wy in range(roof + 14, ground - 10, 18):
                    for wx in range(left + 10, right - 10, 16):
                        if rng.random() < 0.35:
                            draw.rectangle([wx, wy, wx + 6, wy + 8], fill=mix(shade, (246, 213, 142), rng.uniform(0.45, 0.9)))
            x = right + rng.randint(10 if layer else -20, 70)
            if x > W: break
    draw.rectangle([0, ground, W, H], fill=(24, 28, 40))
    return image.filter(ImageFilter.GaussianBlur(0.6))


OUT.mkdir(parents=True, exist_ok=True)
for name, seed in BUILDINGS.items():
    skyline(seed).save(OUT / f'{name}.png', optimize=True)
    print(OUT / f'{name}.png')
