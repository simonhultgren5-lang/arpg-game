"""Item icons: one small model per item base, rendered to godot/assets/textures/icons/items/<icon>.png.

    bun run assets:build -- item_icons

The icon ids match godot/scripts/data/items.gd (CLASS_BASES, BASES and UNIQUES). Add a base there,
add a function here with the same name (in ICONS at the bottom), rebuild. Every model is built
standing along +Z and centred; weapons are tilted onto the diagonal by iconkit.diagonal().
"""
import math

import ddk
import iconkit
import materials

R = math.radians


def M():
    return {
        "steel": ddk.material("i_steel", (0.62, 0.62, 0.66), 0.38, 1.0, materials.get("steel"), 1.5),
        "dark": ddk.material("i_dark", (0.2, 0.19, 0.21), 0.5, 1.0, materials.get("steel"), 1.5),
        "gold": ddk.material("i_gold", (0.95, 0.68, 0.32), 0.3, 1.0),
        "bronze": ddk.material("i_bronze", (0.7, 0.42, 0.2), 0.4, 1.0),
        "leather": ddk.material("i_leather", (0.42, 0.26, 0.17), 0.7, 0.0, materials.get("leather"), 1.5),
        "cloth": ddk.material("i_cloth", (0.3, 0.28, 0.36), 0.9, 0.0, materials.get("cloth"), 2.0),
        "red": ddk.material("i_red", (0.55, 0.12, 0.12), 0.85, 0.0, materials.get("cloth"), 2.0),
        "wood": ddk.material("i_wood", (0.6, 0.45, 0.34), 0.7, 0.0, materials.get("timber"), 1.5),
        "bone": ddk.material("i_bone", (0.62, 0.56, 0.45), 0.6, 0.0, materials.get("bone"), 2.0),
        "wax": ddk.material("i_wax", (0.5, 0.44, 0.32), 0.5, 0.0),
        "page": ddk.material("i_page", (0.7, 0.62, 0.48), 0.9, 0.0),
        "ember": ddk.material("i_ember", (1.0, 0.5, 0.15), 0.4, emission=(1.0, 0.42, 0.1), emission_strength=2.5),
        "glow": ddk.material("i_glow", (0.9, 0.35, 0.1), 0.3, emission=(0.9, 0.3, 0.06), emission_strength=1.2),
        "gem": ddk.material("i_gem", (0.7, 0.1, 0.12), 0.15, emission=(0.8, 0.1, 0.1), emission_strength=1.5),
        "void": ddk.material("i_void", (0.01, 0.01, 0.012), 1.0),
    }


P = ddk.prim


def grip(m, z0=-0.2, length=0.2, r=0.035, mat="leather", pommel="gold"):
    P("cyl", "grip", (r * 2, r * 2, length), (0, 0, z0 + length / 2), mat=m[mat], segments=12)
    for k in range(3):
        P("torus", "wrap", (r * 2.3, r * 2.3, r * 1.2), (0, 0, z0 + length * (0.2 + 0.3 * k)), mat=m["dark"], segments=16)
    P("sphere", "pommel", (r * 3, r * 3, r * 3), (0, 0, z0 - r), mat=m[pommel], segments=16)


def guard(m, w=0.34, z=0.0, mat="gold"):
    P("box", "guard", (w, 0.06, 0.05), (0, 0, z), mat=m[mat], bevel=0.01)
    for s in (-1, 1):
        P("sphere", "guard_end", (0.06, 0.06, 0.06), (s * w / 2, 0, z), mat=m[mat], segments=12)


def blade(m, length, width, thick=0.025, z=0.03, tip=0.18, mat="steel"):
    b = ddk.blade("blade", length, width, thick, m[mat], tip=tip)
    b.location = (0, 0, z)
    return b


# ---------------------------------------------------------------------------- weapons

