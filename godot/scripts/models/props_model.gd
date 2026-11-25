extends RefCounted

const K = preload("res://scripts/models/mesh_kit.gd")
const B = preload("res://scripts/world/build.gd")
const AssetModels = preload("res://scripts/models/asset_models.gd")


static func _root(parent: Node, pos: Vector3) -> Node3D:
	var root := Node3D.new()
	root.position = pos
	parent.add_child(root)
	return root


const SpellFx = preload("res://scripts/world/spell_fx.gd")


## The Blender model of a prop (assets/models/props/<id>.gltf) placed at `pos`, or null if missing.
static func asset(parent: Node, id: String, pos: Vector3) -> Node3D:
	var m := AssetModels.prop(id)
	if m == null:
		return null
	m.position = pos
	parent.add_child(m)
	return m


static func sconce(parent: Node, pos: Vector3) -> Node3D:
	var root := _root(parent, pos)
	var iron := B.mat(Color("#433e49"), 0.65)
	var bronze := B.mat(Color("#95673a"), 0.55)
	K.add(root, K.plate(0.28, 0.52, 0.06, 0.025), iron, Vector3(0, 0.26, 0))
	K.link(root, Vector3(0, 0.07, 0.03), Vector3(0, 0.36, 0.24), 0.065, 0.045, bronze)
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(0, 0), Vector2(0.08, 0), Vector2(0.19, 0.11),
		Vector2(0.19, 0.14), Vector2(0, 0.14)]), 8), bronze, Vector3(0, 0.33, 0.24))
	for i in 4:
		var a := i * PI / 2
		K.add(root, K.spike(0.04, 0.19, 4), iron, Vector3(0.16 * cos(a), 0.45, 0.24 + 0.16 * sin(a)))
	SpellFx.ambient_fire(root, Vector3(0, 0.44, 0.24), 0.27, true, false)
	return root


static func barrel(parent: Node, pos: Vector3) -> Node3D:
	var modelled := asset(parent, "barrel", pos)
	if modelled:
		return modelled
	var root := _root(parent, pos)
	var wood := B.mat(Color("#68452e"))
	var iron := B.mat(Color("#39393c"), 0.52, Color.BLACK, 1, 0.3)
	B.surface_grain(wood, Vector3(1.8, 0.18, 1.8))
	var profile := PackedVector2Array([Vector2(0, 0), Vector2(0.32, 0), Vector2(0.38, 0.22),
		Vector2(0.405, 0.5), Vector2(0.38, 0.78), Vector2(0.32, 1), Vector2(0, 1)])
	K.add(root, K.lathe(profile, 12), wood)
	# Stave joints follow the bulge all the way from the foot to the head.
	var seam := B.mat(Color("#382a23"))
	for i in 12:
		var a := TAU * i / 12
		var radial := Vector3(cos(a), 0, sin(a))
		for j in range(1, profile.size() - 2):
			var p := profile[j]
			var q := profile[j + 1]
			K.link(root, radial * p.x + Vector3.UP * p.y, radial * q.x + Vector3.UP * q.y, 0.006, 0.006, seam)
	for y in [0.09, 0.25, 0.75, 0.91]:
		var r := 0.356 if y < 0.2 or y > 0.8 else 0.39
		K.add(root, K.limb(r, r, 0.045, 12), iron, Vector3.UP * (y + 0.0225))
	for x in [-0.15, 0.0, 0.15]:
		K.add(root, K.bevel_box(Vector3(0.01, 0.008, 0.63 if is_zero_approx(x) else 0.53), 0.002),
			seam, Vector3(x, 1, 0))
	K.add(root, K.limb(0.044, 0.044, 0.018), B.mat(Color("#b28452")), Vector3(0.1, 1.016, 0.16))
	return root


