extends RefCounted
## Original tree models, built in code: several spruce, oak and birch variants plus a grass blade.
## Each tree is one ArrayMesh with two surfaces (0 = bark, 1 = foliage) and its materials already set,
## so a MultiMesh can instance it directly. Variants differ in tier count, lean, crown shape and tint.
## Foliage carries a vertex colour gradient (dark inside, lit at the tips) that the material multiplies.

const B = preload("res://scripts/world/build.gd")

static var _bark: StandardMaterial3D
static var _leaf: StandardMaterial3D
static var _birch: StandardMaterial3D


static func bark_material() -> StandardMaterial3D:
	if _bark == null:
		_bark = B.pbr("timber", Color(0.46, 0.38, 0.34), 1.1, 1.0, 0.0, 1.6)
	return _bark


static func birch_material() -> StandardMaterial3D:
	if _birch == null:
		_birch = B.pbr("plaster", Color(0.78, 0.76, 0.7), 1.0, 0.95, 0.0, 1.2)
	return _birch


static func leaf_material() -> StandardMaterial3D:
	if _leaf == null:
		_leaf = B.pbr("cloth", Color.WHITE, 1.6, 1.0, 0.0, 2.2).duplicate()
		_leaf.vertex_color_use_as_albedo = true
		_leaf.cull_mode = BaseMaterial3D.CULL_DISABLED
		_leaf.rim_enabled = true
		_leaf.rim = 0.25
		_leaf.rim_tint = 0.7
		_leaf.backlight_enabled = true
		_leaf.backlight = Color(0.08, 0.14, 0.05)
	return _leaf


## A spruce: root flare, tapered trunk and layered, drooping, ragged skirts. Height is about 7 m at scale 1.
static func spruce(seed_value: int, tiers := 6, tint := Color(0.2, 0.34, 0.24)) -> ArrayMesh:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var wood := SurfaceTool.new()
	wood.begin(Mesh.PRIMITIVE_TRIANGLES)
	var leaves := SurfaceTool.new()
	leaves.begin(Mesh.PRIMITIVE_TRIANGLES)
	var height := rng.randf_range(6.2, 7.6)
	var lean := Vector2(rng.randf_range(-0.06, 0.06), rng.randf_range(-0.06, 0.06))
	_trunk(wood, Vector3.ZERO, height * 0.96, 0.3, 0.05, lean, rng, 9, true)
	for i in tiers:
		var t := float(i) / float(tiers - 1)
		var radius := lerpf(2.1, 0.55, t) * rng.randf_range(0.9, 1.1)
		var y := lerpf(1.5, height * 0.93, t)
		var drop := lerpf(1.35, 0.8, t)
		_skirt(leaves, Vector3(lean.x * y, y, lean.y * y), radius, drop, 14 if i < 3 else 11, rng, tint, t)
	return _pack(wood, leaves, bark_material())


## A broadleaf oak: a thick, forking trunk under a crown of lumpy, noise-displaced masses.
static func oak(seed_value: int, tint := Color(0.26, 0.36, 0.14)) -> ArrayMesh:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var wood := SurfaceTool.new()
	wood.begin(Mesh.PRIMITIVE_TRIANGLES)
	var leaves := SurfaceTool.new()
	leaves.begin(Mesh.PRIMITIVE_TRIANGLES)
	var trunk_h := rng.randf_range(2.2, 2.9)
	_trunk(wood, Vector3.ZERO, trunk_h, 0.46, 0.24, Vector2(rng.randf_range(-0.08, 0.08), rng.randf_range(-0.08, 0.08)), rng, 10, true)
	var tops: Array[Vector3] = []
	for limb in rng.randi_range(3, 4):
		var yaw := limb * TAU / 3.5 + rng.randf() * 0.6
		var out := Vector3(sin(yaw), 0.0, cos(yaw)) * rng.randf_range(0.9, 1.5)
		var base := Vector3(0, trunk_h * rng.randf_range(0.8, 0.95), 0)
		var top := base + out + Vector3(0, rng.randf_range(1.2, 1.9), 0)
		_branch(wood, base, top, 0.2, 0.07, rng)
		tops.append(top)
	for top in tops:
		_blob(leaves, top + Vector3(0, 0.6, 0), rng.randf_range(1.25, 1.65), rng, tint, 7)
		_blob(leaves, top + Vector3(rng.randf_range(-0.8, 0.8), -0.1, rng.randf_range(-0.8, 0.8)), rng.randf_range(0.9, 1.2), rng, tint.darkened(0.15), 6)
	_blob(leaves, Vector3(0, trunk_h + 1.9, 0), 1.7, rng, tint.lightened(0.08), 7)
	return _pack(wood, leaves, bark_material())


