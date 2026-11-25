extends RefCounted

const K = preload("res://scripts/models/mesh_kit.gd")
const B = preload("res://scripts/world/build.gd")


static func _root(parent: Node, pos: Vector3) -> Node3D:
	var root := Node3D.new()
	root.position = pos
	parent.add_child(root)
	return root


static var _flame_mat: ShaderMaterial


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
	if _flame_mat == null:
		_flame_mat = ShaderMaterial.new()
		_flame_mat.shader = preload("res://shaders/torch_flame.gdshader")
	K.add(root, K.lathe(PackedVector2Array([Vector2(0, 0), Vector2(0.09, 0),
		Vector2(0.13, 0.12), Vector2(0.08, 0.26), Vector2(0, 0.42)]), 7),
		_flame_mat, Vector3(0, 0.46, 0.24), Vector3(0, 0, -0.18))
	K.add(root, K.spike(0.065, 0.24, 5), B.mat(B.GOLD, 1, Color("#ffbf61"), 2),
		Vector3(0, 0.46, 0.34), Vector3(0, 0, 0.16))
	return root


static func barrel(parent: Node, pos: Vector3) -> Node3D:
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