static func sarcophagus(parent: Node, pos: Vector3) -> Node3D:
	var modelled := asset(parent, "sarcophagus", pos)
	if modelled:
		return modelled
	var root := _root(parent, pos)
	var basalt := B.mat(Color("#45404a"))
	var marble := B.mat(Color("#807880"))
	B.surface_grain(marble, Vector3(0.6, 0.35, 0.45))
	B.surface_grain(basalt, Vector3.ONE * 0.75)
	var brass := B.mat(Color("#b08b56"), 0.48)
	K.add(root, K.bevel_box(Vector3(1.04, 0.14, 1.84), 0.06), basalt, Vector3.UP * 0.07)
	K.add(root, K.bevel_box(Vector3(0.96, 0.53, 1.72), 0.09), basalt, Vector3.UP * 0.4)
	K.add(root, K.bevel_box(Vector3(1.04, 0.07, 1.84), 0.03), brass, Vector3.UP * 0.68)
	K.add(root, K.bevel_box(Vector3(1.10, 0.18, 1.90), 0.08), marble, Vector3.UP * 0.8)
	# A recumbent hooded effigy clasping a long bronze burial blade.
	K.add(root, K.bevel_box(Vector3(0.36, 0.12, 1.05), 0.055), basalt, Vector3(0, 0.93, 0.1))
	K.add(root, K.lathe(PackedVector2Array([Vector2(0.16, 0), Vector2(0.20, 0.07),
		Vector2(0.14, 0.17), Vector2(0, 0.21)]), 8), basalt, Vector3(0, 0.89, -0.55))
	K.add(root, K.blade(0.86, 0.11, 0.04), brass, Vector3(0, 1, -0.25), Vector3(PI / 2, 0, 0))
	for side in [-1.0, 1.0]:
		K.link(root, Vector3(side * 0.19, 0.96, -0.32), Vector3(side * 0.035, 1.028, -0.12), 0.067, 0.045, marble)
		for z in [-0.55, 0.55]:
			K.add(root, K.plate(0.19, 0.29, 0.035, 0.025), brass, Vector3(side * 0.48, 0.42, z), Vector3(0, side * PI / 2, 0))
	return root


## Hollow casting with a flared lip and suspension crown, visible on its side in the bell pit.
static func founders_bell(parent: Node, pos: Vector3) -> Node3D:
	var root := _root(parent, pos)
	var bronze := B.mat(Color("#81704d"), 0.49, Color.BLACK, 1.0, 0.66)
	var patina := B.mat(Color("#3f655d"), 0.73, Color.BLACK, 1.0, 0.38)
	var profile := PackedVector2Array([
		Vector2(1.42, 0.12), Vector2(1.5, 0.06), Vector2(1.57, 0.15),
		Vector2(1.53, 0.24), Vector2(1.32, 0.4), Vector2(1.12, 0.75),
		Vector2(0.86, 1.6), Vector2(0.78, 1.78), Vector2(0.48, 1.91),
		Vector2(0.08, 1.94), Vector2(0.08, 1.78), Vector2(0.66, 1.64),
		Vector2(0.99, 0.72), Vector2(1.42, 0.12)])
	K.add(root, K.lathe(profile, 32), bronze)
	K.add(root, K.lathe(PackedVector2Array([Vector2(1.19, 0.60), Vector2(1.23, 0.62),
		Vector2(1.2, 0.68), Vector2(1.15, 0.7)]), 32), patina)
	B.cylinder(0.09, 0.1, 1.5, bronze, Vector3(0, 1.0, 0), root)
	B.sphere(0.24, bronze, Vector3(0, 0.24, 0), root)
	B.box(Vector3(0.34, 0.38, 0.28), patina, Vector3(0, 1.99, 0), root)
	return root


## A standing iron brazier: a tripod bowl of embers with a flickering flame and warm light. Code-built
## stand-in until a Blender model (props/brazier) is made; AssetModels is tried first.
static func brazier(parent: Node, pos: Vector3, light_range := 9.0, energy := 2.2) -> Node3D:
	var modelled := asset(parent, "brazier", pos)
	if modelled == null:
		var root := _root(parent, pos)
		modelled = root
		var iron := B.mat(Color("#2d2b31"), 0.6, Color.BLACK, 1.0, 0.7)
		for i in 3:
			var a := i * TAU / 3.0
			K.link(root, Vector3(0.38 * cos(a), 0.0, 0.38 * sin(a)), Vector3(0.14 * cos(a), 0.92, 0.14 * sin(a)), 0.05, 0.035, iron)
		K.add(root, K.lathe(PackedVector2Array([Vector2(0, 0.86), Vector2(0.22, 0.88), Vector2(0.44, 1.08),
			Vector2(0.46, 1.12), Vector2(0.4, 1.12), Vector2(0.2, 0.98), Vector2(0, 0.96)]), 12), iron)
		K.add(root, K.lathe(PackedVector2Array([Vector2(0, 0), Vector2(0.38, 0), Vector2(0.42, 0.04), Vector2(0, 0.06)]), 12),
			B.mat(Color("#ff7a2a"), 1.0, Color("#ff5a14"), 2.2), Vector3(0, 1.02, 0))
	if modelled != null and modelled.get_child_count() > 0 and not modelled.has_meta("flamed"):
		modelled.set_meta("flamed", true)
		SpellFx.ambient_fire(modelled, Vector3(0, 1.06, 0), 0.5, true, true)
	var glow := Node3D.new()
	glow.position = Vector3(0, 1.5, 0)
	var light := B.omni(Color(1.0, 0.6, 0.28), energy, light_range, Vector3.ZERO, glow)
	glow.set_meta("light", light)
	glow.set_script(preload("res://scripts/world/flicker.gd"))
	modelled.add_child(glow)
	return modelled


