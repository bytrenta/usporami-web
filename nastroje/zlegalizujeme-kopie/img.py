import sys, os
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
MAPA = {
 '3Hr8x6VqHAAL0iQSn5yLh0DldqwCiYixlFwMLJf0SAk-1786691914.png': ('uvod-pozadi.jpg', 1672),
 '6EuFpvLzqhe_zAIHNBWBJ-y_YbA-utzQdnwxM38SrfA-1786693184.png': ('uvod-pozadi-mobil.jpg', 941),
 'J5x_Sn_RYZlwU6zYZlX1YHJQb6BBiRUvBNLGjIaFLEE-1770376160.png': ('garaz-dopis.jpg', 1080),
 'frg94WQiW0ltQNyq6--TRNivpkGCxuAJSNy5LmV-O50-1786695099.png': ('skener.jpg', 1080),
 'iHEQ3kXySkrpLeu1-n0I2PIF3DuydJ3cEfIxQXLp6jw-1786695131.png': ('stavba.jpg', 1080),
 'ARH3uLwTlry9spzsuCmW8BQBC8HE8bQSAPne-4igkDI-1786698781.png': ('dekujeme.jpg', 700),
}
for f, (cil, sirka) in MAPA.items():
    im = Image.open(os.path.join(src, f))
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        a = im.getchannel('A').getextrema()
        print(f[:6], 'alpha extrema', a)
        bg = Image.new('RGB', im.size, (255, 255, 255))
        bg.paste(im, mask=im.getchannel('A'))
        im = bg
    else:
        im = im.convert('RGB')
    if im.width > sirka:
        im = im.resize((sirka, round(im.height * sirka / im.width)), Image.LANCZOS)
    p = os.path.join(out, cil)
    im.save(p, 'JPEG', quality=80, optimize=True, progressive=True)
    print(cil, im.size, os.path.getsize(p))