def sword(m):
    blade(m, 1.0, 0.13, 0.03)
    guard(m)
    grip(m)
    iconkit.diagonal()


def falchion(m):
    b = blade(m, 0.85, 0.16, tip=0.3)
    b.scale = (1.0, 1.0, 1.0)
    P("box", "spine", (0.02, 0.03, 0.7), (-0.075, 0, 0.38), mat=m["dark"])
    guard(m, 0.26, mat="bronze")
    grip(m, pommel="bronze")
    iconkit.diagonal()


def maul(m):
    P("cyl", "haft", (0.06, 0.06, 1.1), (0, 0, 0.3), mat=m["wood"], segments=12)
    P("box", "head", (0.36, 0.22, 0.22), (0, 0, 0.82), mat=m["dark"], bevel=0.03)
    for s in (-1, 1):
        P("box", "face", (0.04, 0.26, 0.26), (s * 0.19, 0, 0.82), mat=m["steel"], bevel=0.015)
    P("torus", "band", (0.11, 0.11, 0.06), (0, 0, 0.66), mat=m["steel"], segments=16)
    grip(m, -0.25, 0.25, 0.04)
    iconkit.diagonal()


def axe(m):
    P("cyl", "haft", (0.055, 0.055, 1.05), (0, 0, 0.3), mat=m["wood"], segments=12)
    P("cyl", "bit", (0.42, 0.42, 0.04), (0.2, 0, 0.78), (R(90), 0, 0), segments=32, mat=m["steel"], bevel=0.01)
    P("box", "socket", (0.12, 0.1, 0.16), (0.02, 0, 0.78), mat=m["dark"], bevel=0.015)
    P("cone", "spike", (0.08, 0.06, 0.16), (-0.11, 0, 0.78), (0, R(-90), 0), mat=m["dark"], segments=8)
    grip(m, -0.25, 0.25, 0.04, pommel="dark")
    iconkit.diagonal()


def staff(m):
    P("cyl", "shaft", (0.06, 0.06, 1.3), (0, 0, 0.35), mat=m["wood"], segments=12)
    for k in range(4):
        a = k * math.pi / 2
        c = P("cone", "claw", (0.05, 0.05, 0.22), (math.cos(a) * 0.07, math.sin(a) * 0.07, 1.06), (math.sin(a) * 0.4, -math.cos(a) * 0.4, 0), mat=m["bronze"], segments=8)
    P("sphere", "ember", (0.16, 0.16, 0.16), (0, 0, 1.1), mat=m["ember"], segments=24)
    P("torus", "band", (0.09, 0.09, 0.05), (0, 0, 0.98), mat=m["bronze"], segments=16)
    iconkit.diagonal()


def wand(m):
    P("cone", "rod", (0.06, 0.06, 0.6), (0, 0, 0.3), (R(180), 0, 0), mat=m["bone"], segments=12)
    P("torus", "ring", (0.08, 0.08, 0.04), (0, 0, 0.55), mat=m["gold"], segments=16)
    P("sphere", "tip", (0.1, 0.1, 0.1), (0, 0, 0.64), mat=m["ember"], segments=16)
    P("sphere", "knob", (0.08, 0.08, 0.08), (0, 0, 0.0), mat=m["gold"], segments=12)
    iconkit.diagonal()


def censer(m):
    P("cyl", "rod", (0.04, 0.04, 0.8), (0, 0, 0.4), mat=m["dark"], segments=10)
    for k in range(4):
        P("torus", "link", (0.05, 0.05, 0.02), (0, 0, 0.82 + k * 0.05), (R(90 * (k % 2)), 0, 0), mat=m["bronze"], segments=12)
    ddk.lathe("pot", [(0.0, 1.0), (0.12, 1.02), (0.17, 1.12), (0.15, 1.22), (0.07, 1.27), (0.0, 1.3)], 24, m["bronze"])
    P("sphere", "glow", (0.12, 0.12, 0.05), (0, -0.13, 1.14), mat=m["ember"], segments=12)
    iconkit.diagonal()


