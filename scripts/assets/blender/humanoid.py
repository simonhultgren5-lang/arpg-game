"""Two-legged characters: the body and skeleton every humanoid shares, and helpers for placing parts.

    arm, body = humanoid.build("warrior", body_material, build=1.08)
    humanoid.finish(part, arm, "chest")          # UVs + bevel, then bind the part to a bone

The skeleton is ddk.HUMANOID_BONES (19 bones: root, hips, spine, chest, neck, head, and shoulder,
upper_arm, forearm, hand, thigh, shin, foot on each side). Animation clips address these names, and
the game looks for "hand.R" and "head" when it attaches effects.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

import ddk

# Body joints (Blender metres, the character faces -Y): position, radius across, radius front-to-back.
JOINTS = {
    "pelvis": ((0, 0, 0.98), 0.165, 0.12),
    "belly": ((0, 0, 1.15), 0.15, 0.11),
    "chest": ((0, 0, 1.36), 0.185, 0.13),
    "neck": ((0, 0, 1.56), 0.058, 0.058),
    "head": ((0, -0.01, 1.71), 0.1, 0.112),
    "headtop": ((0, -0.005, 1.82), 0.075, 0.085),
    "shoulder.L": ((0.19, 0, 1.47), 0.07, 0.07),
    "elbow.L": ((0.24, 0.02, 1.2), 0.052, 0.052),
    "wrist.L": ((0.27, -0.02, 0.96), 0.038, 0.034),
    "hand.L": ((0.28, -0.04, 0.88), 0.042, 0.028),
    "hip.L": ((0.1, 0, 0.95), 0.088, 0.088),
    "knee.L": ((0.11, 0, 0.53), 0.06, 0.062),
    "ankle.L": ((0.11, 0.02, 0.1), 0.043, 0.045),
    "toe.L": ((0.11, -0.12, 0.035), 0.04, 0.028),
}
EDGES = [
    ("pelvis", "belly"), ("belly", "chest"), ("chest", "neck"), ("neck", "head"), ("head", "headtop"),
    ("chest", "shoulder.L"), ("shoulder.L", "elbow.L"), ("elbow.L", "wrist.L"), ("wrist.L", "hand.L"),
    ("pelvis", "hip.L"), ("hip.L", "knee.L"), ("knee.L", "ankle.L"), ("ankle.L", "toe.L"),
]


def _mirrored(joints, edges):
    j = dict(joints)
    for name, (pos, rx, ry) in joints.items():
        if name.endswith(".L"):
            j[name[:-2] + ".R"] = ((-pos[0], pos[1], pos[2]), rx, ry)
    e = list(edges)
    for a, b in edges:
        if a.endswith(".L") or b.endswith(".L"):
            e.append((a.replace(".L", ".R"), b.replace(".L", ".R")))
    return j, e


def build(name, body_mat, build=1.0, height=1.0, joints=None, bones=None):
    """The armature and skinned body. `build` thickens the body; `height` scales the whole figure.

    `joints` and `bones` override the defaults for differently built characters (a hunched Hollow,
    a child, a huge warden).
    """
    jts = {k: (tuple(c * height for c in p), rx * build * height, ry * build * height) for k, (p, rx, ry) in (joints or JOINTS).items()}
    jts, edges = _mirrored(jts, EDGES)
    arm = ddk.armature(f"{name}_rig", bones or ddk.HUMANOID_BONES, scale=height)
    body = ddk.skin_body(f"{name}_body", jts, edges, body_mat)
    ddk.uv_unwrap(body, 2.0)
    ddk.bind_body(body, arm)
    return arm, body


def bone_point(arm, bone, t=0.0):
    """World position at fraction t along a bone (0 = head, 1 = tail), in rest pose."""
    b = arm.data.bones[bone]
    return arm.matrix_world @ (b.head_local.lerp(b.tail_local, t))


def bone_rotation(arm, bone):
    """Euler rotation that turns +Z to point along the bone (for lathed limb pieces)."""
    b = arm.data.bones[bone]
    d = (b.tail_local - b.head_local).normalized()
    return Vector((0, 0, 1)).rotation_difference(d).to_euler()


def finish(obj, arm, bone, bevel=0.0, uv_scale=2.0):
    """UV-unwrap (and optionally bevel) a part, then bind it rigidly to a bone."""
    if bevel:
        m = obj.modifiers.new("bevel", "BEVEL")
        m.width = bevel
        m.segments = 3
        m.limit_method = "ANGLE"
    ddk.select_only(obj)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    ddk.apply_modifiers(obj)
    ddk.uv_unwrap(obj, uv_scale)
    ddk.attach(obj, arm, bone)
    return obj


def cloth_panel(name, width, length, top, lean=0.0, mat=None, waves=3, ragged=True, thickness=0.012):
    """A hanging cloth panel (tabard, cloak, apron): gentle folds, a ragged hem, some thickness."""
    nx, nz = 12, 16
    bm = bmesh.new()
    verts = []
    for iz in range(nz + 1):
        row = []
        for ix in range(nx + 1):
            u = ix / nx
            v = iz / nz
            x = (u - 0.5) * width * (1 + 0.25 * v)
            fold = math.sin(u * math.pi * waves) * 0.025 * (0.4 + v)
            hem = 0.0
            if ragged and iz == nz:
                hem = (math.sin(ix * 2.7) * 0.5 + 0.5) * 0.06
            row.append(bm.verts.new((x, fold, -v * length + hem)))
        verts.append(row)
    for iz in range(nz):
        for ix in range(nx):
            bm.faces.new((verts[iz][ix], verts[iz][ix + 1], verts[iz + 1][ix + 1], verts[iz + 1][ix]))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = ddk.link(bpy.data.objects.new(name, mesh))
    obj.location = top
    obj.rotation_euler = (lean, 0, 0)
    sol = obj.modifiers.new("solid", "SOLIDIFY")
    sol.thickness = thickness
    ddk.shade_smooth(obj, 60)
    if mat:
        ddk.assign(obj, mat)
    return obj


def heater_shield(name, width, height, face_mat, rim_mat, boss_mat):
    """A heater shield (flat top, curved sides to a point), slightly curved, with a rim and a boss."""
    pts = []
    steps = 14
    for i in range(steps + 1):
        a = i / steps
        y = height * 0.5 - a * height
        x = width * 0.5 * math.cos(a * math.pi * 0.5) ** 0.7
        pts.append((x, y))
    outline = [(-x, y) for x, y in pts] + [(x, y) for x, y in reversed(pts[:-1])]
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, 0)) for x, y in outline]
    face = bm.faces.new(vs)
    bmesh.ops.triangulate(bm, faces=[face])
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = ddk.link(bpy.data.objects.new(name, mesh))
    sol = obj.modifiers.new("solid", "SOLIDIFY")
    sol.thickness = 0.03
    bend = obj.modifiers.new("bend", "SIMPLE_DEFORM")
    bend.deform_method = "BEND"
    bend.deform_axis = "Y"
    bend.angle = math.radians(8)
    ddk.apply_modifiers(obj)
    ddk.assign(obj, face_mat)
    obj.data.materials.append(rim_mat)
    # The rim: the outer band of faces gets the steel material.
    rim = ddk.link(bpy.data.objects.new(name + "_rim", bpy.data.curves.new(name + "_rimc", "CURVE")))
    curve = rim.data
    curve.dimensions = "3D"
    curve.bevel_depth = 0.018
    spline = curve.splines.new("POLY")
    spline.points.add(len(outline))
    for i, (x, y) in enumerate(outline + [outline[0]]):
        z = 0.016
        spline.points[i].co = (x, y, z, 1)
    ddk.select_only(rim)
    bpy.ops.object.convert(target="MESH")
    ddk.assign(rim, rim_mat)
    boss = ddk.prim("sphere", name + "_boss", (0.12, 0.12, 0.06), (0, height * 0.12, 0.03), segments=16, mat=boss_mat)
    ddk.select_only(obj, rim, boss)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()
    return obj


def open_face(hood, width=0.11, bottom=-0.07, top=0.17, depth=-0.02):
    """Cut the face opening out of a hood made with ddk.lathe (coordinates relative to the hood's
    origin, which sits at the head bone): faces in front of `depth` within the window are removed,
    and the rim gets a little thickness so the hood doesn't look paper-thin."""
    me = hood.data
    bm = bmesh.new()
    bm.from_mesh(me)
    doomed = [f for f in bm.faces if (c := f.calc_center_median()).y < depth and abs(c.x) < width and bottom < c.z < top]
    bmesh.ops.delete(bm, geom=doomed, context="FACES")
    bm.to_mesh(me)
    bm.free()
    sol = hood.modifiers.new("solid", "SOLIDIFY")
    sol.thickness = 0.012
    sol.offset = 1.0
    ddk.apply_modifiers(hood)
    return hood


def leaned_bones(offsets):
    """The standard skeleton with some bones moved (both ends), for hunched or odd builds.
    `offsets` maps a bone name (.L bones are mirrored) to an (x, y, z) shift."""
    out = []
    for name, head, tail, parent in ddk.HUMANOID_BONES:
        o = offsets.get(name, (0, 0, 0))
        # A bone's head follows its parent's tail, so children inherit the parent's shift.
        po = offsets.get(parent, (0, 0, 0)) if parent else (0, 0, 0)
        ho = o if name in offsets else po
        out.append((name, tuple(h + d for h, d in zip(head, ho)), tuple(t + d for t, d in zip(tail, o)), parent))
    return out
