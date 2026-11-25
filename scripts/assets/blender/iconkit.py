"""Icon rendering: small, transparent PNGs of a model, framed to fit, with a fixed three-light rig.

    iconkit.render("sword", folder, view=(0.35, -1.0, 0.45))

Build the model in an empty scene (ddk.reset()), then call render(). Everything with a mesh is framed
by an orthographic camera looking along -view, so icons of very different objects fill the frame the
same way. Used by icons/item_icons.py and icons/skill_icons.py.
"""
import os

import bpy
from mathutils import Vector

import ddk

ICONS = os.path.join(ddk.ROOT, "godot", "assets", "textures", "icons")
SIZE = 256  # Diablo IV style: rendered at 256 px so icons stay crisp on 4K interfaces


def _scene():
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:  # Blender 5 renamed the engine
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = scene.render.resolution_y = SIZE * 2
    scene.render.resolution_percentage = 50
    scene.render.film_transparent = True
    scene.render.filter_size = 1.0
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    # A filmic curve with punchy contrast gives the dark, rich, high-end look of a Diablo IV inventory icon.
    for transform in ("AgX", "Filmic", "Standard"):
        try:
            scene.view_settings.view_transform = transform
            break
        except TypeError:
            continue
    try:
        scene.view_settings.look = "AgX - Medium High Contrast" if scene.view_settings.view_transform == "AgX" else "Medium High Contrast"
    except TypeError:
        pass
    scene.view_settings.exposure = 0.45
    try:
        scene.eevee.taa_render_samples = 96
        scene.eevee.use_gtao = True
        scene.eevee.gtao_distance = 0.5
        scene.eevee.use_raytracing = True
    except AttributeError:
        pass
    world = bpy.data.worlds.get("icon_world") or bpy.data.worlds.new("icon_world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.05, 0.045, 0.06, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
    scene.world = world
    return scene


def _bounds(objs):
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    deps = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        ev = o.evaluated_get(deps)
        for c in ev.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector((min(lo.x, w.x), min(lo.y, w.y), min(lo.z, w.z)))
            hi = Vector((max(hi.x, w.x), max(hi.y, w.y), max(hi.z, w.z)))
    return lo, hi


def render(name, folder, view=(0.35, -1.0, 0.45), margin=1.12, key=(1.0, 0.82, 0.62), rim=(0.5, 0.6, 1.0)):
    scene = _scene()
    objs = [o for o in bpy.data.objects if o.type == "MESH"]
    lo, hi = _bounds(objs)
    center = (lo + hi) / 2
    d = Vector(view).normalized()
    cam_data = bpy.data.cameras.new("icon_cam")
    cam_data.type = "ORTHO"
    cam = ddk.link(bpy.data.objects.new("icon_cam", cam_data))
    cam.location = center + d * 10.0
    cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    xs, ys = [], []
    for x in (lo.x, hi.x):
        for y in (lo.y, hi.y):
            for z in (lo.z, hi.z):
                p = inv @ Vector((x, y, z))
                xs.append(p.x)
                ys.append(p.y)
    cam_data.ortho_scale = max(max(xs) - min(xs), max(ys) - min(ys)) * margin
    cam.location += cam.matrix_world.to_3x3() @ Vector(((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, 0))
    lights = []
    size = max((hi - lo).length, 0.5)
    right = cam.matrix_world.to_3x3() @ Vector((1, 0, 0))
    up = cam.matrix_world.to_3x3() @ Vector((0, 1, 0))
    for offset, energy, color in [(d * 2 - right * 1.6 + up * 1.8, 260, key), (-d * 1.5 + right * 2.0 + up * 0.8, 340, rim),
                                  (d * 2 + right * 1.5 - up * 0.5, 60, (0.9, 0.7, 0.6))]:
        ld = bpy.data.lights.new("icon_light", "AREA")
        ld.energy = energy * size * size
        ld.size = size * 1.5
        ld.color = color
        lo_ = ddk.link(bpy.data.objects.new("icon_light", ld))
        lo_.location = center + offset * size
        lo_.rotation_euler = (center - lo_.location).to_track_quat("-Z", "Y").to_euler()
        lights.append(lo_)
    path = os.path.join(ICONS, folder, f"{name}.png")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("  texture", os.path.relpath(path, ddk.ROOT))
    for o in [cam] + lights:
        bpy.data.objects.remove(o)
    return path


def diagonal(angle_deg=-45.0):
    """Tilts everything built so far across the frame (weapons read better on the diagonal)."""
    import math
    pivot = ddk.link(bpy.data.objects.new("pivot", None))
    for o in bpy.data.objects:
        if o.type == "MESH" and o.parent is None:
            o.parent = pivot
    pivot.rotation_euler = (0, math.radians(angle_deg), 0)
    bpy.context.view_layer.update()