## A heap of bones and a skull, for the crypt floors and the graveyard edge.
static func bone_pile(parent: Node, pos: Vector3, rng: RandomNumberGenerator) -> Node3D:
	var modelled := asset(parent, "bone_pile", pos)
	if modelled:
		modelled.rotation.y = rng.randf() * TAU
		return modelled
	var root := _root(parent, pos)
	root.rotation.y = rng.randf() * TAU
	var bone := B.mat(Color("#b9ad94"), 0.85)
	for i in 5 + rng.randi() % 4:
		var a := rng.randf() * TAU
		var r := rng.randf_range(0.05, 0.45)
		K.link(root, Vector3(r * cos(a), 0.05, r * sin(a)),
			Vector3(r * cos(a) + rng.randf_range(-0.3, 0.3), 0.07 + rng.randf() * 0.1, r * sin(a) + rng.randf_range(-0.3, 0.3)), 0.035, 0.028, bone)
	B.sphere(0.13, bone, Vector3(rng.randf_range(-0.15, 0.15), 0.13, rng.randf_range(-0.15, 0.15)), root)
	return root


## A broken handcart: bed, one wheel and shafts on the ground. Town clutter that says "people fled".
static func cart(parent: Node, pos: Vector3, yaw: float) -> Node3D:
	var modelled := asset(parent, "handcart", pos)
	if modelled:
		modelled.rotation.y = yaw
		return modelled
	var root := _root(parent, pos)
	root.rotation.y = yaw
	var wood := B.mat(Color("#4a3426"))
	B.surface_grain(wood, Vector3(1.8, 0.18, 1.8))
	B.box(Vector3(1.5, 0.12, 0.9), wood, Vector3(0, 0.55, 0), root)
	for s in [-1.0, 1.0]:
		B.box(Vector3(1.5, 0.35, 0.08), wood, Vector3(0, 0.75, s * 0.45), root)
	B.box(Vector3(0.08, 0.35, 0.9), wood, Vector3(0.71, 0.75, 0), root)
	B.cylinder(0.5, 0.5, 0.08, wood, Vector3(0, 0.5, 0.52), root, 14).rotation = Vector3(PI / 2, 0, 0)
	for s in [-1.0, 1.0]:
		var shaft := B.box(Vector3(1.6, 0.07, 0.07), wood, Vector3(-1.1, 0.2, s * 0.3), root)
		shaft.rotation = Vector3(0, 0, 0.18)
	return root


## A run of broken fence posts and rails from `a` to `b` (world positions).
static func fence(parent: Node, a: Vector3, b: Vector3, rng: RandomNumberGenerator) -> Node3D:
	var root := _root(parent, a)
	var wood := B.mat(Color("#3b2d24"))
	B.surface_grain(wood, Vector3(1.8, 0.18, 1.8))
	var d := b - a
	var n := maxi(2, int(d.length() / 1.6))
	for i in n + 1:
		var h := rng.randf_range(0.9, 1.4)
		B.box(Vector3(0.12, h, 0.12), wood, d * (float(i) / n) + Vector3(0, h * 0.5, 0), root).rotation.z = rng.randf_range(-0.08, 0.08)
	for y in [0.45, 0.9]:
		if rng.randf() < 0.85:
			var rail := B.box(Vector3(d.length(), 0.07, 0.05), wood, d * 0.5 + Vector3(0, y, 0), root)
			rail.rotation.y = -atan2(d.z, d.x)
	return root