def sceptre(m):
    P("cyl", "rod", (0.05, 0.05, 0.85), (0, 0, 0.4), mat=m["gold"], segments=12)
    ddk.lathe("crown", [(0.03, 0.82), (0.12, 0.86), (0.14, 0.95), (0.09, 1.0), (0.0, 1.02)], 8, m["gold"])
    P("sphere", "gem", (0.12, 0.12, 0.12), (0, 0, 1.03), mat=m["gem"], segments=16)
    P("sphere", "knob", (0.08, 0.08, 0.08), (0, 0, -0.02), mat=m["gold"], segments=12)
    iconkit.diagonal()


def knife(m):
    blade(m, 0.45, 0.07, tip=0.3)
    P("box", "bolster", (0.11, 0.05, 0.04), (0, 0, 0.02), mat=m["dark"], bevel=0.01)
    grip(m, -0.17, 0.17, 0.03, mat="wood", pommel="dark")
    iconkit.diagonal()


def dirk(m):
    blade(m, 0.58, 0.065, tip=0.25)
    guard(m, 0.18, mat="steel")
    grip(m, -0.18, 0.18, 0.03)
    iconkit.diagonal()


def shiv(m):
    b = blade(m, 0.42, 0.06, tip=0.45, mat="dark")
    P("cyl", "bone_grip", (0.07, 0.07, 0.22), (0, 0, -0.08), mat=m["bone"], segments=10)
    P("torus", "cord", (0.08, 0.08, 0.05), (0, 0, 0.0), mat=m["cloth"], segments=12)
    iconkit.diagonal()


def stiletto(m):
    blade(m, 0.62, 0.04, 0.03, tip=0.35)
    P("torus", "ring_guard", (0.14, 0.14, 0.04), (0, 0, 0.02), (R(90), 0, 0), mat=m["gold"], segments=20)
    grip(m, -0.18, 0.18, 0.028)
    iconkit.diagonal()


def parry_dagger(m):
    blade(m, 0.55, 0.06, tip=0.25)
    for s in (-1, 1):
        b = ddk.blade("prong", 0.25, 0.035, 0.02, m["steel"], tip=0.3)
        b.location = (s * 0.05, 0, 0.04)
        b.rotation_euler = (0, R(s * 35), 0)
    guard(m, 0.16, mat="steel")
    grip(m, -0.18, 0.18, 0.03)
    iconkit.diagonal()


def hook_knife(m):
    blade(m, 0.42, 0.07, tip=0.2)
    P("torus", "hook", (0.16, 0.16, 0.1), (0.07, 0, 0.45), (R(90), 0, 0), mat=m["steel"], segments=20)
    grip(m, -0.18, 0.18, 0.03, mat="wood", pommel="dark")
    iconkit.diagonal()


# ---------------------------------------------------------------------------- off-hands

def shield(m):
    P("cyl", "board", (0.55, 0.7, 0.08), (0, 0, 0), (R(90), 0, 0), segments=40, mat=m["red"], bevel=0.01)
    P("torus", "rim", (0.57, 0.72, 0.08), (0, 0, 0), (R(90), 0, 0), mat=m["steel"], segments=40)
    P("sphere", "boss", (0.18, 0.1, 0.18), (0, -0.05, 0.02), mat=m["steel"], segments=20)
    P("box", "band", (0.06, 0.03, 0.66), (0, -0.04, 0), mat=m["gold"])
    P("box", "band2", (0.52, 0.03, 0.06), (0, -0.04, 0.1), mat=m["gold"])


