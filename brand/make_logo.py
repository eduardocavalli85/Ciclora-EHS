"""Gera os arquivos de logo da Ciclora (texto convertido em curvas)."""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT_DIR = "/usr/share/fonts/opentype/inter/"

DEEP = "#0E4D3A"
MINT = "#34B98A"
TEAL = "#1A8F7A"
LIME = "#A6D86B"


def text_path(text, font_file, size, x, y, tracking=0.0):
    font = TTFont(FONT_DIR + font_file)
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font["head"].unitsPerEm
    scale = size / upm
    pen = SVGPathPen(gs)
    cx = x
    for ch in text:
        gname = cmap.get(ord(ch))
        if gname is None:
            continue
        tpen = TransformPen(pen, (scale, 0, 0, -scale, cx, y))
        gs[gname].draw(tpen)
        cx += gs[gname].width * scale + tracking
    return pen.getCommands(), cx - x


def icon(ring=DEEP, leaf=MINT, bars=TEAL, vein="#FFFFFF"):
    return f"""
  <path d="M67.64 16.67 A44 44 0 1 0 101.35 44.95" fill="none" stroke="{ring}" stroke-width="12" stroke-linecap="round"/>
  <path d="M101 47 Q109 20 84 6 Q76 34 101 47 Z" fill="{leaf}"/>
  <path d="M99 42 Q93 24 86 11" fill="none" stroke="{vein}" stroke-width="2" stroke-linecap="round" opacity=".85"/>
  <rect x="40" y="62" width="10" height="18" rx="3" fill="{bars}" opacity=".55"/>
  <rect x="55" y="52" width="10" height="28" rx="3" fill="{bars}" opacity=".8"/>
  <rect x="70" y="42" width="10" height="38" rx="3" fill="{bars}"/>"""


def write_icon(name, **kw):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">{icon(**kw)}\n</svg>\n'
    open(name, "w").write(svg)


def write_horizontal(name, word=DEEP, tag=TEAL, **kw):
    wp, ww = text_path("ciclora", "InterDisplay-Bold.otf", 64, 136, 78, tracking=-1.2)
    tp, tw = text_path("GESTÃO DE RESÍDUOS · EHS", "InterDisplay-SemiBold.otf", 13, 140, 104, tracking=2.1)
    width = int(140 + max(ww, tw) + 12)
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} 120">{icon(**kw)}
  <path d="{wp}" fill="{word}"/>
  <path d="{tp}" fill="{tag}"/>
</svg>
"""
    open(name, "w").write(svg)


write_icon("ciclora-icone.svg")
write_icon("ciclora-icone-branco.svg", ring="#FFFFFF", leaf=LIME, bars="#FFFFFF", vein=DEEP)
write_horizontal("ciclora-logo.svg")
write_horizontal("ciclora-logo-branco.svg", word="#FFFFFF", tag=LIME,
                 ring="#FFFFFF", leaf=LIME, bars="#FFFFFF", vein=DEEP)
print("ok")
