"""Hollowmere's building shells: houses (three sizes), St. Aldric's chapel, the Wardens' mausoleum and
the crypt gate. Design: docs/art/town-architecture-kit.md.

Each shell fills its map region on the 2 m grid, minus a margin, so the front face lands where
godot/scripts/world/town.gd already hangs doors, windows, chimneys and the rose window. The front
faces -Y (Godot +Z, toward the camera); the origin is on the ground at the region's centre.
"""
import math

import bmesh
import bpy

import ddk
import materials

R = math.radians


## UVs are in metres (world_uv below), so a material's scale is 1 / the metres one texture tile covers:
## ashlar 2.4 m (as the crypt walls), plaster 2 m, slate 1.6 m, timber 1.2 m.
def mats():
    return {
        "stone": ddk.material("b_stone", (0.62, 0.6, 0.64), 0.85, 0.0, materials.get("stone_wall"), scale=1 / 2.4),
        "lime": ddk.material("b_lime", (0.72, 0.7, 0.7), 0.85, 0.0, materials.get("stone_wall"), scale=1 / 2.0),
        "plaster": ddk.material("b_plaster", (0.82, 0.76, 0.7), 0.85, 0.0, materials.get("plaster"), scale=1 / 2.0),
        "timber": ddk.material("b_timber", (0.42, 0.33, 0.28), 0.8, 0.0, materials.get("timber"), scale=1 / 1.2),
        "slate": ddk.material("b_slate", (0.46, 0.43, 0.45), 0.6, 0.0, materials.get("roof_slate"), scale=1 / 1.6),
        "iron": ddk.material("b_iron", (0.2, 0.19, 0.21), 0.55, 1.0, materials.get("steel"), scale=1.0),
        "bronze": ddk.material("b_bronze", (0.42, 0.34, 0.24), 0.5, 1.0, materials.get("steel"), scale=1.0),
        "glass": ddk.material("b_glass", (0.35, 0.16, 0.36), 0.3, emission=(0.7, 0.25, 0.45), emission_strength=0.7),
        "void": ddk.material("b_void", (0.01, 0.008, 0.012), 1.0),
    }


def world_uv(obj):
    """UVs in metres, projected along each face's own plane: walls run horizontally and up, roofs run along
    the ridge and down the slope (so slate courses follow the pitch), floors and tops use X and Y. Big
    buildings then tile their materials at real size instead of stretching one tile over the whole wall."""
    from mathutils import Vector
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    uv = bm.loops.layers.uv.verify()
    up = Vector((0, 0, 1))
    for f in bm.faces:
        n = f.normal
        if abs(n.z) > 0.95:
            u_axis, v_axis = Vector((1, 0, 0)), Vector((0, 1, 0))
        else:
            u_axis = up.cross(n).normalized()
            v_axis = n.cross(u_axis).normalized()
        for loop in f.loops:
            p = loop.vert.co
            loop[uv].uv = (p.dot(u_axis), p.dot(v_axis))
    bm.to_mesh(obj.data)
    bm.free()


def done(name, dist):
    for o in list(bpy.data.objects):
        if o.type == "MESH":
            ddk.select_only(o)
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
            ddk.apply_modifiers(o)
            world_uv(o)
    ddk.export("props", name)
    ddk.preview(name, distance=dist, height=dist * 0.55, target_z=2.0)


def box(name, size, loc, mat, rot=(0, 0, 0), bevel=0.0):
    return ddk.prim("box", name, size, loc, rot, bevel=bevel, mat=mat)


