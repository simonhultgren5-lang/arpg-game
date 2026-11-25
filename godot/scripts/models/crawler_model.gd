extends RefCounted
## The Grave Crawler: a low, wet-grey ghoul that scuttles on six jointed limbs. Original design.
## Body surfaces use `mat_for` (hit flash / elite tint); eyes use the glow material.

const K = preload("res://scripts/models/mesh_kit.gd")
const B = preload("res://scripts/world/build.gd")


static func build(parent: Node3D, s: float, col: Color, mat_for: Callable) -> Array[Node3D]:
	var legs: Array[Node3D] = []
	var skin: Material = mat_for.call(col)
	var pale: Material = mat_for.call(col.lightened(0.18))
	var dark: Material = mat_for.call(col.darkened(0.3))
	var eye := B.stylized_mat(Color(1, 0.3, 0.2), Color(1, 0.3, 0.2), Color(1, 0.2, 0.1), 4.0)
	var root := Node3D.new()
	root.scale = Vector3.ONE * s
	parent.add_child(root)

	# Long, low body with a ridge of spines and exposed ribs.
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(0, 0), Vector2(0.28, 0.02), Vector2(0.42, 0.18), Vector2(0.4, 0.34),
		Vector2(0.24, 0.46), Vector2(0, 0.5)]), 12), skin, Vector3(0, 0.12, -0.05), Vector3.ZERO, Vector3(1.05, 1, 1.7))
	for i in 5:
		K.add(root, K.spike(0.045, 0.2 - i * 0.015, 4), dark, Vector3(0, 0.6 - i * 0.015, -0.4 + i * 0.22), Vector3(-0.15, 0, 0))
	for side in [-1.0, 1.0]:
		for i in 3:
			K.add(root, K.limb(0.02, 0.014, 0.3, 4), pale,
				Vector3(side * 0.28, 0.5, -0.3 + i * 0.25), Vector3(0, 0, side * 1.0))  # ribs
	K.add(root, K.spike(0.18, 0.55, 5), dark, Vector3(0, 0.3, -0.9), Vector3(-1.45, 0, 0))  # tail stump

	# Head: heavy skull with a slack jaw and four glowing eyes, held low.
	var head := Node3D.new()
	head.position = Vector3(0, 0.38, 0.72)
	head.rotation.x = 0.25
	root.add_child(head)
	K.add(head, K.lathe(PackedVector2Array([
		Vector2(0, -0.1), Vector2(0.15, -0.08), Vector2(0.22, 0.04), Vector2(0.2, 0.18), Vector2(0.1, 0.26), Vector2(0, 0.28)]), 10),
		pale, Vector3.ZERO, Vector3(PI * 0.5, 0, 0), Vector3(1, 1.2, 0.9))
	K.add(head, K.bevel_box(Vector3(0.22, 0.06, 0.2), 0.02), dark, Vector3(0, -0.12, 0.12), Vector3(0.35, 0, 0))  # jaw
	for side in [-1.0, 1.0]:
		K.add(head, K.spike(0.03, 0.1, 4), pale, Vector3(side * 0.09, -0.1, 0.24), Vector3(PI, 0, 0))  # fangs
		for r in 2:
			K.add(head, K.spike(0.028, 0.05, 4), eye,
				Vector3(side * (0.07 + r * 0.06), 0.1 - r * 0.03, 0.2), Vector3(PI * 0.5, 0, 0))

	# Six jointed legs splayed to the sides and bent at the knee.
	for side in [-1.0, 1.0]:
		for i in 3:
			var z := -0.42 + i * 0.4
			var hip := Vector3(side * 0.3, 0.32, z)
			var knee := Vector3(side * 0.72, 0.5 + (0.06 if i == 1 else 0.0), z + (i - 1) * 0.18)
			var foot := Vector3(side * 0.95, 0.0, z + (i - 1) * 0.42)
			var pivot := Node3D.new()
			pivot.position = hip
			root.add_child(pivot)
			legs.append(pivot)
			K.link(pivot, Vector3.ZERO, knee - hip, 0.05, 0.035, skin)
			K.link(pivot, knee - hip, foot - hip, 0.035, 0.015, dark)
			K.add(root, K.spike(0.03, 0.08, 4), pale, foot - hip, Vector3.ZERO)
	return legs
