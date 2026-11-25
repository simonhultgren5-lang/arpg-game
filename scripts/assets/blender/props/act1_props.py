"""Act I props: torch sconce, barrel, crate, sarcophagus, crypt pillar, three gravestones, lamp post.
Each one is its own model: props/<name>.glb (+ .blend). Origins sit on the floor at the centre;
the torch sconce's origin is on the wall it hangs from, facing -Y (out of the wall)."""
import math

import ddk
import materials


def mats():
    return {
        "stone": ddk.material("stone", (0.62, 0.6, 0.6), 0.8, 0.0, materials.get("stone_wall"), scale=0.6),
        "slab": ddk.material("slab", (0.75, 0.72, 0.7), 0.8, 0.0, materials.get("flagstone"), scale=0.5),
        "wood": ddk.material("wood", (0.9, 0.85, 0.8), 0.8, 0.0, materials.get("timber"), scale=1.0),
        "iron": ddk.material("iron", (0.28, 0.27, 0.29), 0.5, 0.9, materials.get("steel"), scale=1.5),
        "bone": ddk.material("bone", (0.8, 0.76, 0.66), 0.65, 0.0, materials.get("bone"), scale=2.0),
        "flame": ddk.material("flame", (1.0, 0.55, 0.2), 0.5, emission=(1.0, 0.5, 0.15), emission_strength=8.0),
        "glass": ddk.material("lamp_glass", (1.0, 0.75, 0.4), 0.2, emission=(1.0, 0.65, 0.3), emission_strength=4.0),
    }


def done(name):
    for o in list(ddk.bpy.data.objects):
        if o.type == "MESH":
            ddk.select_only(o)
            ddk.bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
            ddk.apply_modifiers(o)
            ddk.uv_unwrap(o, 1.0)
    ddk.export("props", name)
    ddk.preview(name, distance=2.6, height=0.6, target_z=0.5)


# ---------------------------------------------------------------------------- torch sconce
ddk.reset()
m = mats()
ddk.prim("box", "plate", (0.16, 0.03, 0.28), (0, -0.015, 0), bevel=0.01, mat=m["iron"])
arm = ddk.prim("cyl", "arm", (0.03, 0.03, 0.26), (0, -0.12, 0.05), (math.radians(-60), 0, 0), 8, mat=m["iron"])
ddk.lathe("cup", [(0.02, 0.0), (0.07, 0.04), (0.085, 0.12), (0.08, 0.13)], 16, m["iron"], loc=(0, -0.24, 0.1))
ddk.lathe("torch", [(0.03, 0.0), (0.035, 0.18), (0.05, 0.26), (0.0, 0.27)], 10, m["wood"], loc=(0, -0.24, 0.12))
for i in range(4):
    a = i * math.pi / 2
    ddk.prim("cone", f"prong{i}", (0.02, 0.02, 0.09), (math.cos(a) * 0.075, -0.24 + math.sin(a) * 0.075, 0.27), segments=6, mat=m["iron"])
ddk.prim("cone", "flame", (0.12, 0.12, 0.26), (0, -0.24, 0.48), segments=12, mat=m["flame"])
done("torch_sconce")

# ---------------------------------------------------------------------------- barrel
ddk.reset()
m = mats()
ddk.lathe("staves", [(0.0, 0.0), (0.26, 0.0), (0.3, 0.2), (0.32, 0.4), (0.3, 0.6), (0.26, 0.8), (0.0, 0.8)], 24, m["wood"])
for z in (0.1, 0.32, 0.48, 0.7):
    r = 0.3 if 0.2 < z < 0.6 else 0.28
    ddk.lathe(f"hoop{z}", [(r + 0.005, z - 0.02), (r + 0.015, z - 0.01), (r + 0.015, z + 0.02), (r + 0.005, z + 0.03)], 24, m["iron"])
done("barrel")

# ---------------------------------------------------------------------------- crate
ddk.reset()
m = mats()
ddk.prim("box", "crate", (0.6, 0.6, 0.6), (0, 0, 0.3), bevel=0.02, mat=m["wood"])
for z in (0.04, 0.56):
    for rot in (0, math.pi / 2):
        ddk.prim("box", "rail", (0.64, 0.07, 0.07), (0, 0, z), (0, 0, rot), bevel=0.01, mat=m["wood"])
for s in (-1, 1):
    # A diagonal brace across the front and back faces.
    ddk.prim("box", "brace", (0.78, 0.05, 0.07), (0, s * 0.31, 0.3), (0, math.radians(45), 0), bevel=0.01, mat=m["wood"])
done("crate")

