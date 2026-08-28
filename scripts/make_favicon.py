"""
Genera el favicon de Milenium Gym: un ícono propio (mancuerna,
mismo lenguaje visual que el tab "Milenium Gym" del bottom nav),
no la foto del logo — un wordmark de 512x159 no se lee en 16x16.
Fondo naranja sólido + mancuerna oscura, para que se distinga
fuerte entre las demás pestañas del navegador.
"""
from PIL import Image, ImageDraw

NARANJA = (224, 120, 48, 255)   # --naranja
OSCURO  = (10, 10, 10, 255)     # --bg / --naranja-ink aprox

def draw_dumbbell(draw, cx, cy, scale=1.0, color=OSCURO):
    bar_w, bar_h = 148 * scale, 30 * scale
    plate_w, plate_h = 46 * scale, 118 * scale
    bar_r = bar_h / 2
    plate_r = 14 * scale

    # barra central
    draw.rounded_rectangle(
        [cx - bar_w / 2, cy - bar_h / 2, cx + bar_w / 2, cy + bar_h / 2],
        radius=bar_r, fill=color)

    # discos (plates) a cada lado
    for sign in (-1, 1):
        px = cx + sign * (bar_w / 2 - plate_w * 0.15)
        draw.rounded_rectangle(
            [px - plate_w / 2, cy - plate_h / 2, px + plate_w / 2, cy + plate_h / 2],
            radius=plate_r, fill=color)

def build(size=512, corner_ratio=0.22, pad_ratio=0.0):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = size * corner_ratio
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=NARANJA)

    scale = size / 256
    draw_dumbbell(draw, size / 2, size / 2, scale=scale, color=OSCURO)
    return img

if __name__ == '__main__':
    big = build(512)
    big.save('assets/img/favicon-512.png')
    big.resize((192, 192), Image.LANCZOS).save('assets/img/favicon-192.png')
    big.resize((32, 32), Image.LANCZOS).save('assets/img/favicon-32.png')

    # apple-touch-icon: sin transparencia (iOS le pone su propio
    # redondeo), fondo naranja a bordes rectos.
    apple = Image.new('RGBA', (512, 512), NARANJA)
    d = ImageDraw.Draw(apple)
    draw_dumbbell(d, 256, 256, scale=2.0, color=OSCURO)
    apple.convert('RGB').save('assets/img/apple-touch-icon.png')

    print('OK')
