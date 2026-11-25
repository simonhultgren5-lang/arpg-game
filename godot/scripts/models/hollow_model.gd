extends RefCounted
## The Hollow: a gaunt, hunched husk in a burial shroud, long arms dragging forward.
## Original design. Body surfaces come from `mat_for` so the enemy hit flash and elite tint
## keep working; only the eyes use the glow material.

const K = preload("res://scripts/models/mesh_kit.gd")
const B = preload("res://scripts/world/build.gd")


static func build(parent: Node3D, s: float, col: Color, mat_for: Callable) -> void:
	var flesh: Material = mat_for.call(col)
	var pale: Material = mat_for.call(col.lightened(0.18))
	var shroud: Material = mat_for.call(Color(0.2, 0.17, 0.16))
	var rope: Material = mat_for.call(Color(0.32, 0.24, 0.16))
	B.surface_grain(shroud, Vector3(1.3, 0.55, 1.3))
	var eye := B.stylized_mat(Color(0.6, 0.9, 1.0), Color(0.5, 0.9, 1.0), Color(0.5, 0.9, 1.0), 4.0)
	var root := Node3D.new()
	root.scale = Vector3.ONE * s * 0.84
	parent.add_child(root)

	# Tattered burial shroud from the waist down, with a jagged hem.
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(0, 0.12), Vector2(0.4, 0.12), Vector2(0.36, 0.5), Vector2(0.27, 0.95),
		Vector2(0.22, 1.05), Vector2(0, 1.05)]), 10), shroud)
	for i in 8:
		var a := TAU * i / 8.0
		K.add(root, K.spike(0.07, 0.13, 4), shroud,
			Vector3(cos(a) * 0.37, 0.13, sin(a) * 0.37), Vector3(PI, 0, 0))
	# Frayed folds follow the flare of the robe.
	for i in 9:
		var a := TAU * i / 9.0
		var fold := K.blade(0.58 + 0.08 * cos(3 * a), 0.14, 0.036)
		K.add(root, fold, shroud, Vector3(0.29 * sin(a), 0.83, 0.29 * cos(a)),
			Vector3(PI - 0.20, a, 0))
	# Feet.
	for side in [-1.0, 1.0]:
		K.add(root, K.limb(0.06, 0.04, 0.16, 5), flesh, Vector3(side * 0.14, 0.16, 0.0))
		K.add(root, K.bevel_box(Vector3(0.12, 0.05, 0.26), 0.015), flesh, Vector3(side * 0.14, 0.03, 0.06))
	# Hunched ribcage and shoulders, pitched forward.
	var torso := Node3D.new()
	torso.position = Vector3(0, 1.0, 0.0)
	torso.rotation.x = 0.4
	root.add_child(torso)
	K.add(torso, K.lathe(PackedVector2Array([
		Vector2(0, 0), Vector2(0.26, 0), Vector2(0.33, 0.18), Vector2(0.36, 0.38),
		Vector2(0.24, 0.52), Vector2(0, 0.55)]), 10), shroud, Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.7))
	K.add(torso, K.bevel_box(Vector3(0.3, 0.05, 0.05), 0.012), pale, Vector3(0, 0.22, 0.2))
	K.add(torso, K.bevel_box(Vector3(0.26, 0.05, 0.05), 0.012), pale, Vector3(0, 0.32, 0.19))
	# Overlapping strips carry the shoulder wrap down across the chest.
	for i in 3:
		K.add(torso, K.plate(0.48 - i * 0.04, 0.075, 0.025, 0.06), rope,
			Vector3(0, 0.17 + i * 0.09, 0.17), Vector3(0, 0, -0.32))
	# Rope belt.
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(0.285, 0.9), Vector2(0.3, 0.9), Vector2(0.3, 0.97), Vector2(0.285, 0.97), Vector2(0.285, 0.9)]), 10), rope)
	# Drooping skull-like head on a bent neck.
	var head := Node3D.new()
	head.position = Vector3(0, 1.46, 0.26)
	head.rotation.x = -0.24
	root.add_child(head)
	K.add(head, K.lathe(PackedVector2Array([
		Vector2(0, 0), Vector2(0.1, 0.0), Vector2(0.17, 0.08), Vector2(0.19, 0.24),
		Vector2(0.14, 0.38), Vector2(0, 0.42)]), 8), pale)
	K.add(head, K.bevel_box(Vector3(0.16, 0.08, 0.12), 0.02), flesh, Vector3(0, 0.02, 0.12))  # jaw
	for side in [-1.0, 1.0]:
		K.add(head, K.bevel_box(Vector3(0.105, 0.085, 0.055), 0.02), shroud,
			Vector3(side * 0.075, 0.2, 0.15), Vector3(0, side * 0.28, side * 0.22))
		K.add(head, K.spike(0.04, 0.05, 4), eye, Vector3(side * 0.075, 0.2, 0.175), Vector3(PI * 0.5, 0, 0))
		K.add(head, K.limb(0.03, 0.02, 0.14, 4), flesh, Vector3(side * 0.18, 0.14, 0.0), Vector3(0, 0, side * 0.5))  # ears / tatters
	# Long dragging arms with clawed hands.
	for side in [-1.0, 1.0]:
		var hand := K.arm(root, flesh, Vector3(side * 0.29, 1.43, 0.14), 0.07, 0.055, 0.04,
			0.5, 0.5, Vector3(-0.7, 0, side * 0.12), -0.45)
		K.add(hand, K.bevel_box(Vector3(0.1, 0.1, 0.06), 0.015), flesh)
		for c in 3:
			K.add(hand, K.spike(0.018, 0.14, 4), pale,
				Vector3((c - 1) * 0.035, -0.06, 0.02), Vector3(PI, 0, 0))
