"""Skill and passive icons: a dark stone disc with an iron rim and a glowing glyph in the skill's colour.

    bun run assets:build -- skill_icons

Writes godot/assets/textures/icons/skills/<id>.png for every skill and passive in SKILLS and PASSIVES
below. Keep the ids in step with godot/scripts/data/classes.gd and passives.gd (the asset test checks).
The glyph comes from the skill's kind (GLYPHS); passives get a gold rim and a glyph from their effect.
"""
import math
import os

import ddk
import iconkit
import materials

R = math.radians

# id: (kind, colour). Colours follow classes.gd.
SKILLS = {
    "grave_cleave": ("arc", (0.89, 0.71, 0.49)), "shield_bash": ("bash", (0.72, 0.74, 0.8)),
    "earthsplitter": ("nova", (0.85, 0.62, 0.35)), "iron_rush": ("rush", (0.93, 0.83, 0.62)),
    "grave_leap": ("leap", (0.8, 0.66, 0.45)), "grave_roar": ("buff", (0.95, 0.55, 0.25)),
    "sextons_whirl": ("whirl", (0.93, 0.83, 0.62)), "iron_hide": ("ward", (0.7, 0.72, 0.78)),
    "ember_bolt": ("bolt", (1.0, 0.55, 0.2)), "cinder_spray": ("fan", (1.0, 0.65, 0.25)),
    "cinder_nova": ("nova", (1.0, 0.42, 0.15)), "pyre": ("pyre", (1.0, 0.3, 0.08)),
    "ember_step": ("blink", (1.0, 0.5, 0.15)), "ashen_ward": ("ward", (0.85, 0.6, 0.4)),
    "cinder_rain": ("rain", (1.0, 0.4, 0.12)), "flame_wave": ("wave", (1.0, 0.35, 0.1)),
    "twin_cuts": ("cross", (0.79, 0.61, 0.95)), "barbed_throw": ("bolt", (0.82, 0.8, 0.88)),
    "knife_fan": ("fan", (0.75, 0.75, 0.85)), "veilstep": ("blink", (0.55, 0.35, 0.8)),
    "smoke_veil": ("smoke", (0.6, 0.6, 0.68)), "bone_caltrops": ("trap", (0.85, 0.8, 0.7)),
    "death_flurry": ("flurry", (0.6, 0.4, 0.85)), "rot_cloud": ("smoke", (0.5, 0.78, 0.3)),
}
CLASS_COLOUR = {"warrior": (0.95, 0.6, 0.3), "pyromancer": (1.0, 0.42, 0.12), "rogue": (0.65, 0.45, 0.9)}
# id: (class, glyph)
PASSIVES = {
    "unbroken": ("warrior", "heart"), "grave_iron_skin": ("warrior", "ward"), "wrath_of_the_buried": ("warrior", "up"),
    "sextons_rhythm": ("warrior", "hourglass"), "executioner": ("warrior", "star2"), "ruthless": ("warrior", "star"),
    "bloodied_oath": ("warrior", "skull"), "iron_march": ("warrior", "rush"),
    "living_ember": ("pyromancer", "pyre"), "ash_lungs": ("pyromancer", "whirl"), "kindled_mind": ("pyromancer", "down"),
    "wildfire": ("pyromancer", "star"), "searing_focus": ("pyromancer", "star2"), "quickened_ash": ("pyromancer", "hourglass"),
    "smouldering_hide": ("pyromancer", "ward"), "pyre_born": ("pyromancer", "skull"),
    "gutter_instinct": ("rogue", "star"), "knife_saints_edge": ("rogue", "star2"), "venom_blood": ("rogue", "up"),
    "light_feet": ("rogue", "rush"), "shadow_patience": ("rogue", "hourglass"), "leech": ("rogue", "skull"),
    "scarred": ("rogue", "heart"), "poisoner": ("rogue", "cross"),
}

P = ddk.prim
FRONT = -0.07  # glyphs sit just in front of the disc (the camera looks along +Y)


def _glow(colour, strength=0.8):
    # A dark base so the lights don't wash the glyph out: the colour comes from the glow.
    base = tuple(c * 0.12 for c in colour)
    return ddk.material("g_%d_%d_%d_%d" % (*(int(c * 100) for c in colour), int(strength * 10)), base, 0.6,
                        emission=colour, emission_strength=strength)


