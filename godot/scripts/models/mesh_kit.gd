extends RefCounted
## Mesh generators for the hand-built models: lathes, tapered limbs, beveled boxes, plates, blades
## and spikes. Every function returns a single-surface ArrayMesh with outward normals.
##
## Winding: Godot treats clockwise triangles as front faces, so every triangle goes through
## _tri(), which flips it when it would face away from the supplied outward direction.


## Revolve a profile around the Y axis. Each point is (radius, height), listed bottom to top
## along the outside; end on radius 0 to close a cap. Repeat a point to get a hard edge there.
static func lathe(profile: PackedVector2Array, segments := 12) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := profile.size()
	# Outward normal (radius, height) of each profile segment; zero for repeated points.
	var seg_n: Array[Vector2] = []
	for i in n - 1:
		var d := profile[i + 1] - profile[i]
		seg_n.append(Vector2(d.y, -d.x).normalized() if d.length() > 0.0001 else Vector2.ZERO)
	# Smooth the normal at each profile point between its two neighboring segments.
	var pt_n: Array[Vector2] = []
	for i in n:
		var a := Vector2.ZERO
		if i > 0:
			a += seg_n[i - 1]
		if i < n - 1:
			a += seg_n[i]
		pt_n.append(a.normalized() if a.length() > 0.0001 else Vector2(1, 0))
	for i in n - 1:
		if seg_n[i] == Vector2.ZERO:
			continue
		for j in segments:
			var t0 := TAU * j / segments
			var t1 := TAU * (j + 1) / segments
			var v: Array[Vector3] = [
				_rev(profile[i], t0), _rev(profile[i], t1),
				_rev(profile[i + 1], t1), _rev(profile[i + 1], t0)]
			var nm: Array[Vector3] = [
				_rev_n(pt_n[i], t0), _rev_n(pt_n[i], t1),
				_rev_n(pt_n[i + 1], t1), _rev_n(pt_n[i + 1], t0)]
			var out := _rev_n(seg_n[i], (t0 + t1) * 0.5)
			_tri(st, v[0], v[1], v[2], nm[0], nm[1], nm[2], out)
			_tri(st, v[0], v[2], v[3], nm[0], nm[2], nm[3], out)
	return st.commit()


static func _rev(p: Vector2, t: float) -> Vector3:
	return Vector3(p.x * cos(t), p.y, p.x * sin(t))


static func _rev_n(nr: Vector2, t: float) -> Vector3:
	return Vector3(nr.x * cos(t), nr.y, nr.x * sin(t))


## A tapered tube with end caps. Origin at the top; extends down along -Y.
static func limb(r_top: float, r_bottom: float, length: float, segments := 8) -> ArrayMesh:
	return lathe(PackedVector2Array([
		Vector2(0, -length), Vector2(r_bottom, -length), Vector2(r_top, 0), Vector2(0, 0)]), segments)


## A box with chamfered edges, centered on the origin.
static func bevel_box(size: Vector3, bevel := 0.04) -> ArrayMesh:
	var h := size * 0.5
	var b := minf(bevel, minf(h.x, minf(h.y, h.z)) * 0.9)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	# P(axis, sx, sy, sz): the corner point belonging to the face on `axis`.
	var p := func(axis: int, s: Vector3) -> Vector3:
		var v := Vector3(s.x * (h.x - b), s.y * (h.y - b), s.z * (h.z - b))
		v[axis] = s[axis] * h[axis]
		return v
	var signs := [-1.0, 1.0]
	for axis in 3:
		var o1 := (axis + 1) % 3
		var o2 := (axis + 2) % 3
		for sa in signs:
			var pts: Array[Vector3] = []
			for s1 in signs:
				for s2 in signs:
					var s := Vector3.ZERO
					s[axis] = sa
					s[o1] = s1
					s[o2] = s2
					pts.append(p.call(axis, s))
			# pts order: (-,-) (-,+) (+,-) (+,+)
			var out := Vector3.ZERO
			out[axis] = sa
			_quad_flat(st, pts[0], pts[1], pts[3], pts[2], out)
	# Edge bevels: for each pair of axes and signs, join the two faces along the third axis.
	for a in 3:
		var bx := (a + 1) % 3
		var c := (a + 2) % 3
		for sa in signs:
			for sb in signs:
				var lo := Vector3.ZERO
				lo[a] = sa
				lo[bx] = sb
				lo[c] = -1.0
				var hi := lo
				hi[c] = 1.0
				var out := Vector3.ZERO
				out[a] = sa
				out[bx] = sb
				_quad_flat(st, p.call(a, lo), p.call(a, hi), p.call(bx, hi), p.call(bx, lo), out)
	# Corner triangles.
	for sx in signs:
		for sy in signs:
			for sz in signs:
				var s := Vector3(sx, sy, sz)
				_tri_flat(st, p.call(0, s), p.call(1, s), p.call(2, s), s)
	return st.commit()


