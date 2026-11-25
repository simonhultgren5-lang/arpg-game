"""The Warrior: a grave-knight in blackened plate over a padded gambeson, great helm, heater shield
and longsword. Materials named tint_* take the player's armour colour in game.

Builds source-assets/Models/characters/warrior.blend and godot/assets/models/characters/warrior.glb.
"""
import math

import ddk
import materials
import humanoid

ddk.reset()

steel = ddk.material("steel_dark", (0.42, 0.42, 0.46), 0.45, 0.9, materials.get("steel"), scale=2.0)
steel_bright = ddk.material("steel_bright", (0.75, 0.75, 0.8), 0.3, 1.0, materials.get("steel"), scale=2.0)
brass = ddk.material("brass", (0.78, 0.58, 0.3), 0.35, 1.0, materials.get("steel"), scale=2.0)
leather = ddk.material("leather_dark", (0.2, 0.13, 0.09), 0.6, 0.0, materials.get("leather"), scale=3.0)
gambeson = ddk.material("gambeson", (0.2, 0.18, 0.16), 0.9, 0.0, materials.get("cloth"), scale=3.0)
tint = ddk.material("tint_tabard", (0.55, 0.13, 0.12), 0.85, 0.0, materials.get("cloth"), scale=3.0)
slit = ddk.material("visor_dark", (0.01, 0.01, 0.01), 0.9)

arm, body = humanoid.build("warrior", gambeson, build=1.08)

# ---- armour on the torso
cuirass = ddk.lathe("cuirass", [(0.0, 1.13), (0.17, 1.13), (0.2, 1.22), (0.235, 1.38), (0.25, 1.48), (0.2, 1.56), (0.08, 1.58), (0.0, 1.585)], 28, steel)
cuirass.scale = (1.0, 0.78, 1.0)
humanoid.finish(cuirass, arm, "chest", bevel=0.01)
ridge = ddk.prim("box", "ridge", (0.03, 0.02, 0.36), (0, -0.2, 1.36), (math.radians(-8), 0, 0), bevel=0.006, mat=steel_bright)
humanoid.finish(ridge, arm, "chest")
gorget = ddk.lathe("gorget", [(0.13, 1.52), (0.15, 1.55), (0.11, 1.63), (0.09, 1.64)], 24, steel)
humanoid.finish(gorget, arm, "neck")
belt = ddk.lathe("belt", [(0.19, 1.04), (0.205, 1.05), (0.205, 1.12), (0.19, 1.13)], 28, leather)
belt.scale = (1.0, 0.82, 1.0)
humanoid.finish(belt, arm, "hips")
buckle = ddk.prim("box", "buckle", (0.08, 0.02, 0.07), (0, -0.175, 1.085), bevel=0.008, mat=brass)
humanoid.finish(buckle, arm, "hips")
# Tabard: front and back panels from the belt to the knees, cut ragged at the hem.
for side, y in (("front", -1), ("back", 1)):
    tab = humanoid.cloth_panel(f"tabard_{side}", width=0.3, length=0.5, top=(0, 0.17 * y, 1.05), lean=math.radians(6) * -y, mat=tint)
    humanoid.finish(tab, arm, "hips")
# Faulds: overlapping plates over the hips.
for i in range(3):
    fauld = ddk.lathe(f"fauld{i}", [(0.21 + i * 0.012, 1.02 - i * 0.07), (0.205 + i * 0.012, 0.95 - i * 0.07)], 28, steel)
    fauld.scale = (1.0, 0.84, 1.0)
    humanoid.finish(fauld, arm, "hips")