def disc(rim="iron"):
    stone = ddk.material("disc_stone", (0.22, 0.2, 0.24), 0.9, 0.0, materials.get("stone_wall"), 1.2)
    iron = ddk.material("disc_iron", (0.3, 0.28, 0.3), 0.45, 1.0, materials.get("steel"), 1.0)
    gold = ddk.material("disc_gold", (0.9, 0.64, 0.3), 0.3, 1.0)
    P("cyl", "disc", (1.0, 1.0, 0.1), (0, 0, 0), (R(90), 0, 0), segments=48, mat=stone)
    P("torus", "rim", (1.08, 1.08, 0.5), (0, -0.02, 0), (R(90), 0, 0), segments=48, mat=gold if rim == "gold" else iron)
    if rim == "gold":
        P("torus", "rim2", (0.9, 0.9, 0.18), (0, -0.04, 0), (R(90), 0, 0), segments=48, mat=iron)


def _bar(name, length, width, x, z, angle, mat, depth=0.05):
    """A flat bar in the disc's plane, centred at (x, z), turned `angle` degrees."""
    return P("box", name, (width, depth, length), (x, FRONT, z), (0, R(angle), 0), mat=mat, bevel=width * 0.2)


def _spike(name, length, width, x, z, angle, mat):
    return P("cone", name, (width, width * 0.5, length), (x, FRONT, z), (0, R(angle), 0), mat=mat, segments=4)


