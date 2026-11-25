extends RefCounted
## Hask, the Bell-Warden: a hulking warden fused into a cracked iron bell, his ember clapper
## burning in his chest. Original design. Iron surfaces use `mat_for` (hit flash / elite tint);
## the node named "Bell" is kept for anything that looks it up.

const K = preload("res://scripts/models/mesh_kit.gd")
const B = preload("res://scripts/world/build.gd")


static func build(parent: Node3D, s: float, col: Color, mat_for: Callable) -> void:
	var iron: Material = mat_for.call(col)
	var dark: Material = mat_for.call(col.darkened(0.3))
	var worn: Material = mat_for.call(col.lightened(0.12))
	var wood: Material = mat_for.call(Color(0.18, 0.12, 0.08))
	var ember := B.stylized_mat(B.EMBER, B.EMBER, B.EMBER, 6.0)
	var visor := B.stylized_mat(Color(1, 0.4, 0.1), Color(1, 0.4, 0.1), Color(1, 0.35, 0.1), 5.0)
	var root := Node3D.new()
	root.scale = Vector3.ONE * s
	parent.add_child(root)

	# The bell: flared lip, banded waist, heavy rim. Closed at the top into the warden's shoulders.
	var bell := K.add(root, K.lathe(PackedVector2Array([
		Vector2(0, 0.2), Vector2(1.4, 0.2), Vector2(1.42, 0.34), Vector2(1.3, 0.6), Vector2(1.08, 1.1),
		Vector2(0.92, 1.7), Vector2(0.84, 2.2), Vector2(0.72, 2.55), Vector2(0, 2.62)]), 20), iron)
	bell.name = "Bell"
	for y in [0.62, 1.35, 2.0]:
		var r := lerpf(1.3, 0.8, (y - 0.6) / 1.5)
		K.add(root, K.lathe(PackedVector2Array([
			Vector2(r, y), Vector2(r + 0.06, y), Vector2(r + 0.06, y + 0.1), Vector2(r, y + 0.1), Vector2(r, y)]), 20), dark)
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(1.36, 0.18), Vector2(1.5, 0.18), Vector2(1.5, 0.3), Vector2(1.36, 0.3), Vector2(1.36, 0.18)]), 20), worn)
	# Cracks glowing through the iron.
	for a in [0.4, 2.3, 4.1]:
		K.add(root, K.blade(0.9, 0.05, 0.03), visor, Vector3(sin(a) * 1.03, 0.75, cos(a) * 1.03), Vector3(0.15, a, 0.1))
	# The clapper burning in his chest.
	K.add(root, B.sphere(0.35, ember, Vector3.ZERO, null, 12).mesh, ember, Vector3(0, 1.5, 0.95))
	K.add(root, K.limb(0.07, 0.07, 0.5, 6), dark, Vector3(0, 1.5, 0.95), Vector3(PI * 0.5 + 0.2, 0, 0))
	B.omni(B.EMBER, 2.0, 6.0, Vector3(0, 1.6, 1.4), root)

	# Helm: iron great-helm with a glowing slit and a pair of bell-shaped horns.
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(0, 2.55), Vector2(0.44, 2.55), Vector2(0.52, 2.75), Vector2(0.5, 3.0),
		Vector2(0.32, 3.25), Vector2(0, 3.34)]), 16), worn)
	K.add(root, K.bevel_box(Vector3(0.66, 0.12, 0.1), 0.025), visor, Vector3(0, 2.85, 0.47))
	K.add(root, K.bevel_box(Vector3(0.1, 0.4, 0.1), 0.02), visor, Vector3(0, 2.7, 0.47))
	for side in [-1.0, 1.0]:
		K.add(root, K.spike(0.1, 0.6, 5), dark, Vector3(side * 0.46, 3.05, 0), Vector3(0, 0, -side * 1.0))
	K.add(root, K.limb(0.3, 0.3, 0.12, 12), dark, Vector3(0, 2.62, 0))  # collar

	# Arms and pauldrons. The right hand drags a great bell-hammer.
	for side in [-1.0, 1.0]:
		K.add(root, K.lathe(PackedVector2Array([
			Vector2(0, 0), Vector2(0.52, 0), Vector2(0.56, 0.1), Vector2(0.42, 0.34), Vector2(0, 0.4)]), 12),
			iron, Vector3(side * 0.98, 2.1, 0), Vector3(0, 0, -side * 0.3))
		for i in 2:
			K.add(root, K.spike(0.09, 0.4 - i * 0.12, 5), dark,
				Vector3(side * (1.12 + i * 0.12), 2.52 - i * 0.12, 0), Vector3(0, 0, -side * (0.5 + i * 0.3)))
		var hand := K.arm(root, iron, Vector3(side * 1.05, 1.95, 0.0), 0.2, 0.17, 0.15, 0.7, 0.7,
			Vector3(0.0, 0, side * 0.14), -0.7)
		K.add(hand, K.bevel_box(Vector3(0.3, 0.3, 0.3), 0.06), dark)
		if side > 0.0:
			var haft := K.add(hand, K.limb(0.08, 0.08, 2.9, 6), wood, Vector3(0, 0.5, 0), Vector3(-0.35, 0, 0))
			K.add(hand, K.bevel_box(Vector3(0.7, 0.7, 0.8), 0.12), dark, Vector3(0, 0.5 + 2.9 * 0.93, -0.35 * 2.4 + 0.15),
				Vector3(-0.35, 0, 0))
			haft.name = "Haft"
	# Chains hanging from the rim.
	for i in 5:
		var a := TAU * i / 5.0 + 0.3
		var top := Vector3(sin(a) * 1.4, 0.35, cos(a) * 1.4)
		K.link(root, top, top + Vector3(sin(a) * 0.15, -0.3, cos(a) * 0.15), 0.04, 0.03, dark)
