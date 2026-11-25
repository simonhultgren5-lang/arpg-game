"""Hask, the Bell-Warden: a three-metre warden fused into a cracked bronze bell, the old clapper
glowing in his chest, a crown of spikes on his helm and a sexton's maul. Builds characters/boss.glb."""
import math

import ddk
import humanoid
import materials

ddk.reset()
steel_tex = materials.get("steel")
bronze = ddk.material("bell_bronze", (0.5, 0.36, 0.2), 0.42, 1.0, steel_tex, scale=1.5)
iron = ddk.material("warden_iron", (0.26, 0.25, 0.27), 0.5, 0.9, steel_tex, scale=1.5)
cloth = ddk.material("warden_cloth", (0.18, 0.08, 0.07), 0.9, 0.0, materials.get("cloth"), scale=2.0)
wood = ddk.material("maul_wood", (0.3, 0.2, 0.13), 0.75, 0.0, materials.get("timber"), scale=1.5)
ember = ddk.material("clapper_ember", (1.0, 0.45, 0.12), 0.4, emission=(1.0, 0.4, 0.1), emission_strength=8.0)
slit = ddk.material("helm_glow", (1.0, 0.4, 0.1), 0.5, emission=(1.0, 0.35, 0.08), emission_strength=6.0)

H = 1.7  # the whole figure is scaled up
arm, body = humanoid.build("boss", cloth, build=1.45, height=H)

# The bell: his torso is the bell, mouth down at the hips, with a crack and a raised band.
bell = ddk.lathe("bell", [(0.0, 2.62), (0.26, 2.6), (0.34, 2.45), (0.36, 2.15), (0.44, 1.85), (0.6, 1.62), (0.64, 1.56), (0.6, 1.53)], 40, bronze, closed_top=True)
ddk.displace(bell, 0.012, 0.3, 5)
humanoid.finish(bell, arm, "chest", bevel=0.01)
band = ddk.lathe("bell_band", [(0.455, 1.82), (0.48, 1.83), (0.48, 1.9), (0.445, 1.91)], 40, iron)
humanoid.finish(band, arm, "chest")
crack = ddk.prim("box", "bell_crack", (0.02, 0.02, 0.5), (0.32, -0.33, 2.05), (0, math.radians(15), math.radians(-45)), mat=slit)
humanoid.finish(crack, arm, "chest")
clapper = ddk.prim("sphere", "clapper", (0.32, 0.3, 0.36), (0, -0.36, 1.95), segments=20, mat=ember)
humanoid.finish(clapper, arm, "chest")
cage = ddk.prim("torus", "clapper_cage", (0.44, 0.44, 0.5), (0, -0.37, 1.95), (math.radians(90), 0, 0), 24, mat=iron)
humanoid.finish(cage, arm, "chest")
skirt = ddk.lathe("tasset_skirt", [(0.0, 1.62), (0.5, 1.62), (0.58, 1.3), (0.62, 0.95), (0.0, 0.95)], 32, iron, closed_top=False)
skirt.scale = (1.0, 0.85, 1.0)
humanoid.finish(skirt, arm, "hips", bevel=0.01)
for i in range(8):
    a = i * math.pi / 4
    chain = ddk.prim("torus", f"chain{i}", (0.08, 0.08, 0.2), (math.cos(a) * 0.62, math.sin(a) * 0.53, 1.0), (math.radians(90), 0, a), 12, mat=iron)
    humanoid.finish(chain, arm, "hips")

for s, side in ((1, "L"), (-1, "R")):
    paul = ddk.lathe(f"pauldron.{side}", [(0.0, 0.18), (0.24, 0.13), (0.27, 0.0), (0.24, -0.06)], 24, iron)
    paul.location = (s * 0.42, 0, 2.53)
    paul.rotation_euler = (0, math.radians(-s * 25), 0)
    humanoid.finish(paul, arm, f"upper_arm.{side}", bevel=0.01)
    for k in range(3):
        spike = ddk.prim("cone", f"pspike{k}.{side}", (0.07, 0.07, 0.3), (s * (0.46 + k * 0.05), (k - 1) * 0.09, 2.72), (0, math.radians(-s * 30), 0), 8, mat=bronze)
        humanoid.finish(spike, arm, f"upper_arm.{side}")
    gaunt = ddk.prim("box", f"gauntlet.{side}", (0.17, 0.17, 0.2), humanoid.bone_point(arm, f"hand.{side}", 0.4), bevel=0.04, subsurf=1, mat=iron)
    humanoid.finish(gaunt, arm, f"hand.{side}")
    greave = ddk.lathe(f"greave.{side}", [(0.09, 0.0), (0.12, 0.1), (0.11, 0.55), (0.09, 0.65)], 16, iron)
    greave.location = humanoid.bone_point(arm, f"shin.{side}", 0.1)
    greave.rotation_euler = humanoid.bone_rotation(arm, f"shin.{side}")
    humanoid.finish(greave, arm, f"shin.{side}")
    boot = ddk.prim("box", f"boot.{side}", (0.2, 0.42, 0.14), humanoid.bone_point(arm, f"foot.{side}", 0.5), bevel=0.04, subsurf=1, mat=iron)
    humanoid.finish(boot, arm, f"foot.{side}")

head = humanoid.bone_point(arm, "head", 0.0)
helm = ddk.lathe("helm", [(0.0, -0.1), (0.2, -0.1), (0.21, 0.12), (0.19, 0.3), (0.1, 0.38), (0.0, 0.39)], 28, iron)
helm.location = head
humanoid.finish(helm, arm, "head", bevel=0.008)
visor = ddk.prim("box", "visor", (0.3, 0.05, 0.035), head + ddk.Vector((0, -0.2, 0.12)), mat=slit)
humanoid.finish(visor, arm, "head")
for i in range(7):
    a = math.radians(-90 + (i - 3) * 22)
    spike = ddk.prim("cone", f"crown{i}", (0.06, 0.06, 0.24 - abs(i - 3) * 0.03), head + ddk.Vector((math.cos(a) * 0.17, math.sin(a) * 0.17 + 0.03, 0.42)), segments=8, mat=bronze)
    humanoid.finish(spike, arm, "head")

# The maul: a long haft and a bell-shaped iron head.
hand = humanoid.bone_point(arm, "hand.R", 0.5)
haft = ddk.prim("cyl", "maul_haft", (0.07, 0.07, 1.9), hand + ddk.Vector((0, -0.2, 0.25)), (math.radians(60), 0, 0), 10, mat=wood)
humanoid.finish(haft, arm, "hand.R")
maul_head = ddk.lathe("maul_head", [(0.0, -0.22), (0.2, -0.2), (0.26, 0.0), (0.2, 0.2), (0.0, 0.22)], 16, iron)
maul_head.location = hand + ddk.Vector((0, -1.0, 0.73))
maul_head.rotation_euler = (math.radians(30), 0, 0)
humanoid.finish(maul_head, arm, "hand.R", bevel=0.01)

ddk.humanoid_clips(arm, "mace", heavy=1.4)
ddk.export("characters", "boss")
ddk.preview("boss", distance=7.5, height=1.6, target_z=1.6)
