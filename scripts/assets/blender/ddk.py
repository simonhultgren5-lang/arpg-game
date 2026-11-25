"""Depths of Darkness asset kit for Blender (4.5 LTS).

Every model and material of the game is made by a script that imports this module, so anyone can
rebuild, tweak or extend them (see assets.md). Run through scripts/assets/build.mjs:

    bun run assets:build                 # everything
    bun run assets:build -- warrior      # scripts whose name contains "warrior"

What's here:
  - Tileable PBR textures synthesized with numpy (value noise, fBm, cells, bricks, planks) and
    saved as PNG: albedo, normal (OpenGL, +Y), roughness.
  - Materials that use those textures, in a form the glTF exporter understands.
  - A character builder: a smooth body from a skin-modifier "stick figure" with per-joint radii,
    an armature with named bones and automatic weights, and hard-surface parts (armour, hoods,
    weapons) bound rigidly to bones.
  - Animation clips (idle, walk, attack, cast, hit, death) keyed on the bones, exported as named
    glTF animations ("idle", "walk", ...). Godot imports them into the model's AnimationPlayer.
  - glTF export, .blend saving and a preview render.
"""

import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
GAME_MODELS = os.path.join(ROOT, "godot", "assets", "models")
GAME_TEXTURES = os.path.join(ROOT, "godot", "assets", "textures", "materials")
SOURCE_MODELS = os.path.join(ROOT, "source-assets", "Models")
PREVIEWS = os.environ.get("DDK_PREVIEWS", "")  # folder for preview renders, if set
FPS = 24


# ---------------------------------------------------------------------------- scene

def reset():
    """Start from an empty scene with metric units and 24 fps."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.unit_settings.system = "METRIC"
    return scene


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def select_only(*objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0] if objs else None


def apply_modifiers(obj):
    select_only(obj)
    for m in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def shade_smooth(obj, angle=40.0):
    """Smooth shading that keeps hard edges sharper than `angle` degrees."""
    select_only(obj)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))


# ---------------------------------------------------------------------------- textures (numpy, tileable)

def _rng(seed):
    return np.random.default_rng(seed)


def value_noise(size, cells, seed):
    """Smooth tileable noise in [0, 1]: a random `cells` x `cells` grid, wrapped and smoothstepped."""
    g = _rng(seed).random((cells, cells))
    u = np.arange(size) * cells / size
    i0 = np.floor(u).astype(int)
    f = u - i0
    f = f * f * (3 - 2 * f)
    i1 = (i0 + 1) % cells
    i0 %= cells
    a = g[i0][:, i0]
    b = g[i0][:, i1]
    c = g[i1][:, i0]
    d = g[i1][:, i1]
    fx = f[None, :]
    fy = f[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(size, cells=4, octaves=5, seed=0, gain=0.5):
    out = np.zeros((size, size))
    amp, total = 1.0, 0.0
    for o in range(octaves):
        c = cells * 2 ** o
        if c > size:
            break
        out += amp * value_noise(size, c, seed + o * 101)
        total += amp
        amp *= gain
    return out / total


def cells(size, count, seed, jitter=1.0):
    """Tileable Worley noise: (distance to nearest point, distance to second, nearest point id)."""
    rng = _rng(seed)
    # A jittered grid: one point per grid cell, moved by up to `jitter` of a cell, so points spread
    # evenly (jitter=1 still keeps them from clumping like plain random points would).
    n = int(math.ceil(math.sqrt(count)))
    gy, gx = np.mgrid[0:n, 0:n]
    grid = np.stack([gx.ravel(), gy.ravel()], axis=1)[:count]
    pts = (grid + 0.5 + (rng.random((count, 2)) - 0.5) * jitter) / n
    tiles = np.concatenate([pts + [dx, dy] for dy in (-1, 0, 1) for dx in (-1, 0, 1)])
    ids = np.tile(np.arange(count), 9)
    ys, xs = np.mgrid[0:size, 0:size] / size
    d1 = np.full((size, size), 9.0)
    d2 = np.full((size, size), 9.0)
    nid = np.zeros((size, size), dtype=int)
    for k, (px, py) in enumerate(tiles):
        d = np.hypot(xs - px, ys - py)
        closer = d < d1
        d2 = np.where(closer, d1, np.minimum(d2, d))
        nid = np.where(closer, ids[k], nid)
        d1 = np.where(closer, d, d1)
    return d1, d2, nid


def blur(img, r=1):
    out = img.copy()
    for _ in range(r):
        out = (out + np.roll(out, 1, 0) + np.roll(out, -1, 0) + np.roll(out, 1, 1) + np.roll(out, -1, 1)) / 5
    return out


def normal_from_height(h, strength=4.0):
    """OpenGL normal map (green up) from a tileable height map."""
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    n = np.dstack([-dx, dy, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n * 0.5 + 0.5


def colorize(t, stops):
    """Map t in [0, 1] through colour stops [(t, (r, g, b)), ...]."""
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,))
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        m = (t >= t0) & (t <= t1)
        f = ((t - t0) / max(t1 - t0, 1e-6))[..., None]
        out = np.where(m[..., None], np.array(c0) * (1 - f) + np.array(c1) * f, out)
    return out


def save_png(path, arr):
    """Save an HxW (gray) or HxWx3 array in [0, 1] as an 8-bit PNG (row 0 is the top)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    h, w = arr.shape[:2]
    rgb = np.dstack([arr] * 3) if arr.ndim == 2 else arr[..., :3]
    rgba = np.dstack([np.clip(rgb, 0, 1), np.ones((h, w))])
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=False)
    img.pixels.foreach_set(np.flipud(rgba).astype(np.float32).ravel())
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)
    print("  texture", os.path.relpath(path, ROOT))
    return path