## A slim white-barked birch with a light, airy crown.
static func birch(seed_value: int, tint := Color(0.42, 0.5, 0.2)) -> ArrayMesh:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var wood := SurfaceTool.new()
	wood.begin(Mesh.PRIMITIVE_TRIANGLES)
	var leaves := SurfaceTool.new()
	leaves.begin(Mesh.PRIMITIVE_TRIANGLES)
	var h := rng.randf_range(4.6, 5.8)
	var lean := Vector2(rng.randf_range(-0.1, 0.1), rng.randf_range(-0.1, 0.1))
	_trunk(wood, Vector3.ZERO, h, 0.17, 0.06, lean, rng, 7, false)
	for k in 4:
		var y := h * (0.5 + k * 0.13)
		var yaw := rng.randf() * TAU
		_branch(wood, Vector3(lean.x * y, y, lean.y * y), Vector3(lean.x * y + sin(yaw) * 0.9, y + 0.5, lean.y * y + cos(yaw) * 0.9), 0.06, 0.02, rng)
		_blob(leaves, Vector3(lean.x * y + sin(yaw) * 1.0, y + 0.55, lean.y * y + cos(yaw) * 1.0), rng.randf_range(0.7, 1.0), rng, tint, 5)
	_blob(leaves, Vector3(lean.x * h, h + 0.4, lean.y * h), 1.0, rng, tint.lightened(0.1), 6)
	return _pack(wood, leaves, birch_material())


## A single curved grass blade (UV.y: 0 at the root, 1 at the tip), three segments tall.
static func blade(height := 0.5, width := 0.05, curve := 0.18) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rows := 4
	var left: Array[Vector3] = []
	var right: Array[Vector3] = []
	for r in rows + 1:
		var t := float(r) / rows
		var w := width * (1.0 - t * t * 0.92) * 0.5
		var c := Vector3(0, t * height, t * t * curve * height)
		left.append(c + Vector3(-w, 0, 0))
		right.append(c + Vector3(w, 0, 0))
	for r in rows:
		var t0 := float(r) / rows
		var t1 := float(r + 1) / rows
		_quad_uv(st, left[r], right[r], right[r + 1], left[r + 1], t0, t1)
	st.generate_normals()
	return st.commit()


# ---- internals -----------------------------------------------------------------------------------------

static func _pack(wood: SurfaceTool, leaves: SurfaceTool, wood_mat: Material) -> ArrayMesh:
	wood.generate_normals()
	leaves.generate_normals()
	var mesh := wood.commit()
	mesh = leaves.commit(mesh)
	mesh.surface_set_material(0, wood_mat)
	mesh.surface_set_material(1, leaf_material())
	return mesh


static func _quad_uv(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3, t0: float, t1: float) -> void:
	var pts := [[a, t0], [b, t0], [c, t1], [a, t0], [c, t1], [d, t1]]
	for p in pts:
		st.set_uv(Vector2(0.5, p[1]))
		st.add_vertex(p[0])


static func _ring(center: Vector3, radius: float, segments: int, rng: RandomNumberGenerator, wobble: float) -> Array[Vector3]:
	var out: Array[Vector3] = []
	for s in segments:
		var a := TAU * s / segments
		var r := radius * (1.0 + rng.randf_range(-wobble, wobble))
		out.append(center + Vector3(cos(a) * r, 0, sin(a) * r))
	return out


## A tapered, slightly leaning trunk with an optional root flare.
static func _trunk(st: SurfaceTool, base: Vector3, height: float, r0: float, r1: float, lean: Vector2, rng: RandomNumberGenerator, segments: int, flare: bool) -> void:
	var rings := 6
	var prev := _ring(base, r0 * (1.7 if flare else 1.0), segments, rng, 0.12)
	for k in range(1, rings + 1):
		var t := float(k) / rings
		var y := t * height
		var r := lerpf(r0, r1, t) * (1.0 + (0.35 * pow(1.0 - t, 6.0) if flare else 0.0))
		var center := base + Vector3(lean.x * y, y, lean.y * y)
		var ring := _ring(center, r, segments, rng, 0.07)
		for s in segments:
			var n := (s + 1) % segments
			_tri_up(st, prev[s], prev[n], ring[n])
			_tri_up(st, prev[s], ring[n], ring[s])
		prev = ring