def glyph(kind, colour):
    g = _glow(colour)
    hot = _glow(tuple(min(1.0, c * 0.8 + 0.25) for c in colour), 1.05)
    if kind in ("arc", "whirl", "wave"):
        n = 9 if kind == "arc" else 14
        span = 150 if kind == "arc" else 330
        for k in range(n):
            a = R(-span / 2 + span * k / (n - 1) + 90)
            r = 0.3 + (0.12 * k / n if kind == "whirl" else 0.0)
            w = 0.07 + 0.05 * math.sin(math.pi * k / (n - 1))
            _bar("seg", 0.13, w, math.cos(a) * r, math.sin(a) * r - (0.05 if kind == "arc" else 0), -math.degrees(a), g)
        if kind == "wave":
            for k in range(3):
                _bar("line", 0.5, 0.05, -0.2 + 0.2 * k, -0.05, 0, hot)
    elif kind == "bash":
        P("cyl", "shield", (0.5, 0.6, 0.06), (0, FRONT, 0.02), (R(90), 0, 0), segments=24, mat=g)
        for a in range(0, 360, 45):
            _spike("burst", 0.22, 0.08, math.cos(R(a)) * 0.38, math.sin(R(a)) * 0.38, -a + 90, hot)
    elif kind == "nova":
        P("torus", "ring", (0.62, 0.62, 0.35), (0, FRONT, 0), (R(90), 0, 0), segments=32, mat=g)
        P("sphere", "core", (0.22, 0.1, 0.22), (0, FRONT, 0), mat=hot, segments=16)
        for a in range(0, 360, 30):
            _spike("ray", 0.18, 0.06, math.cos(R(a)) * 0.46, math.sin(R(a)) * 0.46, -a + 90, g)
    elif kind in ("rush", "leap"):
        for k in range(3):
            for s in (-1, 1):
                _bar("chev", 0.26, 0.08, -0.22 + k * 0.2 + 0.07, s * 0.09, s * 50 + 90, g if k < 2 else hot)
        if kind == "leap":
            P("torus", "land", (0.6, 0.6, 0.2), (0, FRONT, -0.3), (R(90), 0, 0), segments=24, mat=g).scale = (1, 1, 0.35)
    elif kind == "buff":
        _spike("up", 0.6, 0.22, 0, 0.05, 0, hot)
        for s in (-1, 1):
            _spike("side", 0.4, 0.16, s * 0.24, -0.05, s * -20, g)
        P("torus", "ring", (0.5, 0.5, 0.15), (0, FRONT, -0.26), (R(90), 0, 0), segments=24, mat=g).scale = (1, 1, 0.4)
    elif kind == "ward":
        P("cyl", "shield", (0.55, 0.66, 0.06), (0, FRONT, 0.03), (R(90), 0, 0), segments=6, mat=g)
        P("cyl", "inner", (0.36, 0.44, 0.08), (0, FRONT - 0.02, 0.03), (R(90), 0, 0), segments=6, mat=hot)
    elif kind in ("bolt", "pyre"):
        if kind == "bolt":
            P("sphere", "head", (0.24, 0.1, 0.24), (0.15, FRONT, 0.15), mat=hot, segments=16)
            for k in range(4):
                _spike("tail", 0.4 - k * 0.06, 0.12 - k * 0.02, -0.05 - k * 0.07, -0.05 - k * 0.07, 45 + 180, g)
        else:
            for x, h in ((0, 0.75), (-0.2, 0.45), (0.2, 0.5)):
                _spike("flame", h, 0.26, x, -0.25 + h / 2, 0, g)
            _spike("core", 0.4, 0.14, 0, -0.1, 0, hot)
    elif kind == "fan":
        for k in range(5):
            a = -50 + 25 * k
            _spike("knife", 0.42, 0.1, math.sin(R(a)) * 0.2, math.cos(R(a)) * 0.2 - 0.1, a, g if k != 2 else hot)
    elif kind == "blink":
        for s, m in ((-1, g), (1, hot)):
            P("torus", "portal", (0.42, 0.42, 0.25), (s * 0.2, FRONT, s * 0.12), (R(90), 0, 0), segments=24, mat=m)
        _bar("streak", 0.5, 0.05, 0, 0, -60, hot)
    elif kind == "rain":
        for x, z in ((-0.25, 0.25), (0.05, 0.35), (0.3, 0.15), (-0.1, -0.05), (0.2, -0.2), (-0.3, -0.25)):
            P("sphere", "drop", (0.13, 0.08, 0.13), (x, FRONT, z), mat=hot, segments=12)
            _bar("trail", 0.18, 0.05, x - 0.05, z + 0.12, -20, g)
    elif kind == "smoke":
        for x, z, r in ((-0.2, -0.1, 0.36), (0.18, -0.05, 0.32), (0.0, 0.18, 0.38), (0.05, -0.28, 0.3)):
            P("sphere", "puff", (r, 0.1, r), (x, FRONT, z), mat=g, segments=16)
    elif kind == "trap":
        for x, z in ((-0.25, -0.15), (0.25, -0.15), (0.0, 0.25), (0.0, -0.1)):
            for a in (0, 120, 240):
                _spike("spike", 0.2, 0.08, x + math.sin(R(a)) * 0.06, z + math.cos(R(a)) * 0.06, a, g)
    elif kind in ("cross", "flurry"):
        for s in (-1, 1):
            _spike("blade", 0.85, 0.12, 0, 0, s * 40, g)
        if kind == "flurry":
            for a in (0, 90, 180, 270):
                P("sphere", "spark", (0.08, 0.06, 0.08), (math.cos(R(a)) * 0.4, FRONT, math.sin(R(a)) * 0.4), mat=hot, segments=8)
    elif kind == "heart":
        for s in (-1, 1):
            P("sphere", "lobe", (0.3, 0.1, 0.3), (s * 0.13, FRONT, 0.08), mat=g, segments=16)
        _spike("point", 0.35, 0.5, 0, -0.15, 180, g)
    elif kind in ("star", "star2"):
        for a in range(0, 360, 45):
            ln = 0.42 if a % 90 == 0 else 0.24
            _spike("ray", ln, 0.1, math.sin(R(a)) * ln / 2, math.cos(R(a)) * ln / 2, a, hot if kind == "star2" and a % 90 == 0 else g)
        if kind == "star2":
            P("torus", "ring", (0.5, 0.5, 0.2), (0, FRONT, 0), (R(90), 0, 0), segments=24, mat=g)
    elif kind == "hourglass":
        _spike("top", 0.32, 0.4, 0, 0.16, 180, g)
        _spike("bottom", 0.32, 0.4, 0, -0.16, 0, hot)
        for z in (0.33, -0.33):
            _bar("cap", 0.06, 0.46, 0, z, 90, g)
    elif kind in ("up", "down"):
        for k in range(3):
            for s in (-1, 1):
                z = (-0.2 + k * 0.2) * (1 if kind == "up" else -1)
                _bar("chev", 0.26, 0.08, s * 0.09, z, s * (-40 if kind == "up" else 40), g if k < 2 else hot)
    elif kind == "skull":
        P("sphere", "skull", (0.46, 0.1, 0.44), (0, FRONT, 0.05), mat=g, segments=20)
        void = ddk.material("g_void", (0.0, 0.0, 0.0), 1.0)
        for s in (-1, 1):
            P("sphere", "eye", (0.12, 0.08, 0.12), (s * 0.1, FRONT - 0.05, 0.08), mat=void, segments=10)
        _bar("jaw", 0.08, 0.26, 0, -0.22, 90, g)


def finish():
    for o in list(ddk.bpy.data.objects):
        if o.type == "MESH":
            ddk.uv_unwrap(o, 1.0)


if __name__ == "__main__":
    only = [a for a in os.environ.get("DDK_ONLY", "").split(",") if a]
    for sid, (kind, colour) in SKILLS.items():
        if only and sid not in only:
            continue
        ddk.reset()
        disc()
        glyph(kind, colour)
        finish()
        iconkit.render(sid, "skills", view=(0.0, -1.0, 0.0), margin=1.02, key=(1.0, 0.9, 0.8))
    for pid, (cls, kind) in PASSIVES.items():
        if only and pid not in only:
            continue
        ddk.reset()
        disc("gold")
        glyph(kind, CLASS_COLOUR[cls])
        finish()
        iconkit.render(pid, "skills", view=(0.0, -1.0, 0.0), margin=1.02, key=(1.0, 0.9, 0.8))