def panel(name, pts, thick, mat, axis="y", at=0.0):
    """A flat polygon (list of (u, v)) extruded `thick` along an axis. axis "y": u = X, v = Z, placed at Y = at.
    axis "x": u = Y, v = Z, placed at X = at."""
    bm = bmesh.new()
    front, back = [], []
    for u, v in pts:
        if axis == "y":
            front.append(bm.verts.new((u, at - thick / 2, v)))
            back.append(bm.verts.new((u, at + thick / 2, v)))
        else:
            front.append(bm.verts.new((at - thick / 2, u, v)))
            back.append(bm.verts.new((at + thick / 2, u, v)))
    bm.faces.new(front)
    bm.faces.new(list(reversed(back)))
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], front[j], back[j], back[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = ddk.link(bpy.data.objects.new(name, mesh))
    ddk.assign(obj, mat)
    return obj


def lancet(cx, cz, w, h, thick, mat, axis="y", at=0.0):
    """A pointed-arch outline: a rectangle with a pointed top (the arch is a third of the height)."""
    a = h * 0.3
    pts = [(cx - w / 2, cz - h / 2), (cx + w / 2, cz - h / 2), (cx + w / 2, cz + h / 2 - a),
           (cx + w * 0.3, cz + h / 2 - a * 0.25), (cx, cz + h / 2), (cx - w * 0.3, cz + h / 2 - a * 0.25),
           (cx - w / 2, cz + h / 2 - a)]
    return panel("lancet", pts, thick, mat, axis, at)


def gable_roof(width, depth, eave_z, rise, overhang, thick, mat, ridge_along="x", sag=0.0):
    """Two slate slabs meeting at a ridge. ridge_along "x": the slopes face -Y and +Y."""
    half = (depth if ridge_along == "x" else width) / 2
    run = half + overhang
    ang = math.atan2(rise, half)
    length = run / math.cos(ang)
    along = (width if ridge_along == "x" else depth) + overhang * 2
    slabs = []
    for s in (-1, 1):
        mid = -s * 0 + s * run / 2  # midpoint across the slope
        z = eave_z + rise - (run / 2) * math.tan(ang) + thick / 2
        if ridge_along == "x":
            slab = box("roof", (along, length, thick), (0, mid, z), mat, rot=(-s * ang, 0, 0))
        else:
            slab = box("roof", (length, along, thick), (mid, 0, z), mat, rot=(0, s * ang, 0))
        if sag:
            ddk.displace(slab, sag, 2.5, seed=5 + s, subdivide=2)
        slabs.append(slab)
    ridge_len = along + 0.05
    if ridge_along == "x":
        box("ridge", (ridge_len, 0.2, 0.18), (0, 0, eave_z + rise + thick + 0.04), mat)
    else:
        box("ridge", (0.2, ridge_len, 0.18), (0, 0, eave_z + rise + thick + 0.04), mat)
    return slabs


# ============================================================================== houses

def house(name, width, depth):
    """Region width x depth metres (the 0.2 m margin is taken here)."""
    ddk.reset()
    m = mats()
    W, D = width - 0.4, depth - 0.4
    eave = 3.2
    front = -D / 2
    door_x, door_half = -0.2 * width, 0.65
    win_x, win_half = 0.22 * width, 0.55
    box("plinth", (W + 0.08, D + 0.08, 0.5), (0, 0, 0.25), m["stone"], bevel=0.03)
    box("walls", (W - 0.06, D - 0.06, eave - 0.5), (0, 0, 0.5 + (eave - 0.5) / 2), m["plaster"])
    t = m["timber"]
    # Corner posts, sill beams and wall plates (the frame stands 2 cm proud of the plaster).
    for sx in (-1, 1):
        for sy in (-1, 1):
            p = box("post", (0.22, 0.22, eave - 0.45), (sx * (W / 2 - 0.08), sy * (D / 2 - 0.08), 0.5 + (eave - 0.45) / 2), t, bevel=0.015)
            p.rotation_euler = (R(0.8 * sx * sy), R(0.6 * sx), 0)
    for z in (0.6, eave - 0.08):
        for sy in (-1, 1):
            box("beam", (W, 0.13, 0.18), (0, sy * (D / 2 - 0.04), z), t, bevel=0.01)
        for sx in (-1, 1):
            box("beam", (0.13, D, 0.18), (sx * (W / 2 - 0.04), 0, z), t, bevel=0.01)

    def clear_front(x, z0, z1):
        if abs(x - door_x) < door_half + 0.1 and z0 < 2.2:
            return False
        if abs(x - win_x) < win_half + 0.08 and z1 > 1.55 and z0 < 2.5:
            return False
        return True

    # Mid rails, split around the door on the front.
    rail_z = 1.5
    for sy in (-1, 1):
        if sy < 0:
            segs = [(-W / 2 + 0.1, door_x - door_half), (door_x + door_half, W / 2 - 0.1)]
        else:
            segs = [(-W / 2 + 0.1, W / 2 - 0.1)]
        for a, b in segs:
            if b - a > 0.2:
                box("rail", (b - a, 0.11, 0.15), ((a + b) / 2, sy * (D / 2 - 0.03), rail_z), t, bevel=0.01)
    for sx in (-1, 1):
        box("rail", (0.11, D - 0.2, 0.15), (sx * (W / 2 - 0.03), 0, rail_z), t, bevel=0.01)
    # Studs about every 1.2 m, leaving the door and window clear.
    n = max(2, round(W / 1.2))
    for i in range(1, n):
        x = -W / 2 + i * W / n
        for sy in (-1, 1):
            if sy < 0 and not clear_front(x, 0.6, eave):
                # Studs beside openings stop short of them: below the window only.
                if abs(x - win_x) < win_half + 0.08 and abs(x - door_x) >= door_half + 0.1:
                    box("stud", (0.13, 0.11, 0.9), (x, -(D / 2 - 0.03), 1.05), t, bevel=0.01)
                continue
            box("stud", (0.13, 0.11, eave - 0.78), (x, sy * (D / 2 - 0.03), 0.69 + (eave - 0.78) / 2), t, bevel=0.01)
    nd = max(1, round(D / 1.2))
    for i in range(1, nd):
        y = -D / 2 + i * D / nd
        for sx in (-1, 1):
            box("stud", (0.11, 0.13, eave - 0.78), (sx * (W / 2 - 0.03), y, 0.69 + (eave - 0.78) / 2), t, bevel=0.01)
    # Corner braces on the front and back; one corner repaired with a newer, paler timber the other way.
    new_wood = ddk.material("b_timber_new", (0.62, 0.5, 0.4), 0.8, 0.0, materials.get("timber"), scale=1.0)
    for sx in (-1, 1):
        for sy in (-1, 1):
            x0 = sx * (W / 2 - 0.2)
            x1 = sx * (W / 2 - 1.0)
            repaired = sx > 0 and sy < 0
            dx, dz = x1 - x0, 0.75
            ln = math.hypot(dx, dz)
            ang = math.atan2(dx, dz)
            box("brace", (0.12, 0.1, ln), ((x0 + x1) / 2, sy * (D / 2 - 0.02), 0.72 + dz / 2 + (1.55 if repaired else 0) * 0),
                new_wood if repaired else t, rot=(0, ang if not repaired else -ang * 0.85, 0), bevel=0.01)
    # Gable ends: plaster triangles, a king post and verge boards.
    rise = D / 2
    for sx in (-1, 1):
        x = sx * (W / 2 - 0.03)
        panel("gable", [(-D / 2, eave), (D / 2, eave), (0, eave + rise)], 0.12, m["plaster"], "x", x)
        box("king_post", (0.13, 0.14, rise - 0.15), (x + sx * 0.04, 0, eave + (rise - 0.15) / 2), t, bevel=0.01)
        for sy in (-1, 1):
            ln = math.hypot(D / 2, rise)
            box("verge", (0.12, ln + 0.3, 0.2), (x + sx * 0.06, sy * D / 4, eave + rise / 2 + 0.05), t,
                rot=(sy * math.atan2(rise, D / 2) * -1, 0, 0), bevel=0.01)
    gable_roof(W, D, eave, rise, 0.38, 0.12, m["slate"], "x")
    # Rafter ends under the eaves.
    for i in range(int(W / 0.6) + 1):
        x = -W / 2 + i * (W / int(W / 0.6))
        for sy in (-1, 1):
            box("rafter_end", (0.09, 0.32, 0.11), (x, sy * (D / 2 + 0.16), eave - 0.1), t)
    done(name, 13.0)


# ============================================================================== chapel

def chapel():
    ddk.reset()
    m = mats()
    W, D = 15.4, 11.4  # 16 x 12 m region, 0.3 m margin
    wall = 6.0
    st = m["stone"]
    box("plinth", (W + 0.3, D + 0.3, 0.6), (0, 0, 0.3), st, bevel=0.04)
    box("nave", (W, D, wall - 0.4), (0, 0, 0.4 + (wall - 0.4) / 2), st)
    box("cornice", (W + 0.3, D + 0.3, 0.25), (0, 0, wall), st, bevel=0.03)
    rise = 4.0
    gable_roof(W, D, wall + 0.1, rise, 0.4, 0.18, m["slate"], "y")
    for sy in (-1, 1):
        panel("gable", [(-W / 2, wall), (W / 2, wall), (0, wall + rise)], 0.6, st, "y", sy * (D / 2 - 0.3))
    # Buttresses: four per long side and two on each front corner, stepped, with sloped weatherings.
    def buttress(x, y, out_x, out_y):
        for k, (h, d) in enumerate(((3.2, 0.95), (4.6, 0.6))):
            sx = 0.7 if out_x == 0 else d
            sy = 0.7 if out_y == 0 else d
            box("buttress", (sx, sy, h), (x + out_x * d / 2, y + out_y * d / 2, 0.6 + h / 2), st, bevel=0.02)
            box("weathering", (sx + 0.04, sy + 0.04, 0.22), (x + out_x * d / 2, y + out_y * d / 2, 0.6 + h + 0.04), st,
                rot=(R(-20) * out_y, R(20) * out_x, 0), bevel=0.02)
    for i in range(4):
        y = -D / 2 + 1.6 + i * (D - 3.2) / 3
        for sx in (-1, 1):
            buttress(sx * W / 2, y, sx, 0)
    for sx in (-1, 1):
        buttress(sx * (W / 2 - 0.35), -D / 2, 0, -1)
        buttress(sx * (W / 2 - 0.35), D / 2, 0, 1)
    # Lancet windows: two on the front beside the tower, three on each long side between buttresses.
    for x in (-0.32 * (W + 0.6), 0.32 * (W + 0.6)):
        lancet(x, 3.6, 1.15, 2.9, 0.12, st, "y", -D / 2 - 0.05)
        lancet(x, 3.6, 0.9, 2.6, 0.08, m["glass"], "y", -D / 2 - 0.1)
    for i in range(3):
        y = -D / 2 + 1.6 + (i + 0.5) * (D - 3.2) / 3
        for sx in (-1, 1):
            lancet(y, 3.6, 1.15, 2.9, 0.12, st, "x", sx * (W / 2 + 0.05))
            lancet(y, 3.6, 0.9, 2.6, 0.08, m["glass"], "x", sx * (W / 2 + 0.1))
    # The bell tower, flush with the centre of the front: solid to 10.2 m, an open belfry, a parapet, the spire.
    T = 3.4
    ty = -D / 2 - 0.3 + T / 2  # front face at -6.0
    box("tower", (T, T, 10.2), (0, ty, 5.1), st)
    for z in (6.8, 10.2):
        box("string_course", (T + 0.25, T + 0.25, 0.22), (0, ty, z), st, bevel=0.03)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box("belfry_pier", (0.85, 0.85, 2.0), (sx * (T / 2 - 0.425), ty + sy * (T / 2 - 0.425), 11.2), st)
    box("belfry_floor", (T - 0.4, T - 0.4, 0.2), (0, ty, 10.3), m["void"])
    box("belfry_head", (T, T, 0.5), (0, ty, 12.45), st)
    box("parapet", (T + 0.3, T + 0.3, 0.4), (0, ty, 12.9), st, bevel=0.03)
    spire = ddk.prim("cone", "spire", (2.9, 2.9, 6.0), (0, ty, 13.1 + 3.0), segments=8, mat=m["slate"])
    spire.rotation_euler = (0, 0, R(22.5))
    for sx in (-1, 1):
        for sy in (-1, 1):
            ddk.prim("cone", "pinnacle", (0.4, 0.4, 1.4), (sx * (T / 2 - 0.1), ty + sy * (T / 2 - 0.1), 13.1 + 0.7), segments=4, mat=st)
    ddk.prim("cyl", "finial", (0.08, 0.08, 0.8), (0, ty, 19.4), segments=6, mat=m["iron"])
    box("finial_cross", (0.5, 0.06, 0.06), (0, ty, 19.55), m["iron"])
    # The door: a pointed stone arch, a dark recess, the oak door with iron bands.
    front = -D / 2 - 0.3
    lancet(0, 1.55, 2.3, 3.1, 0.2, st, "y", front - 0.05)
    lancet(0, 1.4, 1.75, 2.8, 0.06, m["void"], "y", front - 0.16)
    box("door", (1.6, 0.08, 2.4), (0, front - 0.2, 1.2), m["timber"], bevel=0.01)
    for z in (0.5, 1.3, 2.1):
        box("door_band", (1.62, 0.04, 0.08), (0, front - 0.25, z), m["iron"])
    done("chapel", 34.0)


# ============================================================================== mausoleum

def mausoleum():
    ddk.reset()
    m = mats()
    W, D = 7.4, 3.6  # 8 x 4 m region
    st = m["lime"]
    for k, (grow, h) in enumerate(((0.5, 0.15), (0.25, 0.15))):
        box("step", (W + grow, D + grow, h), (0, 0, k * 0.15 + h / 2), st, bevel=0.02)
    base = 0.3
    cella_front = -D / 2 + 0.85
    box("cella", (W - 0.3, D - 0.85, 3.4 - base), (0, (cella_front + D / 2) / 2, base + (3.4 - base) / 2), st)
    for sx in (-1, 1):
        box("pilaster", (0.4, 0.15, 3.1), (sx * (W / 2 - 0.35), D / 2 + 0.02, base + 1.55), st)
    # Portico: four columns, an entablature with a blank band, a pediment.
    for i in range(4):
        x = -W / 2 + 0.7 + i * (W - 1.4) / 3
        y = -D / 2 + 0.35
        box("col_base", (0.55, 0.55, 0.2), (x, y, base + 0.1), st, bevel=0.02)
        ddk.prim("cyl", "column", (0.4, 0.4, 2.6), (x, y, base + 0.2 + 1.3), segments=12, mat=st)
        box("capital", (0.6, 0.6, 0.22), (x, y, base + 2.9), st, bevel=0.03)
    box("entablature", (W, D, 0.5), (0, 0, 3.4 + 0.25), st, bevel=0.02)
    box("inscription", (W * 0.6, 0.04, 0.26), (0, -D / 2 - 0.02, 3.66), m["stone"])
    rise = 1.0
    panel("pediment", [(-W / 2, 3.9), (W / 2, 3.9), (0, 3.9 + rise)], 0.3, st, "y", -D / 2 + 0.15)
    panel("pediment_back", [(-W / 2, 3.9), (W / 2, 3.9), (0, 3.9 + rise)], 0.3, st, "y", D / 2 - 0.15)
    slab_rise = rise
    for s in (-1, 1):
        ln = math.hypot(W / 2 + 0.25, slab_rise)
        ang = math.atan2(slab_rise, W / 2)
        box("roof", (ln, D + 0.3, 0.14), (s * (W / 4 + 0.06), 0, 3.9 + slab_rise / 2 + 0.07), m["slate"], rot=(0, s * ang, 0))
    # Recessed bronze doors between the middle columns.
    box("door_recess", (1.7, 0.1, 2.5), (0, cella_front - 0.02, base + 1.25), m["void"])
    for sx in (-1, 1):
        box("door_leaf", (0.72, 0.06, 2.35), (sx * 0.38, cella_front - 0.06, base + 1.2), m["bronze"], bevel=0.01)
        for z in (0.7, 1.7):
            box("door_panel", (0.5, 0.03, 0.6), (sx * 0.38, cella_front - 0.1, base + z), m["bronze"], bevel=0.01)
    # Urns on the front corners; the left one is broken at the neck.
    for sx in (-1, 1):
        prof = [(0.0, 0.0), (0.16, 0.0), (0.1, 0.12), (0.22, 0.38), (0.2, 0.55), (0.09, 0.66), (0.12, 0.78), (0.0, 0.8)]
        if sx < 0:
            prof = [(0.0, 0.0), (0.16, 0.0), (0.1, 0.12), (0.22, 0.38), (0.2, 0.55), (0.12, 0.6), (0.0, 0.58)]
        ddk.lathe("urn", prof, 14, st, loc=(sx * (W / 2 + 0.05), -D / 2 - 0.1, 0.3))
    if True:
        ddk.prim("box", "urn_shard", (0.18, 0.12, 0.08), (-W / 2 - 0.4, -D / 2 - 0.45, 0.04), (R(20), R(35), R(10)), mat=st)
    done("mausoleum", 16.0)


# ============================================================================== crypt gate

def crypt_gate():
    ddk.reset()
    m = mats()
    st = m["stone"]
    iron = m["iron"]
    # The stairwell: a stone kerb round a pit, black inside, steps going down into it from the gate.
    box("kerb_back", (3.4, 0.35, 0.45), (0, 1.75, 0.225), st, bevel=0.03)
    for sx in (-1, 1):
        box("kerb_side", (0.35, 1.9, 0.45), (sx * 1.55, 0.85, 0.225), st, bevel=0.03)
    box("pit", (2.8, 1.6, 0.04), (0, 0.85, 0.03), m["void"])
    for i in range(5):
        top = 0.4 - i * 0.08
        box("step", (2.6, 0.3, 0.1), (0, 0.25 + i * 0.3, top - 0.05), st, bevel=0.015)
    # Piers with pyramid caps, and the lintel.
    for sx in (-1, 1):
        box("pier", (0.5, 0.5, 3.0), (sx * 1.75, 0, 1.5), st, bevel=0.02)
        cap = ddk.prim("cone", "pier_cap", (0.7, 0.7, 0.45), (sx * 1.75, 0, 3.0 + 0.225), segments=4, mat=st)
        cap.rotation_euler = (0, 0, R(45))
    box("lintel", (4.0, 0.55, 0.35), (0, 0, 2.85), st, bevel=0.02)

    def leaf(hinge_x, direction, angle):
        """A gate leaf 1.5 m wide hanging from hinge_x, opening `angle` degrees inward (+Y)."""
        pivot = ddk.link(bpy.data.objects.new("leaf", None))
        pivot.location = (hinge_x, 0, 0)
        parts = []
        for k in range(6):
            x = direction * (0.12 + k * 0.25)
            parts.append(ddk.prim("cyl", "bar", (0.05, 0.05, 2.4), (x, 0, 0.15 + 1.2), segments=6, mat=iron))
            parts.append(ddk.prim("cone", "spear", (0.1, 0.1, 0.22), (x, 0, 2.66), segments=4, mat=iron))
        for z in (0.35, 2.2):
            parts.append(box("rail", (1.5, 0.06, 0.08), (direction * 0.75, 0, z), iron))
        parts.append(ddk.prim("torus", "ring", (0.16, 0.16, 0.16), (direction * 1.32, -0.05, 1.2), (R(90), 0, 0), segments=12, mat=iron))
        for p in parts:
            p.parent = pivot
            p.location.x -= hinge_x
        pivot.rotation_euler = (0, 0, R(angle) * -direction)
        return parts

    leaf(-1.5, 1, 18)
    right = leaf(1.5, -1, 0)
    # A broken chain hanging from the right leaf.
    for k in range(4):
        ddk.prim("torus", "chain", (0.1, 0.1, 0.1), (1.5 - 1.3, -0.08, 1.15 - k * 0.11), (R(90) * (k % 2), 0, 0), segments=10, mat=iron)
    done("crypt_gate", 9.0)


if __name__ == "__main__":
    house("house_small", 6.0, 4.0)
    house("house_medium", 8.0, 6.0)
    house("house_large", 10.0, 6.0)
    chapel()
    mausoleum()
    crypt_gate()
