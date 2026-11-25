extends RefCounted
## Realistic architecture, built in code: weathered materials, gabled roofs with thickness, sag and a ridge cap,
## stone plinths of uneven rubble, half-timber frames with braces, arched windows, cornices and steps.
## Used by town.gd for the houses, St. Aldric's chapel and the mausoleum.

const B = preload("res://scripts/world/build.gd")
const WEATHERED = preload("res://shaders/weathered.gdshader")

static var _cache := {}


## A weathered PBR material (shaders/weathered.gdshader) from a texture set in assets/textures/materials.
static func weathered(set_name: String, tint := Color.WHITE, scale := 0.45, moss := 0.6, damp_height := 1.1, soot := 0.0, roughness_mul := 1.0, normal_depth := 1.4, metallic := 0.0) -> ShaderMaterial:
	var key := "%s|%s|%.2f|%.2f|%.2f|%.2f|%.2f|%.2f|%.2f" % [set_name, tint.to_html(), scale, moss, damp_height, soot, roughness_mul, normal_depth, metallic]
	if _cache.has(key):
		return _cache[key]
	var m := ShaderMaterial.new()
	m.shader = WEATHERED
	var base := "res://assets/textures/materials/%s_%s.png"
	m.set_shader_parameter("albedo_tex", load(base % [set_name, "albedo"]))
	m.set_shader_parameter("normal_tex", load(base % [set_name, "normal"]))
	m.set_shader_parameter("rough_tex", load(base % [set_name, "roughness"]))
	m.set_shader_parameter("tint", Vector3(tint.r, tint.g, tint.b))
	m.set_shader_parameter("scale", scale)
	m.set_shader_parameter("moss", moss)
	m.set_shader_parameter("damp_height", damp_height)
	m.set_shader_parameter("soot", soot)
	m.set_shader_parameter("roughness_mul", roughness_mul)
	m.set_shader_parameter("normal_depth", normal_depth)
	m.set_shader_parameter("metallic_amount", metallic)
	_cache[key] = m
	return m


static func _tri(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, outward: Vector3) -> void:
	var cross := (b - a).cross(c - a)
	if cross.length_squared() < 1e-10:
		return
	if cross.dot(outward) > 0.0:  # Godot's front faces are clockwise
		var t := b
		b = c
		c = t
	var n := (b - a).cross(c - a).normalized()
	for v in [a, b, c]:
		st.set_normal(-n)
		st.add_vertex(v)


static func _quad(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3, outward: Vector3) -> void:
	_tri(st, a, b, c, outward)
	_tri(st, a, c, d, outward)


## A gabled roof whose ridge runs along local X: two slightly sagging, uneven planes with real overhang,
## closed gable ends (end_mat), eave fascia boards and a ridge cap. `pos` is the wall top, centred.
static func gable_roof(parent: Node3D, pos: Vector3, length: float, width: float, rise: float, overhang: float, roof_mat: Material, end_mat: Material, trim_mat: Material, seed_value := 1) -> Node3D:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var root := Node3D.new()
	root.position = pos
	parent.add_child(root)
	var hw := width * 0.5 + overhang
	var hl := length * 0.5
	var nx := 10
	var nz := 5
	var planes := SurfaceTool.new()
	planes.begin(Mesh.PRIMITIVE_TRIANGLES)
	var noise := FastNoiseLite.new()
	noise.seed = seed_value
	noise.frequency = 0.5
	for side in [-1, 1]:
		var grid: Array = []
		for iz in nz + 1:
			var row: Array = []
			var t := float(iz) / nz  # 0 at the ridge, 1 at the eave
			for ix in nx + 1:
				var x := -hl + length * ix / nx
				var sag := sin(float(ix) / nx * PI) * 0.06 * t
				var bump := noise.get_noise_2d(x * 2.0, t * 3.0 + side * 9.0) * 0.045
				row.append(Vector3(x, rise * (1.0 - t) - sag + bump, side * hw * t))
			grid.append(row)
		var out := Vector3(0, 1, side * 0.6)
		for iz in nz:
			for ix in nx:
				_quad(planes, grid[iz][ix], grid[iz][ix + 1], grid[iz + 1][ix + 1], grid[iz + 1][ix], out)
		# the underside, so the eave has thickness
		var thick := 0.14
		for ix in nx:
			var a: Vector3 = grid[nz][ix]
			var b: Vector3 = grid[nz][ix + 1]
			_quad(planes, a, b, b - Vector3(0, thick, 0), a - Vector3(0, thick, 0), Vector3(0, 0, side))
	var ends := SurfaceTool.new()
	ends.begin(Mesh.PRIMITIVE_TRIANGLES)
	for end in [-1, 1]:
		_tri(ends, Vector3(end * hl, 0, -hw), Vector3(end * hl, rise, 0), Vector3(end * hl, 0, hw), Vector3(end, 0, 0))
	var mesh := planes.commit()
	mesh = ends.commit(mesh)
	mesh.surface_set_material(0, roof_mat)
	mesh.surface_set_material(1, end_mat)
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	root.add_child(mi)
	# Ridge cap: a slim bevelled beam along the top, and fascia boards along both eaves.
	B.box(Vector3(length + 0.06, 0.16, 0.34), trim_mat, Vector3(0, rise + 0.05, 0), root)
	for side in [-1, 1]:
		B.box(Vector3(length + 0.04, 0.2, 0.07), trim_mat, Vector3(0, -0.04, side * (hw + 0.02)), root)
	# Eave brackets under the overhang give the roof visible structure.
	var step := 1.4
	var count := int(length / step)
	for i in count + 1:
		var x := -length * 0.5 + i * (length / maxi(count, 1))
		for side in [-1, 1]:
			B.box(Vector3(0.1, 0.1, overhang * 0.9), trim_mat, Vector3(x, -0.2, side * (hw - overhang * 0.45)), root)
	return root


