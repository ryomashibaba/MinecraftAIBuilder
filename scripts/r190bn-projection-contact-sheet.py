"""Rasterize only the rect/text SVG primitives in this offline source study.
No browser or UI automation; this is a static projection/section contact sheet.
"""
import sys
from pathlib import Path
from xml.etree import ElementTree as ET
from PIL import Image, ImageDraw, ImageFont

root = Path(sys.argv[1])
try:
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
except OSError:
    font = ImageFont.load_default()

def raster(path):
    svg = ET.parse(path).getroot()
    view = svg.get('viewBox')
    if view:
        _, _, width, height = map(float, view.split())
    else:
        width, height = float(svg.get('width')), float(svg.get('height'))
    image = Image.new('RGB', (round(width), round(height)), '#101c2c')
    draw = ImageDraw.Draw(image)
    for item in svg:
        tag = item.tag.rsplit('}', 1)[-1]
        if tag == 'rect':
            x, y = float(item.get('x', 0)), float(item.get('y', 0))
            def size(value, dimension):
                return dimension * float(value[:-1]) / 100 if value.endswith('%') else float(value)
            w, h = size(item.get('width'), width), size(item.get('height'), height)
            draw.rectangle((x, y, x+w-1, y+h-1), fill=item.get('fill', 'white'))
        elif tag == 'text':
            draw.text((float(item.get('x', 0)), float(item.get('y', 0))-14),
                      item.text or '', fill=item.get('fill', 'white'))
        else:
            raise ValueError('Unsupported SVG element: '+tag)
    return image

sheet = Image.new('RGB', (1200, 1400), '#101c2c')
draw = ImageDraw.Draw(sheet)
draw.text((24, 18), 'R190-BN | SYNTHETIC geometry probes | No model inference / ART HOLD', font=font, fill='white')
for column, name in enumerate(['synthetic-reading', 'synthetic-concourse']):
    for row, filename in enumerate(['front.svg', 'roof.svg', 'INSPECTION_SECTION.svg']):
        image = raster(root/name/filename)
        image.thumbnail((550, 360), Image.Resampling.NEAREST)
        x, y = 25 + column*600, 65 + row*440
        draw.text((x, y), name+' / '+filename, font=font, fill='#b6cdea')
        sheet.paste(image, (x+(550-image.width)//2, y+35))
draw.text((25, 1370), 'Exact source projections and reviewer-selected source slices. Not an aesthetic quality improvement claim.', font=font, fill='#b6cdea')
sheet.save(root/'PROJECTION_CONTACT_SHEET.png')