# ---- shoulders, arms, legs
for s in (1, -1):
    side = "L" if s > 0 else "R"
    for i in range(3):
        p = ddk.lathe(f"pauldron{i}.{side}", [(0.0, 0.09), (0.11 - i * 0.012, 0.07), (0.13 - i * 0.012, 0.0), (0.12 - i * 0.012, -0.03)], 20, steel)
        p.location = (s * (0.2 + i * 0.015), 0, 1.47 - i * 0.055)
        p.rotation_euler = (0, math.radians(-s * (25 + i * 8)), 0)
        humanoid.finish(p, arm, f"upper_arm.{side}", bevel=0.004)
    vam = ddk.lathe(f"vambrace.{side}", [(0.048, 0.0), (0.056, 0.05), (0.05, 0.2), (0.044, 0.22)], 16, steel)
    vam.location = humanoid.bone_point(arm, f"forearm.{side}", 0.08)
    vam.rotation_euler = humanoid.bone_rotation(arm, f"forearm.{side}")
    humanoid.finish(vam, arm, f"forearm.{side}")
    gaunt = ddk.prim("box", f"gauntlet.{side}", (0.085, 0.09, 0.11), humanoid.bone_point(arm, f"hand.{side}", 0.4), bevel=0.02, subsurf=1, mat=steel)
    humanoid.finish(gaunt, arm, f"hand.{side}")
    knee = ddk.lathe(f"poleyn.{side}", [(0.0, 0.06), (0.07, 0.04), (0.08, 0.0), (0.07, -0.04)], 16, steel_bright)
    knee.location = humanoid.bone_point(arm, f"shin.{side}", 0.0) + ddk.Vector((0, -0.04, 0))
    knee.rotation_euler = (math.radians(90), 0, 0)
    humanoid.finish(knee, arm, f"shin.{side}")
    cuisse = ddk.lathe(f"cuisse.{side}", [(0.07, 0.0), (0.085, 0.08), (0.08, 0.3), (0.066, 0.36)], 16, steel)
    cuisse.location = humanoid.bone_point(arm, f"thigh.{side}", 0.1)
    cuisse.rotation_euler = humanoid.bone_rotation(arm, f"thigh.{side}")
    humanoid.finish(cuisse, arm, f"thigh.{side}")
    greave = ddk.lathe(f"greave.{side}", [(0.05, 0.0), (0.062, 0.06), (0.058, 0.3), (0.048, 0.36)], 16, steel)
    greave.location = humanoid.bone_point(arm, f"shin.{side}", 0.15)
    greave.rotation_euler = humanoid.bone_rotation(arm, f"shin.{side}")
    humanoid.finish(greave, arm, f"shin.{side}")
    sabaton = ddk.prim("box", f"sabaton.{side}", (0.11, 0.25, 0.08), humanoid.bone_point(arm, f"foot.{side}", 0.5) + ddk.Vector((0, 0, 0.0)), bevel=0.025, subsurf=1, mat=steel)
    humanoid.finish(sabaton, arm, f"foot.{side}")

# ---- the great helm: a flat-topped barrel with a breathing slit and a brass cross
head = humanoid.bone_point(arm, "head", 0.0)
helm = ddk.lathe("helm", [(0.0, -0.06), (0.128, -0.06), (0.135, 0.06), (0.132, 0.16), (0.12, 0.215), (0.07, 0.235), (0.0, 0.24)], 28, steel)
helm.location = head
humanoid.finish(helm, arm, "head", bevel=0.006)
visor = ddk.prim("box", "visor_slit", (0.18, 0.04, 0.022), head + ddk.Vector((0, -0.12, 0.09)), mat=slit)
humanoid.finish(visor, arm, "head")
for size, z in (((0.025, 0.02, 0.2), 0.08), ((0.15, 0.02, 0.025), 0.15)):
    cross = ddk.prim("box", "helm_cross", size, head + ddk.Vector((0, -0.132, z)), bevel=0.005, mat=brass)
    humanoid.finish(cross, arm, "head")
crest = ddk.prim("cone", "helm_crest", (0.05, 0.05, 0.08), head + ddk.Vector((0, 0, 0.27)), mat=brass)
humanoid.finish(crest, arm, "head")

# ---- cloak, hanging from the shoulders
cloak = humanoid.cloth_panel("cloak", width=0.46, length=1.05, top=(0, 0.17, 1.52), lean=math.radians(-10), mat=tint, waves=5)
humanoid.finish(cloak, arm, "chest")

# ---- longsword in the right hand, heater shield on the left forearm
hand_r = humanoid.bone_point(arm, "hand.R", 0.5)
sword = ddk.Vector(hand_r)
blade = ddk.blade("sword_blade", 0.92, 0.055, 0.012, steel_bright)
# Held point-up and a little forward, the way a knight carries a blade at rest.
blade.location = sword + ddk.Vector((0, -0.02, 0.06))
blade.rotation_euler = (math.radians(-28), 0, 0)
humanoid.finish(blade, arm, "hand.R")
guard = ddk.prim("box", "sword_guard", (0.22, 0.035, 0.03), sword + ddk.Vector((0, -0.01, 0.05)), (math.radians(-28), 0, 0), bevel=0.008, mat=brass)
humanoid.finish(guard, arm, "hand.R")
grip = ddk.prim("cyl", "sword_grip", (0.035, 0.035, 0.16), sword + ddk.Vector((0, 0.03, -0.02)), (math.radians(-28), 0, 0), 10, mat=leather)
humanoid.finish(grip, arm, "hand.R")
pommel = ddk.prim("sphere", "sword_pommel", (0.05, 0.05, 0.05), sword + ddk.Vector((0, 0.07, -0.1)), segments=12, mat=brass)
humanoid.finish(pommel, arm, "hand.R")

fore_l = humanoid.bone_point(arm, "forearm.L", 0.55)
shield = humanoid.heater_shield("shield", 0.48, 0.62, tint, steel, brass)
shield.location = fore_l + ddk.Vector((0.1, -0.02, 0.02))
shield.rotation_euler = (0, math.radians(90), math.radians(8))
humanoid.finish(shield, arm, "forearm.L")

ddk.humanoid_clips(arm, "sword")
ddk.export("characters", "warrior")
ddk.preview("warrior")
ddk.preview("warrior_attack", pose_action="attack", pose_frame=6)