def buckler(m):
    P("cyl", "board", (0.6, 0.6, 0.06), (0, 0, 0), (R(90), 0, 0), segments=40, mat=m["dark"], bevel=0.01)
    P("torus", "rim", (0.62, 0.62, 0.06), (0, 0, 0), (R(90), 0, 0), mat=m["bronze"], segments=40)
    P("sphere", "boss", (0.22, 0.14, 0.22), (0, -0.04, 0), mat=m["steel"], segments=20)
    for k in range(8):
        a = k * math.pi / 4
        P("sphere", "rivet", (0.04, 0.04, 0.04), (math.cos(a) * 0.24, -0.035, math.sin(a) * 0.24), mat=m["bronze"], segments=8)


def tome(m):
    P("box", "cover", (0.46, 0.14, 0.58), mat=m["leather"], bevel=0.015)
    P("box", "pages", (0.42, 0.12, 0.55), (0.025, 0, 0), mat=m["page"])
    for sx in (-1, 1):
        for sz in (-1, 1):
            P("box", "corner", (0.07, 0.15, 0.07), (sx * 0.21, 0, sz * 0.26), mat=m["gold"], bevel=0.008)
    P("sphere", "seal", (0.13, 0.04, 0.13), (0, -0.075, 0.03), mat=m["ember"], segments=16)
    P("box", "clasp", (0.1, 0.16, 0.05), (0.23, 0, 0), mat=m["gold"])


def orb(m):
    P("sphere", "orb", (0.34, 0.34, 0.34), (0, 0, 0.32), mat=m["glow"], segments=32)
    ddk.lathe("stand", [(0.0, 0.0), (0.16, 0.0), (0.14, 0.04), (0.06, 0.1), (0.06, 0.15), (0.13, 0.2), (0.0, 0.2)], 24, m["dark"])
    for k in range(3):
        a = k * 2 * math.pi / 3
        P("cone", "claw", (0.04, 0.04, 0.24), (math.cos(a) * 0.15, math.sin(a) * 0.15, 0.27), (math.sin(a) * 0.5, -math.cos(a) * 0.5, 0), mat=m["dark"], segments=8)


# ---------------------------------------------------------------------------- armour

def _torso(m, mat, length=0.7, flare=1.0, sleeves=True):
    """A tunic: chest flaring from the waist, broad shoulders and short sleeves, seen from the front."""
    body = ddk.lathe("torso", [(0.0, -length / 2), (0.22 * flare, -length / 2), (0.2, -0.12), (0.25, 0.1),
                               (0.27, 0.24), (0.16, 0.33), (0.0, 0.33)], 28, m[mat])
    body.scale = (1.25, 0.75, 1.0)
    P("sphere", "shoulders", (0.78, 0.36, 0.2), (0, 0, 0.27), mat=m[mat], segments=24)
    if sleeves:
        for s in (-1, 1):
            P("cyl", "sleeve", (0.16, 0.16, 0.3), (s * 0.4, 0, 0.13), (0, R(s * 28), 0), mat=m[mat], segments=14)
    P("sphere", "neck", (0.2, 0.14, 0.08), (0, -0.04, 0.35), mat=m["void"], segments=16)
    return body


def hood(m):
    s = P("sphere", "hood", (0.5, 0.52, 0.56), (0, 0, 0), mat=m["cloth"], segments=32)
    P("sphere", "opening", (0.32, 0.2, 0.38), (0, -0.2, -0.03), mat=m["void"], segments=24)
    P("cone", "tail", (0.18, 0.18, 0.4), (0, 0.22, 0.12), (R(-70), 0, 0), mat=m["cloth"], segments=16)
    P("torus", "hem", (0.36, 0.36, 0.08), (0, -0.16, -0.04), (R(80), 0, 0), mat=m["gold"], segments=24)


def helm(m):
    ddk.lathe("dome", [(0.0, 0.32), (0.14, 0.3), (0.24, 0.2), (0.26, 0.0), (0.25, -0.22), (0.0, -0.22)], 32, m["steel"])
    P("box", "slit", (0.3, 0.06, 0.035), (0, -0.24, 0.02), mat=m["void"])
    P("box", "nasal", (0.05, 0.04, 0.24), (0, -0.255, -0.05), mat=m["dark"])
    P("box", "crest", (0.04, 0.42, 0.1), (0, 0.0, 0.33), mat=m["gold"], bevel=0.01)