def save_material_set(name, albedo, height, rough, normal_strength=4.0, folder=GAME_TEXTURES):
    """Write <name>_albedo.png, <name>_normal.png and <name>_roughness.png. Returns their paths."""
    return {
        "albedo": save_png(os.path.join(folder, f"{name}_albedo.png"), albedo),
        "normal": save_png(os.path.join(folder, f"{name}_normal.png"), normal_from_height(height, normal_strength)),
        "roughness": save_png(os.path.join(folder, f"{name}_roughness.png"), rough),
    }


# ---------------------------------------------------------------------------- materials

def material(name, color=(0.5, 0.5, 0.5), rough=0.8, metal=0.0, textures=None, scale=1.0, emission=None, emission_strength=1.0):
    """A Principled material the glTF exporter can write: base colour (x texture), roughness, normal map.

    `textures` is a dict from save_material_set (or None for a plain colour). `scale` tiles them.
    A name starting with "tint_" marks surfaces the game recolours with the hero's armour colour.
    """
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if textures:
        uv = nt.nodes.new("ShaderNodeTexCoord")
        mapping = nt.nodes.new("ShaderNodeMapping")
        mapping.inputs["Scale"].default_value = (scale, scale, scale)
        nt.links.new(uv.outputs["UV"], mapping.inputs["Vector"])

        def tex(path, non_color=False):
            node = nt.nodes.new("ShaderNodeTexImage")
            node.image = bpy.data.images.load(path, check_existing=True)
            if non_color:
                node.image.colorspace_settings.name = "Non-Color"
            nt.links.new(mapping.outputs["Vector"], node.inputs["Vector"])
            return node

        a = tex(textures["albedo"])
        mul = nt.nodes.new("ShaderNodeMix")
        mul.data_type = "RGBA"
        mul.blend_type = "MULTIPLY"
        mul.inputs["Factor"].default_value = 1.0
        mul.inputs[6].default_value = (*color, 1.0)
        nt.links.new(a.outputs["Color"], mul.inputs[7])
        nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])
        r = tex(textures["roughness"], True)
        nt.links.new(r.outputs["Color"], bsdf.inputs["Roughness"])
        n = tex(textures["normal"], True)
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(n.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


def uv_unwrap(obj, scale=1.0):
    """Smart UV project, then scale the UVs so textures keep a similar texel size on every part."""
    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.02, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    if scale != 1.0:
        for loop in obj.data.uv_layers.active.data:
            loop.uv *= scale


# ---------------------------------------------------------------------------- hard-surface parts

def _new_obj(name, mesh):
    return link(bpy.data.objects.new(name, mesh))


def prim(kind, name, size=(1, 1, 1), loc=(0, 0, 0), rot=(0, 0, 0), segments=24, bevel=0.0, subsurf=0, mat=None):
    """A primitive part: 'box', 'cyl', 'cone', 'sphere', 'torus'. size is the full extent (x, y, z)."""
    bm = bmesh.new()
    if kind == "box":
        bmesh.ops.create_cube(bm, size=1.0)
    elif kind == "cyl":
        bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=0.5, radius2=0.5, depth=1.0)
    elif kind == "cone":
        bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=0.5, radius2=0.0, depth=1.0)
    elif kind == "sphere":
        bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=max(6, segments // 2), radius=0.5)
    elif kind == "torus":
        mesh = bpy.data.meshes.new(name)
        bm.free()
        bpy.ops.mesh.primitive_torus_add(major_radius=0.5, minor_radius=0.12, major_segments=segments, minor_segments=8)
        obj = bpy.context.active_object
        obj.name = name
        obj.scale = size
        obj.location = loc
        obj.rotation_euler = rot
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        if mat:
            assign(obj, mat)
        return obj
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = _new_obj(name, mesh)
    obj.scale = size
    obj.location = loc
    obj.rotation_euler = rot
    select_only(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        m = obj.modifiers.new("bevel", "BEVEL")
        m.width = bevel
        m.segments = 3
        m.limit_method = "ANGLE"
    if subsurf:
        m = obj.modifiers.new("subsurf", "SUBSURF")
        m.levels = subsurf
        m.render_levels = subsurf
    if mat:
        assign(obj, mat)
    return obj


def lathe(name, profile, segments=24, mat=None, loc=(0, 0, 0), rot=(0, 0, 0), closed_top=True):
    """Revolve a 2D profile [(radius, height), ...] around Z. Smooth, with UVs from the profile."""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        ring = []
        for i in range(segments):
            a = 2 * math.pi * i / segments
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(segments):
            j = (i + 1) % segments
            bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
    if profile[0][0] > 1e-4:
        bm.faces.new(list(reversed(rings[0])))
    if closed_top and profile[-1][0] > 1e-4:
        bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = _new_obj(name, mesh)
    obj.location = loc
    obj.rotation_euler = rot
    shade_smooth(obj, 50)
    if mat:
        assign(obj, mat)
    return obj


def blade(name, length, width, thickness, mat=None, tip=0.18, fuller=True):
    """A straight double-edged blade along +Z with a diamond cross-section and a pointed tip."""
    bm = bmesh.new()
    half_w, half_t = width / 2, thickness / 2
    body = length * (1 - tip)
    sections = [(0.0, 1.0), (body * 0.5, 0.97), (body, 0.9)]
    rings = []
    for z, s in sections:
        rings.append([bm.verts.new(v) for v in [(half_w * s, 0, z), (0, half_t, z), (-half_w * s, 0, z), (0, -half_t, z)]])
    point = bm.verts.new((0, 0, length))
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(4):
            bm.faces.new((r0[i], r0[(i + 1) % 4], r1[(i + 1) % 4], r1[i]))
    for i in range(4):
        bm.faces.new((rings[-1][i], rings[-1][(i + 1) % 4], point))
    bm.faces.new(list(reversed(rings[0])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = _new_obj(name, mesh)
    if mat:
        assign(obj, mat)
    return obj


def displace(obj, strength=0.03, scale=0.3, seed=0, subdivide=0):
    """Organic unevenness: (optionally subdivide) and push vertices along a noise texture."""
    if subdivide:
        m = obj.modifiers.new("sub", "SUBSURF")
        m.levels = subdivide
        m.render_levels = subdivide
    tex = bpy.data.textures.new(f"{obj.name}_noise", "CLOUDS")
    tex.noise_scale = scale
    tex.noise_depth = 2
    m = obj.modifiers.new("disp", "DISPLACE")
    m.texture = tex
    m.strength = strength
    m.mid_level = 0.5
    m.texture_coords = "OBJECT"
    return obj


# ---------------------------------------------------------------------------- characters

HUMANOID_BONES = [
    # name, head, tail, parent    (metres, Blender Z-up, character faces -Y)
    ("root", (0, 0, 0), (0, 0, 0.25), None),
    ("hips", (0, 0, 0.98), (0, 0, 1.12), "root"),
    ("spine", (0, 0, 1.12), (0, 0, 1.32), "hips"),
    ("chest", (0, 0, 1.32), (0, 0, 1.52), "spine"),
    ("neck", (0, 0, 1.52), (0, 0, 1.62), "chest"),
    ("head", (0, 0, 1.62), (0, 0, 1.86), "neck"),
    ("shoulder.L", (0.06, 0, 1.47), (0.19, 0, 1.47), "chest"),
    ("upper_arm.L", (0.19, 0, 1.47), (0.24, 0.02, 1.2), "shoulder.L"),
    ("forearm.L", (0.24, 0.02, 1.2), (0.27, -0.02, 0.96), "upper_arm.L"),
    ("hand.L", (0.27, -0.02, 0.96), (0.28, -0.04, 0.86), "forearm.L"),
    ("thigh.L", (0.1, 0, 0.98), (0.11, 0, 0.53), "hips"),
    ("shin.L", (0.11, 0, 0.53), (0.11, 0.02, 0.09), "thigh.L"),
    ("foot.L", (0.11, 0.02, 0.09), (0.11, -0.13, 0.03), "shin.L"),
]


def _mirror_bones(bones):
    out = []
    for name, head, tail, parent in bones:
        out.append((name, head, tail, parent))
        if name.endswith(".L"):
            out.append((name[:-2] + ".R", (-head[0], head[1], head[2]), (-tail[0], tail[1], tail[2]),
                        parent[:-2] + ".R" if parent and parent.endswith(".L") else parent))
    return out


def armature(name, bones, scale=1.0):
    """An armature from [(name, head, tail, parent)]. `.L` bones are mirrored to `.R` automatically."""
    data = bpy.data.armatures.new(name)
    arm = _new_obj(name, data)
    select_only(arm)
    bpy.ops.object.mode_set(mode="EDIT")
    made = {}
    for bname, head, tail, parent in _mirror_bones(bones):
        b = data.edit_bones.new(bname)
        b.head = Vector(head) * scale
        b.tail = Vector(tail) * scale
        if parent:
            b.parent = made[parent]
            b.use_connect = (made[parent].tail - b.head).length < 1e-4
        made[bname] = b
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm


def skin_body(name, joints, edges, mat=None, subsurf=3):
    """A smooth body from a stick figure: joints {name: ((x, y, z), radius_x, radius_y)}, edges [(a, b)].

    The skin modifier wraps the sticks in a skin with the radius of each joint; subdivision smooths it.
    Both are applied, so the result is an ordinary mesh ready for weights and export.
    """
    names = list(joints)
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([joints[n][0] for n in names], [(names.index(a), names.index(b)) for a, b in edges], [])
    obj = _new_obj(name, mesh)
    skin = obj.modifiers.new("skin", "SKIN")
    skin.use_smooth_shade = True
    skin.branch_smoothing = 0.6
    for i, n in enumerate(names):
        _, rx, ry = joints[n]
        obj.data.skin_vertices[0].data[i].radius = (rx, ry)
    obj.data.skin_vertices[0].data[names.index(edges[0][0])].use_root = True
    sub = obj.modifiers.new("subsurf", "SUBSURF")
    sub.levels = subsurf
    sub.render_levels = subsurf
    apply_modifiers(obj)
    shade_smooth(obj, 180)
    if mat:
        assign(obj, mat)
    return obj


def bind_body(body, arm):
    """Skin the body to the armature with automatic (heat) weights."""
    select_only(body, arm)
    bpy.context.view_layer.objects.active = arm
    body.select_set(True)
    arm.select_set(True)
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    return body


def attach(obj, arm, bone):
    """Bind a rigid part to one bone (it moves with the bone exactly, no deformation)."""
    world = obj.matrix_world.copy()
    obj.parent = arm
    obj.parent_type = "BONE"
    obj.parent_bone = bone
    obj.matrix_world = world
    return obj


# ---------------------------------------------------------------------------- animation

def _pose(arm):
    select_only(arm)
    bpy.ops.object.mode_set(mode="POSE")
    for pb in arm.pose.bones:
        pb.rotation_mode = "XYZ"
    return arm.pose.bones


def clip(arm, name, length_s, keys, loop=False):
    """Make an action `name` of `length_s` seconds.

    keys: {bone: [(time_s, (rx, ry, rz) degrees), ...]} for rotations, and
          {"bone@loc": [(time_s, (x, y, z)), ...]} for locations (metres, bone space).
    A looping clip repeats its first key at the end, so it cycles without a hitch.
    """
    bones = _pose(arm)
    action = bpy.data.actions.new(name)
    arm.animation_data_create()
    arm.animation_data.action = action
    for pb in bones:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
    frames = round(length_s * FPS)
    for key, track in keys.items():
        bone, _, what = key.partition("@")
        pb = bones.get(bone)
        if pb is None:
            continue
        if loop and track[-1][0] < length_s - 1e-6:
            track = list(track) + [(length_s, track[0][1])]
        for t, value in track:
            f = 1 + round(t * FPS)
            if what == "loc":
                pb.location = value
                pb.keyframe_insert("location", frame=f)
            else:
                pb.rotation_euler = [math.radians(v) for v in value]
                pb.keyframe_insert("rotation_euler", frame=f)
    action.frame_range = (1, 1 + frames)
    action.use_frame_range = True
    # Keep every action: the exporter writes each as a named animation.
    action.use_fake_user = True
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, action)
    arm.animation_data.action = None
    bpy.ops.object.mode_set(mode="OBJECT")
    return action


def sine_track(length_s, steps, fn):
    """[(t, value)] sampled from fn(phase in 0..2pi) at `steps` points across the clip."""
    return [(length_s * i / steps, fn(2 * math.pi * i / steps)) for i in range(steps)]


def humanoid_clips(arm, weapon="sword", heavy=1.0):
    """The standard clips for a two-legged character. `weapon` shapes the attack ('sword', 'staff',
    'daggers', 'bow', 'claws', 'mace'); `heavy` slows and deepens everything for big monsters."""
    s = heavy
    # idle: breathing, a small weight shift
    clip(arm, "idle", 2.4 * s, {
        "chest": sine_track(2.4 * s, 4, lambda p: (2.5 * math.sin(p), 0, 0)),
        "head": sine_track(2.4 * s, 4, lambda p: (-1.5 * math.sin(p), 2 * math.sin(p / 1), 0)),
        "upper_arm.L": sine_track(2.4 * s, 4, lambda p: (2 * math.sin(p), 0, -4)),
        "upper_arm.R": sine_track(2.4 * s, 4, lambda p: (2 * math.sin(p), 0, 4)),
        "hips@loc": sine_track(2.4 * s, 4, lambda p: (0, 0, 0.008 * math.sin(p))),
    }, loop=True)
    # walk: legs swing, knees bend on the passing pose, arms counter-swing, the body bobs
    w = 1.0 * s
    clip(arm, "walk", w, {
        "thigh.L": sine_track(w, 8, lambda p: (28 * math.sin(p), 0, 0)),
        "thigh.R": sine_track(w, 8, lambda p: (-28 * math.sin(p), 0, 0)),
        "shin.L": sine_track(w, 8, lambda p: (-max(0, 40 * math.sin(p + 1.4)), 0, 0)),
        "shin.R": sine_track(w, 8, lambda p: (-max(0, 40 * math.sin(p + 1.4 + math.pi)), 0, 0)),
        "foot.L": sine_track(w, 8, lambda p: (10 * math.sin(p - 0.6), 0, 0)),
        "foot.R": sine_track(w, 8, lambda p: (-10 * math.sin(p - 0.6), 0, 0)),
        "upper_arm.L": sine_track(w, 8, lambda p: (-22 * math.sin(p), 0, -5)),
        "upper_arm.R": sine_track(w, 8, lambda p: (22 * math.sin(p), 0, 5)),
        "forearm.L": sine_track(w, 8, lambda p: (-15 - 10 * math.sin(p), 0, 0)),
        "forearm.R": sine_track(w, 8, lambda p: (-15 + 10 * math.sin(p), 0, 0)),
        "spine": sine_track(w, 8, lambda p: (4, 5 * math.sin(p), 0)),
        "hips@loc": sine_track(w, 8, lambda p: (0, 0, 0.025 * abs(math.sin(p)))),
    }, loop=True)
    # attack
    a = 0.6 * s
    if weapon in ("sword", "mace", "daggers", "claws"):
        keys = {
            "upper_arm.R": [(0, (0, 0, 5)), (a * 0.35, (-120, -20, 40)), (a * 0.55, (40, 10, -20)), (a, (0, 0, 5))],
            "forearm.R": [(0, (-10, 0, 0)), (a * 0.35, (-70, 0, 0)), (a * 0.55, (-5, 0, 0)), (a, (-10, 0, 0))],
            "chest": [(0, (0, 0, 0)), (a * 0.35, (-6, 0, -25)), (a * 0.55, (10, 0, 30)), (a, (0, 0, 0))],
            "hips@loc": [(0, (0, 0, 0)), (a * 0.55, (0, -0.04, -0.03)), (a, (0, 0, 0))],
        }
        if weapon in ("daggers", "claws"):
            keys["upper_arm.L"] = [(0, (0, 0, -5)), (a * 0.45, (-110, 20, -40)), (a * 0.7, (40, -10, 20)), (a, (0, 0, -5))]
            keys["forearm.L"] = [(0, (-10, 0, 0)), (a * 0.45, (-70, 0, 0)), (a * 0.7, (-5, 0, 0)), (a, (-10, 0, 0))]
        clip(arm, "attack", a, keys)
    elif weapon == "bow":
        clip(arm, "attack", a * 1.4, {
            "upper_arm.L": [(0, (0, 0, -5)), (a * 0.3, (-85, 0, -10)), (a * 1.1, (-85, 0, -10)), (a * 1.4, (0, 0, -5))],
            "upper_arm.R": [(0, (0, 0, 5)), (a * 0.3, (-80, 0, 30)), (a * 0.9, (-70, 0, 60)), (a * 1.0, (-80, 0, 30)), (a * 1.4, (0, 0, 5))],
            "forearm.R": [(0, (-10, 0, 0)), (a * 0.9, (-110, 0, 0)), (a * 1.4, (-10, 0, 0))],
            "chest": [(0, (0, 0, 0)), (a * 0.3, (0, 0, -30)), (a * 1.1, (0, 0, -30)), (a * 1.4, (0, 0, 0))],
        })
    else:  # staff: a thrust of the staff, and a casting pose
        clip(arm, "attack", a, {
            "upper_arm.R": [(0, (0, 0, 5)), (a * 0.4, (-60, 0, 15)), (a * 0.6, (-95, 0, 5)), (a, (0, 0, 5))],
            "forearm.R": [(0, (-20, 0, 0)), (a * 0.4, (-60, 0, 0)), (a * 0.6, (-10, 0, 0)), (a, (-20, 0, 0))],
            "chest": [(0, (0, 0, 0)), (a * 0.6, (8, 0, -10)), (a, (0, 0, 0))],
        })
    # cast: both arms forward and up, then release
    c = 0.7 * s
    clip(arm, "cast", c, {
        "upper_arm.L": [(0, (0, 0, -5)), (c * 0.45, (-95, 0, -15)), (c * 0.65, (-70, 0, -35)), (c, (0, 0, -5))],
        "upper_arm.R": [(0, (0, 0, 5)), (c * 0.45, (-95, 0, 15)), (c * 0.65, (-70, 0, 35)), (c, (0, 0, 5))],
        "forearm.L": [(0, (-10, 0, 0)), (c * 0.45, (-30, 0, 0)), (c, (-10, 0, 0))],
        "forearm.R": [(0, (-10, 0, 0)), (c * 0.45, (-30, 0, 0)), (c, (-10, 0, 0))],
        "chest": [(0, (0, 0, 0)), (c * 0.45, (-10, 0, 0)), (c * 0.65, (8, 0, 0)), (c, (0, 0, 0))],
        "head": [(0, (0, 0, 0)), (c * 0.45, (-12, 0, 0)), (c, (0, 0, 0))],
    })
    # hit: a short recoil
    h = 0.4
    clip(arm, "hit", h, {
        "chest": [(0, (0, 0, 0)), (h * 0.25, (-18, 0, 8)), (h, (0, 0, 0))],
        "head": [(0, (0, 0, 0)), (h * 0.25, (-15, 0, -6)), (h, (0, 0, 0))],
        "hips@loc": [(0, (0, 0, 0)), (h * 0.25, (0, 0.06, 0)), (h, (0, 0, 0))],
    })
    # death: knees give, the body falls back and lies still (the last frame holds)
    d = 1.2 * s
    clip(arm, "death", d, {
        "root": [(0, (0, 0, 0)), (d * 0.4, (-15, 0, 0)), (d * 0.8, (-88, 0, 0)), (d, (-90, 0, 0))],
        "root@loc": [(0, (0, 0, 0)), (d * 0.8, (0, 0.25, 0)), (d, (0, 0.25, 0))],
        "thigh.L": [(0, (0, 0, 0)), (d * 0.4, (40, 0, 0)), (d, (15, 0, 10))],
        "thigh.R": [(0, (0, 0, 0)), (d * 0.4, (35, 0, 0)), (d, (5, 0, -10))],
        "shin.L": [(0, (0, 0, 0)), (d * 0.4, (-70, 0, 0)), (d, (-20, 0, 0))],
        "shin.R": [(0, (0, 0, 0)), (d * 0.4, (-60, 0, 0)), (d, (-10, 0, 0))],
        "upper_arm.L": [(0, (0, 0, -5)), (d, (-30, 0, -60))],
        "upper_arm.R": [(0, (0, 0, 5)), (d, (-20, 0, 70))],
        "head": [(0, (0, 0, 0)), (d, (25, 0, 20))],
    })


# ---------------------------------------------------------------------------- export

def export(group, name, save_blend=True):
    """Export everything to godot/assets/models/<group>/<name>.gltf + .bin (and save the .blend source).

    Textures aren't copied into the model: the .gltf points at the shared texture sets in
    godot/assets/textures/materials/, so every model reuses the same files.
    """
    out_dir = os.path.join(GAME_MODELS, group)
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f"{name}.gltf")
    stale = os.path.join(out_dir, f"{name}.glb")
    if os.path.exists(stale):
        os.remove(stale)
    bpy.ops.object.select_all(action="SELECT")
    has_anim = any(o.type == "ARMATURE" and o.animation_data for o in bpy.data.objects)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLTF_SEPARATE",
        export_texture_dir=os.path.relpath(GAME_TEXTURES, out_dir),
        export_keep_originals=True,
        export_apply=True,
        export_yup=True,
        export_animations=has_anim,
        export_animation_mode="NLA_TRACKS" if has_anim else "ACTIONS",
        export_force_sampling=True,
        export_frame_range=False,
        export_def_bones=False,
        export_skins=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
    )
    print("  model  ", os.path.relpath(path, ROOT))
    if save_blend:
        src = os.path.join(SOURCE_MODELS, group, f"{name}.blend")
        os.makedirs(os.path.dirname(src), exist_ok=True)
        if os.path.exists(src) and not os.access(src, os.W_OK):
            # .blend files are lockable (Git LFS): they stay read-only until you lock them.
            rel = os.path.relpath(src, ROOT).replace(os.sep, "/")
            print(f"  locked  {rel} is read-only, so it wasn't saved. Lock it first: git lfs lock \"{rel}\"")
        else:
            bpy.ops.wm.save_as_mainfile(filepath=src, compress=True)
            print("  source ", os.path.relpath(src, ROOT))
    return path


def preview(name, distance=4.0, height=1.0, target_z=0.9, size=(900, 900), pose_action=None, pose_frame=1):
    """Render a quick 3/4 view to $DDK_PREVIEWS/<name>.png (only when that folder is set)."""
    if not PREVIEWS:
        return
    scene = bpy.context.scene
    # Blender 4.2 to 4.5 call it EEVEE_NEXT; 5.x went back to plain EEVEE.
    engines = [e.identifier for e in scene.render.bl_rna.properties["engine"].enum_items]
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.film_transparent = False
    world = bpy.data.worlds.new("preview")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.05, 0.045, 0.06, 1)
    scene.world = world
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 50
    cam = link(bpy.data.objects.new("cam", cam_data))
    cam.location = (distance * 0.55, -distance, height + target_z)
    direction = Vector((0, 0, target_z)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    for loc, energy, color in [((3, -3, 4), 900, (1.0, 0.85, 0.7)), ((-4, 2, 3), 400, (0.55, 0.6, 1.0)), ((0, 4, 2), 500, (1.0, 0.5, 0.25))]:
        ld = bpy.data.lights.new("l", "AREA")
        ld.energy = energy
        ld.size = 3
        ld.color = color
        lo = link(bpy.data.objects.new("l", ld))
        lo.location = loc
        lo.rotation_euler = (Vector((0, 0, 1)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    floor = prim("cyl", "floor", (5, 5, 0.02), (0, 0, -0.01), segments=48, mat=material("floor_preview", (0.12, 0.11, 0.12), 0.9))
    if pose_action:
        for o in bpy.data.objects:
            if o.type == "ARMATURE":
                o.animation_data.action = bpy.data.actions.get(pose_action)
        scene.frame_set(pose_frame)
    os.makedirs(PREVIEWS, exist_ok=True)
    scene.render.filepath = os.path.join(PREVIEWS, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    for o in (cam, floor):
        bpy.data.objects.remove(o)
    print("  preview", scene.render.filepath)