## A slightly curved plate (pauldron, shield, cloak): width along X, height along Y,
## thickness along Z. `curve` bows the plate toward +Z at its middle by that many units.
static func plate(width: float, height: float, thickness: float, curve: float) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var cols := 6
	var hw := width * 0.5
	var ht := thickness * 0.5
	for i in cols:
		var x0 := -hw + width * i / cols
		var x1 := -hw + width * (i + 1) / cols
		var z0 := curve * (1.0 - pow(x0 / hw, 2.0))
		var z1 := curve * (1.0 - pow(x1 / hw, 2.0))
		var front := [Vector3(x0, -height * 0.5, z0 + ht), Vector3(x1, -height * 0.5, z1 + ht),
			Vector3(x1, height * 0.5, z1 + ht), Vector3(x0, height * 0.5, z0 + ht)]
		var back := [Vector3(x0, -height * 0.5, z0 - ht), Vector3(x1, -height * 0.5, z1 - ht),
			Vector3(x1, height * 0.5, z1 - ht), Vector3(x0, height * 0.5, z0 - ht)]
		_quad_flat(st, front[0], front[1], front[2], front[3], Vector3(0, 0, 1) + Vector3((x0 + x1) * 0.5 / hw, 0, 0) * 0.3)
		_quad_flat(st, back[1], back[0], back[3], back[2], Vector3(0, 0, -1))
		_quad_flat(st, back[0], back[1], front[1], front[0], Vector3(0, -1, 0))
		_quad_flat(st, back[3], back[2], front[2], front[3], Vector3(0, 1, 0))
		if i == 0:
			_quad_flat(st, back[0], front[0], front[3], back[3], Vector3(-1, 0, 0))
		if i == cols - 1:
			_quad_flat(st, front[1], back[1], back[2], front[2], Vector3(1, 0, 0))
	return st.commit()


## A pointed blade: origin at the hilt, extends along +Y. Width along X, thickness along Z.
static func blade(length: float, width: float, thickness: float) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var hw := width * 0.5
	var ht := thickness * 0.5
	var shoulder := length * 0.82
	# Cross-section is a diamond (fuller edge), tapering to a tip.
	var base := [Vector3(-hw, 0, 0), Vector3(0, 0, ht), Vector3(hw, 0, 0), Vector3(0, 0, -ht)]
	var top := [Vector3(-hw * 0.9, shoulder, 0), Vector3(0, shoulder, ht * 0.8),
		Vector3(hw * 0.9, shoulder, 0), Vector3(0, shoulder, -ht * 0.8)]
	var tip := Vector3(0, length, 0)
	for i in 4:
		var j := (i + 1) % 4
		var out: Vector3 = (base[i] + base[j]) * 0.5
		_quad_flat(st, base[i], base[j], top[j], top[i], out)
		_tri_flat(st, top[i], top[j], tip, out)
	_quad_flat(st, base[3], base[2], base[1], base[0], Vector3(0, -1, 0))
	return st.commit()


## A cone: origin at the base center, point along +Y.
static func spike(radius: float, height: float, segments := 6) -> ArrayMesh:
	return lathe(PackedVector2Array([
		Vector2(0, 0), Vector2(radius, 0), Vector2(0, height)]), segments)


# ------------------------------------------------------------------ helpers

static func _tri(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3,
		na: Vector3, nb: Vector3, nc: Vector3, outward: Vector3) -> void:
	var cross := (b - a).cross(c - a)
	if cross.length_squared() < 1e-10:
		return
	# Clockwise (cross points inward) is front-facing; flip if this one faces outward.
	if cross.dot(outward) > 0.0:
		var t := b
		b = c
		c = t
		var tn := nb
		nb = nc
		nc = tn
	st.set_normal(na)
	st.add_vertex(a)
	st.set_normal(nb)
	st.add_vertex(b)
	st.set_normal(nc)
	st.add_vertex(c)


static func _tri_flat(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, outward: Vector3) -> void:
	var cross := (b - a).cross(c - a)
	if cross.length_squared() < 1e-10:
		return
	var n := cross.normalized()
	if n.dot(outward) < 0.0:
		n = -n
	_tri(st, a, b, c, n, n, n, outward)


static func _quad_flat(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3, outward: Vector3) -> void:
	_tri_flat(st, a, b, c, outward)
	_tri_flat(st, a, c, d, outward)


## Put a mesh in the scene: position, euler rotation (radians) and scale in one call.
static func add(parent: Node, mesh: Mesh, material: Material, pos := Vector3.ZERO,
		rot := Vector3.ZERO, scl := Vector3.ONE) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = material
	mi.position = pos
	mi.rotation = rot
	mi.scale = scl
	parent.add_child(mi)
	return mi


## A two-segment limb (upper + lower) hanging from `pos`; returns the node at the far end so
## callers can hang a hand or foot off it. `bend` rotates the lower segment around X.
static func arm(parent: Node, material: Material, pos: Vector3, r_top: float, r_mid: float, r_end: float,
		upper: float, lower: float, upper_rot: Vector3, bend: float) -> Node3D:
	var root := Node3D.new()
	root.position = pos
	root.rotation = upper_rot
	parent.add_child(root)
	add(root, limb(r_top, r_mid, upper), material)
	var elbow := Node3D.new()
	elbow.position = Vector3(0, -upper, 0)
	elbow.rotation.x = bend
	root.add_child(elbow)
	add(elbow, limb(r_mid, r_end, lower), material)
	var hand := Node3D.new()
	hand.position = Vector3(0, -lower, 0)
	elbow.add_child(hand)
	return hand


## Tapered strut between two points in the parent's coordinates.
static func link(parent: Node3D, start: Vector3, end: Vector3, r_start: float, r_end: float, material: Material) -> MeshInstance3D:
	var offset := end - start
	var part := add(parent, limb(r_start, r_end, offset.length(), 6), material, start)
	part.quaternion = Quaternion(Vector3.DOWN, offset.normalized())
	return part