def cap(m):
    ddk.lathe("crown", [(0.0, 0.22), (0.18, 0.2), (0.26, 0.05), (0.26, 0.0), (0.0, 0.0)], 32, m["leather"])
    P("torus", "brim", (0.62, 0.62, 0.2), (0, 0, 0.0), mat=m["leather"], segments=32)
    P("torus", "band", (0.53, 0.53, 0.1), (0, 0, 0.06), mat=m["red"], segments=32)


def pauldrons(m):
    for k in range(3):
        P("sphere", "plate", (0.6 - k * 0.1, 0.45 - k * 0.06, 0.3), (0, 0, 0.1 - k * 0.12), mat=m["steel" if k % 2 == 0 else "dark"], segments=24)
    P("box", "strap", (0.06, 0.48, 0.05), (0, 0, 0.24), mat=m["leather"])
    for s in (-1, 1):
        P("sphere", "rivet", (0.05, 0.05, 0.05), (s * 0.22, -0.18, 0.12), mat=m["gold"], segments=8)


def mantle(m):
    ddk.lathe("mantle", [(0.12, 0.3), (0.2, 0.26), (0.36, 0.05), (0.42, -0.15), (0.38, -0.2)], 32, m["red"], closed_top=False)
    P("torus", "collar", (0.3, 0.3, 0.1), (0, 0, 0.28), mat=m["gold"], segments=24)
    P("sphere", "clasp", (0.09, 0.06, 0.09), (0, -0.16, 0.24), mat=m["ember"], segments=12)


def mail(m):
    _torso(m, "steel")
    P("box", "belt", (0.52, 0.34, 0.08), (0, 0, -0.14), mat=m["leather"], bevel=0.02)
    P("box", "plate", (0.36, 0.1, 0.32), (0, -0.17, 0.08), mat=m["dark"], bevel=0.02)
    P("box", "cross", (0.04, 0.02, 0.24), (0, -0.225, 0.08), mat=m["gold"])


def robe(m):
    _torso(m, "red", 1.1, 1.7)
    P("box", "trim", (0.06, 0.05, 1.0), (0, -0.2, -0.15), mat=m["gold"])
    P("box", "sash", (0.5, 0.05, 0.07), (0, -0.2, -0.08), mat=m["gold"])


def vest(m):
    _torso(m, "leather", 0.62, sleeves=False)
    for z in (0.15, 0.0, -0.15):
        P("box", "strap", (0.5, 0.06, 0.035), (0, -0.18, z), mat=m["dark"])
        P("box", "buckle", (0.06, 0.07, 0.05), (0.1, -0.2, z), mat=m["gold"])


def coat(m):
    _torso(m, "cloth", 1.1, 1.4)
    for k in range(6):
        P("sphere", "button", (0.05, 0.04, 0.05), (0, -0.2, 0.22 - k * 0.12), mat=m["gold"], segments=8)
    P("box", "collar", (0.42, 0.08, 0.1), (0, -0.12, 0.34), mat=m["leather"], bevel=0.02)


def vambraces(m):
    for s in (-1, 1):
        ddk.lathe("bracer", [(0.1, -0.22), (0.12, -0.2), (0.14, 0.2), (0.12, 0.22)], 20, m["steel"], loc=(s * 0.16, 0, 0), closed_top=False)
        P("torus", "edge", (0.27, 0.27, 0.05), (s * 0.16, 0, 0.2), mat=m["gold"], segments=20)