# ---------------------------------------------------------------------------- sarcophagus
ddk.reset()
m = mats()
ddk.prim("box", "tomb_base", (0.9, 1.9, 0.12), (0, 0, 0.06), bevel=0.02, mat=m["slab"])
ddk.prim("box", "tomb_body", (0.8, 1.8, 0.62), (0, 0, 0.43), bevel=0.02, mat=m["stone"])
lid = ddk.prim("box", "tomb_lid", (0.9, 1.95, 0.14), (0.02, 0.03, 0.81), (0, 0, math.radians(3)), bevel=0.03, mat=m["slab"])
effigy = ddk.lathe("effigy", [(0.0, 0.0), (0.16, 0.0), (0.18, 0.06), (0.14, 0.1), (0.0, 0.11)], 16, m["stone"], loc=(0, 0.1, 0.88), rot=(0, 0, 0))
effigy.scale = (1.0, 4.0, 1.0)
ddk.prim("sphere", "effigy_head", (0.18, 0.2, 0.16), (0, -0.62, 0.95), segments=16, mat=m["stone"])
for x in (-0.25, 0.25):
    ddk.prim("box", "panel", (0.02, 1.4, 0.36), (x * 1.62, 0, 0.43), bevel=0.01, mat=m["slab"])
ddk.prim("sphere", "skull", (0.12, 0.14, 0.12), (0.3, -0.75, 0.94), segments=12, mat=m["bone"])
done("sarcophagus")

# ---------------------------------------------------------------------------- crypt pillar
ddk.reset()
m = mats()
ddk.prim("box", "plinth", (0.75, 0.75, 0.25), (0, 0, 0.125), bevel=0.03, mat=m["slab"])
ddk.lathe("base_mould", [(0.33, 0.25), (0.36, 0.3), (0.3, 0.36), (0.28, 0.4)], 24, m["stone"])
shaft = ddk.lathe("shaft", [(0.0, 0.4), (0.27, 0.4), (0.25, 1.6), (0.23, 2.3), (0.0, 2.3)], 24, m["stone"])
ddk.displace(shaft, 0.012, 0.2, 4, subdivide=1)
ddk.lathe("capital", [(0.22, 2.3), (0.3, 2.38), (0.38, 2.5), (0.38, 2.6), (0.0, 2.6)], 24, m["stone"])
done("crypt_pillar")

# ---------------------------------------------------------------------------- gravestones
for name, kind in (("gravestone_round", 0), ("gravestone_cross", 1), ("gravestone_slab", 2)):
    ddk.reset()
    m = mats()
    if kind == 0:
        stone = ddk.prim("box", "stone", (0.6, 0.16, 0.8), (0, 0, 0.4), bevel=0.02, mat=m["stone"])
        ddk.prim("cyl", "round_top", (0.6, 0.6, 0.16), (0, 0, 0.8), (math.radians(90), 0, 0), 24, mat=m["stone"])
    elif kind == 1:
        ddk.prim("box", "post", (0.14, 0.14, 1.1), (0, 0, 0.55), bevel=0.015, mat=m["stone"])
        ddk.prim("box", "bar", (0.55, 0.14, 0.14), (0, 0, 0.8), bevel=0.015, mat=m["stone"])
        ddk.prim("box", "foot", (0.36, 0.3, 0.14), (0, 0, 0.07), bevel=0.02, mat=m["stone"])
    else:
        ddk.prim("box", "slab", (0.7, 0.18, 0.95), (0, 0, 0.47), bevel=0.03, mat=m["slab"])
    for o in list(ddk.bpy.data.objects):
        ddk.displace(o, 0.01, 0.3, kind)
    # They lean a little, the way old stones do.
    for o in list(ddk.bpy.data.objects):
        o.rotation_euler.x += math.radians(4 + kind)
        o.rotation_euler.y += math.radians(2 - kind * 2)
    mound = ddk.prim("box", "mound", (0.8, 1.6, 0.22), (0, 0.85, 0.05), bevel=0.08, subsurf=2, mat=ddk.material("earth", (1, 1, 1), 0.9, 0.0, materials.get("earth"), scale=0.5))
    done(name)

# ---------------------------------------------------------------------------- lamp post
ddk.reset()
m = mats()
ddk.lathe("post", [(0.0, 0.0), (0.12, 0.0), (0.12, 0.12), (0.06, 0.2), (0.045, 2.6), (0.06, 2.7), (0.0, 2.72)], 12, m["iron"])
ddk.prim("box", "bracket", (0.6, 0.04, 0.04), (0.28, 0, 2.62), bevel=0.008, mat=m["iron"])
ddk.prim("cyl", "chain", (0.015, 0.015, 0.14), (0.52, 0, 2.53), segments=6, mat=m["iron"])
ddk.lathe("lantern_cap", [(0.0, 0.2), (0.1, 0.14), (0.12, 0.12)], 8, m["iron"], loc=(0.52, 0, 2.18))
ddk.prim("cyl", "lantern_glass", (0.16, 0.16, 0.22), (0.52, 0, 2.22), segments=8, mat=m["glass"])
ddk.prim("cyl", "lantern_base", (0.2, 0.2, 0.03), (0.52, 0, 2.1), segments=8, mat=m["iron"])
done("lamp_post")