## A plinth of uneven rubble courses around a footprint: the stone every building really stands on.
static func plinth(parent: Node3D, size: Vector2, height: float, mat: Material, seed_value := 1, skirt := 0.14) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var hx := size.x * 0.5
	var hz := size.y * 0.5
	for side in 4:
		var along_x := side < 2
		var length := size.x if along_x else size.y
		var offset := (hz if along_x else hx) * (1.0 if side % 2 == 0 else -1.0)
		var cursor := -length * 0.5
		while cursor < length * 0.5 - 0.05:
			var w := minf(rng.randf_range(0.5, 1.2), length * 0.5 - cursor)
			var h := height * rng.randf_range(0.8, 1.15)
			var out := skirt + rng.randf_range(-0.03, 0.05)
			var mid := cursor + w * 0.5
			if along_x:
				B.box(Vector3(w - 0.03, h, out * 2.0 + 0.2), mat, Vector3(mid, h * 0.5 - 0.05, offset), parent)
			else:
				B.box(Vector3(out * 2.0 + 0.2, h, w - 0.03), mat, Vector3(offset, h * 0.5 - 0.05, mid), parent)
			cursor += w


## A half-timber frame laid over a wall face: posts, rails and diagonal braces in each panel. `face` is the wall
## centre, `normal` points out of it, `width` and `height` are the wall's visible size.
static func timber_frame(parent: Node3D, centre: Vector3, normal: Vector3, width: float, height: float, mat: Material, seed_value := 1) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var node := Node3D.new()
	node.position = centre + normal * 0.07
	node.rotation.y = atan2(normal.x, normal.z)
	parent.add_child(node)
	var panels := maxi(2, int(round(width / 1.5)))
	var pw := width / panels
	for i in panels + 1:
		B.box(Vector3(0.16, height, 0.12), mat, Vector3(-width * 0.5 + i * pw, 0, 0), node)
	for y in [-height * 0.5 + 0.1, height * 0.5 - 0.1, height * 0.12]:
		B.box(Vector3(width, 0.16, 0.12), mat, Vector3(0, y, 0), node)
	for i in panels:
		if rng.randf() < 0.7:
			var brace := B.box(Vector3(0.1, sqrt(pw * pw + (height * 0.38) * (height * 0.38)) * 0.98, 0.1), mat,
				Vector3(-width * 0.5 + (i + 0.5) * pw, -height * 0.19, 0), node)
			brace.rotation.z = atan2(pw, height * 0.38) * (1.0 if rng.randf() < 0.5 else -1.0)


## A pointed-arch window with a stone surround, set into a wall (centre on the wall face, facing +Z in node space).
static func arched_window(parent: Node3D, pos: Vector3, w: float, h: float, glass: Material, stone: Material) -> void:
	var node := Node3D.new()
	node.position = pos
	parent.add_child(node)
	B.box(Vector3(w, h - w * 0.5, 0.1), glass, Vector3(0, -w * 0.25, 0.04), node)
	var cap := CylinderMesh.new()
	cap.top_radius = w * 0.5
	cap.bottom_radius = w * 0.5
	cap.height = 0.1
	cap.radial_segments = 14
	var arch := B.mesh_node(cap, glass, Vector3(0, h * 0.5 - w * 0.5, 0.04), node)
	arch.rotation.x = PI * 0.5
	# Surround: jambs, sill and an arch ring of voussoir blocks.
	for sx in [-1, 1]:
		B.box(Vector3(0.18, h - w * 0.5, 0.2), stone, Vector3(sx * (w * 0.5 + 0.09), -w * 0.25, 0.06), node)
	B.box(Vector3(w + 0.6, 0.16, 0.34), stone, Vector3(0, -h * 0.5 - 0.06, 0.12), node)
	for i in 9:
		var a := PI * i / 8.0
		var block := B.box(Vector3(0.18, 0.2, 0.2), stone, Vector3(cos(a) * (w * 0.5 + 0.09), h * 0.5 - w * 0.5 + sin(a) * (w * 0.5 + 0.09), 0.06), node)
		block.rotation.z = a - PI * 0.5
	# Muntins crossing the glass.
	B.box(Vector3(0.05, h, 0.06), stone, Vector3(0, 0, 0.1), node)
	B.box(Vector3(w, 0.05, 0.06), stone, Vector3(0, h * 0.1, 0.1), node)


## A projecting cornice band: a stack of three stepped slabs.
static func cornice(parent: Node3D, pos: Vector3, length: float, depth: float, mat: Material, along_x := true) -> void:
	for i in 3:
		var d := depth * (0.45 + i * 0.28)
		var size := Vector3(length + i * 0.1, 0.1, d * 2.0) if along_x else Vector3(d * 2.0, 0.1, length + i * 0.1)
		B.box(size, mat, pos + Vector3(0, i * 0.1, 0), parent)


## Broad steps up to a door, each slightly worn and uneven.
static func steps(parent: Node3D, pos: Vector3, width: float, count: int, mat: Material, depth := 0.45, rise := 0.17) -> void:
	for i in count:
		B.box(Vector3(width - i * 0.1, rise, depth * (count - i)), mat, pos + Vector3(0, rise * (i + 0.5), depth * (count - i) * 0.5 - 0.0), parent)