def wraps(m):
    for s in (-1, 1):
        P("cyl", "wrap", (0.22, 0.22, 0.42), (s * 0.15, 0, 0), mat=m["cloth"], segments=16)
        for k in range(4):
            P("torus", "band", (0.24, 0.24, 0.05), (s * 0.15, 0, -0.15 + k * 0.1), mat=m["leather"], segments=16)


def _hand(m, mat, cuff):
    P("box", "palm", (0.3, 0.12, 0.3), (0, 0, 0), mat=m[mat], bevel=0.04)
    for k in range(4):
        P("cyl", "finger", (0.06, 0.06, 0.2), (-0.105 + k * 0.07, 0, 0.24), mat=m[mat], segments=10)
    t = P("cyl", "thumb", (0.07, 0.07, 0.16), (0.19, 0, 0.05), (0, R(-40), 0), mat=m[mat], segments=10)
    ddk.lathe("cuff", [(0.15, -0.3), (0.2, -0.32), (0.18, -0.12), (0.15, -0.1)], 20, m[cuff], closed_top=False)


def gloves(m):
    _hand(m, "leather", "leather")


def gauntlets(m):
    _hand(m, "steel", "dark")
    for k in range(3):
        P("box", "plate", (0.32, 0.14, 0.05), (0, -0.01, -0.08 + k * 0.08), mat=m["dark"], bevel=0.01)


def belt(m):
    P("torus", "strap", (0.8, 0.8, 0.18), (0, 0, 0), (R(70), 0, 0), mat=m["leather"], segments=40)
    P("box", "buckle", (0.18, 0.06, 0.16), (0, -0.39, -0.12), (R(-20), 0, 0), mat=m["gold"], bevel=0.015)
    P("sphere", "pouch", (0.18, 0.14, 0.2), (0.3, -0.3, -0.2), mat=m["leather"], segments=16)


def rope_belt(m):
    P("torus", "rope", (0.8, 0.8, 0.1), (0, 0, 0), (R(70), 0, 0), mat=m["cloth"], segments=40)
    for s in (-1, 1):
        P("cyl", "tassel", (0.06, 0.06, 0.4), (s * 0.06, -0.38, -0.4), mat=m["cloth"], segments=8)
    P("torus", "knot", (0.14, 0.14, 0.08), (0, -0.38, -0.18), mat=m["cloth"], segments=12)
    P("cone", "charm", (0.1, 0.06, 0.12), (0.06, -0.39, -0.65), (R(180), 0, 0), mat=m["bone"], segments=8)


def _legs(m, mat, band):
    for s in (-1, 1):
        ddk.lathe("leg", [(0.0, -0.45), (0.1, -0.45), (0.12, -0.1), (0.15, 0.2), (0.17, 0.35), (0.0, 0.35)], 20, m[mat], loc=(s * 0.17, 0, 0))
        P("torus", "knee", (0.27, 0.27, 0.06), (s * 0.17, 0, -0.05), mat=m[band], segments=16)


def greaves(m):
    _legs(m, "steel", "gold")


def breeches(m):
    _legs(m, "leather", "dark")


def _boot(m, mat, trim):
    for s in (-1, 1):
        ddk.lathe("shaft", [(0.0, 0.0), (0.12, 0.0), (0.13, 0.35), (0.15, 0.42), (0.0, 0.42)], 20, m[mat], loc=(s * 0.18, 0.04, 0.0))
        P("box", "foot", (0.2, 0.34, 0.12), (s * 0.18, -0.1, 0.06), mat=m[mat], bevel=0.04)
        P("torus", "cuff", (0.3, 0.3, 0.06), (s * 0.18, 0.04, 0.4), mat=m[trim], segments=16)


def boots(m):
    _boot(m, "leather", "dark")


def sabatons(m):
    _boot(m, "steel", "gold")


# ---------------------------------------------------------------------------- jewellery