static func _branch(st: SurfaceTool, from: Vector3, to: Vector3, r0: float, r1: float, rng: RandomNumberGenerator) -> void:
	var axis := (to - from)
	var basis := Basis.looking_at(axis.normalized() if axis.length() > 0.01 else Vector3.UP, Vector3.UP) if absf(axis.normalized().dot(Vector3.UP)) < 0.98 else Basis.IDENTITY
	var segs := 6
	var rings := 4
	var prev: Array[Vector3] = []
	for k in rings + 1:
		var t := float(k) / rings
		var bend := Vector3(rng.randf_range(-0.06, 0.06), rng.randf_range(0.0, 0.1), rng.randf_range(-0.06, 0.06)) * t
		var c := from.lerp(to, t) + bend
		var r := lerpf(r0, r1, t)
		var ring: Array[Vector3] = []
		for s in segs:
			var a := TAU * s / segs
			ring.append(c + basis * Vector3(cos(a) * r, sin(a) * r, 0))
		if k > 0:
			for s in segs:
				var n := (s + 1) % segs
				_tri_up(st, prev[s], prev[n], ring[n])
				_tri_up(st, prev[s], ring[n], ring[s])
		prev = ring


## Adds a triangle whose normal is made to point away from the vertical axis of the trunk (generate_normals
## uses winding, so the winding is kept consistent by always passing counter-clockwise from outside).
static func _tri_up(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3) -> void:
	for v in [a, c, b]:
		st.add_vertex(v)


## A drooping skirt: a ragged cone from the stem out to a jagged rim, with a darker underside.
static func _skirt(st: SurfaceTool, top: Vector3, radius: float, drop: float, spokes: int, rng: RandomNumberGenerator, tint: Color, t: float) -> void:
	var inner := tint.darkened(0.45)
	var outer := tint.lightened(0.1 + (1.0 - t) * 0.05)
	var mid_ring: Array[Vector3] = []
	var rim: Array[Vector3] = []
	var yaw0 := rng.randf() * TAU
	for s in spokes:
		var a := yaw0 + TAU * s / spokes
		var jag := rng.randf_range(0.78, 1.1) if s % 2 == 0 else rng.randf_range(0.5, 0.78)
		var r := radius * jag
		mid_ring.append(top + Vector3(cos(a) * r * 0.55, -drop * 0.35, sin(a) * r * 0.55))
		rim.append(top + Vector3(cos(a) * r, -drop * rng.randf_range(0.85, 1.15), sin(a) * r))
	var apex := top + Vector3(0, 0.55 + (1.0 - t) * 0.2, 0)
	for s in spokes:
		var n := (s + 1) % spokes
		_coloured(st, apex, inner.lerp(outer, 0.1), rim_pt(mid_ring, s), inner.lerp(outer, 0.4), rim_pt(mid_ring, n), inner.lerp(outer, 0.4))
		_coloured(st, mid_ring[s], inner.lerp(outer, 0.4), rim[s], outer, rim[n], outer)
		_coloured(st, mid_ring[s], inner.lerp(outer, 0.4), rim[n], outer, mid_ring[n], inner.lerp(outer, 0.4))
		# underside so the skirt is thick from below
		_coloured(st, top, inner.darkened(0.2), rim[n], inner, rim[s], inner)


static func rim_pt(ring: Array[Vector3], i: int) -> Vector3:
	return ring[i]


static func _coloured(st: SurfaceTool, a: Vector3, ca: Color, b: Vector3, cb: Color, c: Vector3, cc: Color) -> void:
	st.set_color(ca)
	st.add_vertex(a)
	st.set_color(cc)
	st.add_vertex(c)
	st.set_color(cb)
	st.add_vertex(b)


## A lumpy, noise-displaced sphere for broadleaf crowns, dark inside, lit at the upper rim.
static func _blob(st: SurfaceTool, center: Vector3, radius: float, rng: RandomNumberGenerator, tint: Color, detail: int) -> void:
	var noise := FastNoiseLite.new()
	noise.seed = rng.randi()
	noise.frequency = 1.4
	var lat := detail + 1
	var lon := detail * 2
	var grid: Array = []
	for i in lat + 1:
		var row: Array = []
		var v := PI * i / lat
		for j in lon:
			var u := TAU * j / lon
			var dir := Vector3(sin(v) * cos(u), cos(v), sin(v) * sin(u))
			var lump := 1.0 + noise.get_noise_3dv(dir * 2.0 + center) * 0.38
			var pos := center + dir * radius * lump * Vector3(1.0, 0.82, 1.0)
			var light := clampf(dir.y * 0.5 + 0.55, 0.0, 1.0)
			row.append([pos, tint.darkened(0.5).lerp(tint.lightened(0.18), light)])
		grid.append(row)
	for i in lat:
		for j in lon:
			var n := (j + 1) % lon
			var p00: Array = grid[i][j]
			var p01: Array = grid[i][n]
			var p10: Array = grid[i + 1][j]
			var p11: Array = grid[i + 1][n]
			_coloured(st, p00[0], p00[1], p10[0], p10[1], p11[0], p11[1])
			_coloured(st, p00[0], p00[1], p11[0], p11[1], p01[0], p01[1])