def rosary(m):
    n = 18
    for k in range(n):
        a = k * 2 * math.pi / n
        P("sphere", "bead", (0.08, 0.08, 0.08), (math.cos(a) * 0.32, 0, math.sin(a) * 0.32 + 0.1), mat=m["bone"], segments=10)
    P("box", "cross_v", (0.06, 0.04, 0.3), (0, 0, -0.38), mat=m["gold"])
    P("box", "cross_h", (0.2, 0.04, 0.06), (0, 0, -0.32), mat=m["gold"])


def locket(m):
    P("torus", "chain", (0.36, 0.36, 0.03), (0, 0, 0.2), (R(90), 0, 0), mat=m["gold"], segments=40)
    P("cyl", "case", (0.36, 0.44, 0.08), (0, 0, -0.12), (R(90), 0, 0), segments=32, mat=m["gold"], bevel=0.01)
    P("sphere", "gem", (0.14, 0.06, 0.14), (0, -0.05, -0.12), mat=m["ember"], segments=16)


def tallow_saint(m):
    ddk.lathe("body", [(0.0, -0.3), (0.18, -0.3), (0.12, 0.05), (0.07, 0.12), (0.0, 0.12)], 20, m["wax"])
    P("sphere", "head", (0.14, 0.14, 0.15), (0, 0, 0.2), mat=m["wax"], segments=16)
    P("torus", "halo", (0.3, 0.3, 0.04), (0, 0.04, 0.24), (R(90), 0, 0), mat=m["gold"], segments=24)
    P("cone", "flame", (0.06, 0.06, 0.14), (0, 0, 0.35), mat=m["ember"], segments=10)


def ring_coin(m):
    P("torus", "band", (0.5, 0.5, 0.5), (0, 0, 0), (R(90), 0, 0), mat=m["gold"], segments=32)
    P("cyl", "coin", (0.3, 0.3, 0.05), (0, -0.04, 0.27), (R(90), 0, 0), segments=24, mat=m["bronze"], bevel=0.008)


def ring_band(m):
    P("torus", "band", (0.5, 0.5, 0.9), (0, 0, 0), (R(90), 0, 0), mat=m["dark"], segments=32)
    P("torus", "inlay", (0.52, 0.52, 0.2), (0, 0, 0), (R(90), 0, 0), mat=m["gold"], segments=32)


def ring_signet(m):
    P("torus", "band", (0.5, 0.5, 0.5), (0, 0, 0), (R(90), 0, 0), mat=m["bone"], segments=32)
    P("cyl", "seal", (0.24, 0.2, 0.08), (0, 0, 0.28), segments=20, mat=m["gold"], bevel=0.01)
    P("box", "mark", (0.1, 0.06, 0.02), (0, 0, 0.33), mat=m["void"])


ICONS = [sword, falchion, maul, axe, staff, wand, censer, sceptre, knife, dirk, shiv, stiletto, parry_dagger,
         hook_knife, shield, buckler, tome, orb, hood, helm, cap, pauldrons, mantle, mail, robe, vest, coat,
         vambraces, wraps, gloves, gauntlets, belt, rope_belt, greaves, breeches, boots, sabatons, rosary,
         locket, tallow_saint, ring_coin, ring_band, ring_signet]


def finish():
    for o in list(ddk.bpy.data.objects):
        if o.type == "MESH":
            ddk.uv_unwrap(o, 1.0)


FRONT = (0.3, -1.0, 0.18)
for _fn in (mail, robe, vest, coat, mantle, hood, helm, pauldrons, greaves, breeches, boots, sabatons, gloves, gauntlets,
            vambraces, wraps, tallow_saint, orb):
    _fn.view = FRONT


if __name__ == "__main__":
    only = [a for a in __import__("os").environ.get("DDK_ONLY", "").split(",") if a]
    for fn in ICONS:
        if only and fn.__name__ not in only:
            continue
        ddk.reset()
        fn(M())
        finish()
        iconkit.render(fn.__name__, "items", view=getattr(fn, "view", (0.35, -1.0, 0.45)))
