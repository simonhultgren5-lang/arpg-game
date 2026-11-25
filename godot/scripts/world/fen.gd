extends RefCounted
## The approach to Hollowmere. The same authored cells drive the land, bridges and navigation.
## ^ shale and spruce, ~ river, = timber deck, : pilgrim road, F abandoned watchfire.
##
## The land is a smoothed height field (round hills, banked river, flat paths) meshed at SUB x SUB quads per
## cell and shaded by terrain.gdshader (earth, grass, mud, shale cliffs, frost). Mountains rise beyond the
## level edge, the river is a flowing water shader, and the trees, boulders and grass are MultiMeshes.
const START_ROW := 25
const SUB := 3  # ground sub-quads per cell edge
const Grid = preload("res://scripts/world/level_grid.gd")
const B = preload("res://scripts/world/build.gd")
const Interactable = preload("res://scripts/world/interactable.gd")
const TreeKit = preload("res://scripts/models/tree_kit.gd")
const WALKABLE := [".", ":", "P", "F", "="]


static func build(world: Node3D, parent: Node3D, grid: Grid, rows: Array) -> void:
	var fen := Node3D.new()
	fen.name = "SouthwatchFen"
	parent.add_child(fen)
	var rng := RandomNumberGenerator.new()
	rng.seed = 62487
	var noise := FastNoiseLite.new()
	noise.seed = 427
	noise.frequency = 0.12
	var relief := FastNoiseLite.new()
	relief.seed = 91
	relief.fractal_octaves = 4
	relief.frequency = 0.09
	var field := _height_field(grid, rows, noise)
	var grass: Array[Transform3D] = []
	var spruces: Array = [[], [], []]
	var oaks: Array = [[], []]
	var birches: Array = [[], []]
	var stones: Array = [[], [], []]
	var rushes: Array[Transform3D] = []
	var flowers: Array[Transform3D] = []
	var decks: Array[Transform3D] = []
	var ground := SurfaceTool.new()
	ground.begin(Mesh.PRIMITIVE_TRIANGLES)
	var corner := [Vector2i(0, 0), Vector2i(1, 0), Vector2i(1, 1), Vector2i(0, 1)]
	# The ground is meshed SUB x SUB per cell from the smoothed height field, so slopes and banks are round.
	for y in range(START_ROW, grid.h):
		for x in grid.w:
			var c := Vector2i(x, y)
			var kind: String = rows[y][x]
			var p := grid.center(c)
			for sy in SUB:
				for sx in SUB:
					var q: Array[Vector3] = []
					var col: Array[Color] = []
					for o in corner:
						var g := Vector2(x + float(sx + o.x) / SUB, y + float(sy + o.y) / SUB)
						q.append(_surface(field, relief, g))
						col.append(_land_color(Vector2i(roundi(g.x), roundi(g.y)), rows, noise))
					for index in [0, 1, 2, 0, 2, 3]:
						ground.set_color(col[index])
						ground.add_vertex(q[index])
			var centre := Vector2(c) + Vector2(0.5, 0.5)
			var base := _surface(field, relief, centre)
			match kind:
				"=":
					if rows[y - 1][x] != "=":
						_bridge_rails(fen, rows, c, p)
					for plank in 5:
						decks.append(Transform3D(Basis.IDENTITY, p + Vector3(0, -0.045, -0.8 + plank * 0.4)))
				"^":
					var roll := rng.randf()
					var jitter := Vector2(rng.randf_range(-0.35, 0.35), rng.randf_range(-0.35, 0.35))
					var at := _surface(field, relief, centre + jitter)
					var steep := absf(_surface(field, relief, centre + Vector2(0.4, 0)).y - _surface(field, relief, centre - Vector2(0.4, 0)).y)
					if at.y < 4.8 and steep < 1.9 and roll < 0.62:
						var s := rng.randf_range(0.8, 1.35)
						var pose := Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3.ONE * s), at)
						if roll < 0.40:
							spruces[rng.randi() % 3].append(pose)
						elif roll < 0.52:
							oaks[rng.randi() % 2].append(pose)
						else:
							birches[rng.randi() % 2].append(pose)
					elif rng.randf() < 0.55:
						var size := Vector3(rng.randf_range(0.8, 1.9), rng.randf_range(0.6, 1.5), rng.randf_range(0.8, 1.7))
						stones[rng.randi() % 3].append(Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(size), at - Vector3.UP * 0.25))
				".":
					var bank := false
					for offset in [Vector2i.UP, Vector2i.DOWN, Vector2i.LEFT, Vector2i.RIGHT]:
						var n: Vector2i = c + offset
						if grid.inside(n) and rows[n.y][n.x] == "~":
							bank = true
					var meadow := noise.get_noise_2d(x * 3.1, y * 3.1)
					var tufts := 5 + int(clampf(meadow + 0.6, 0.0, 1.2) * 7.0) + (4 if bank else 0)
					for tuft in tufts:
						var at := base + Vector3(rng.randf_range(-1.0, 1.0), 0.02, rng.randf_range(-1.0, 1.0))
						var length := rng.randf_range(0.55, 1.5) * (1.25 if bank else 1.0)
						var yaw := rng.randf() * TAU
						for b in 3:
							var basis := Basis(Vector3.UP, yaw + b * 1.05).scaled(Vector3(rng.randf_range(0.8, 1.3), length * rng.randf_range(0.7, 1.15), 1.0))
							grass.append(Transform3D(basis, at + Vector3(rng.randf_range(-0.07, 0.07), 0, rng.randf_range(-0.07, 0.07))))
						if bank and tuft % 2 == 0:
							rushes.append(Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(1, rng.randf_range(0.9, 1.6), 1)), at + Vector3.UP * 0.3))
						elif tuft % 4 == 0 and meadow > 0.0:
							flowers.append(Transform3D(Basis.IDENTITY, at + Vector3.UP * 0.2))
					if bank and rng.randf() < 0.7:
						var size := Vector3(0.55, 0.42, 0.68) * rng.randf_range(0.5, 1.2)
						stones[rng.randi() % 3].append(Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(size), base + Vector3(rng.randf_range(-0.6, 0.6), 0, rng.randf_range(-0.6, 0.6))))
				"F": _watchfire(world, fen, p)
	ground.generate_normals()
	var land := ShaderMaterial.new()
	land.shader = preload("res://shaders/terrain.gdshader")
	for part in ["albedo", "normal"]:
		land.set_shader_parameter("earth_%s" % part, load("res://assets/textures/materials/earth_%s.png" % part))
		land.set_shader_parameter("rock_%s" % part, load("res://assets/textures/materials/stone_wall_%s.png" % part))
	B.mesh_node(ground.commit(), land, Vector3.ZERO, fen).name = "Terrain"
	_backdrop(fen, grid, land)
	var water := ShaderMaterial.new()
	water.shader = preload("res://shaders/water.gdshader")
	var river := PlaneMesh.new()
	river.size = Vector2(grid.w * Grid.CELL + 60.0, 30.0)
	_bake_riverbed(water, field, relief, grid)
	B.mesh_node(river, water, Vector3(grid.w * Grid.CELL / 2, -0.15, (START_ROW + 10.5) * Grid.CELL), fen).name = "River"
	var plank_mesh := BoxMesh.new()
	plank_mesh.size = Vector3(Grid.CELL, 0.09, 0.38)
	var wood := B.unique_mat(Color("#78654a"))
	B.surface_grain(wood, Vector3(0.08, 0.7, 0.75))
	_batch(fen, plank_mesh, wood, decks)
	_batch(fen, _cone(0.032, 0.94, 0.018), B.mat(Color("#ba995c")), rushes)
	_batch(fen, _cone(0.055, 0.09, 0.09), B.mat(Color("#d4b3b0")), flowers)
	# Grass: curved blades with wind sway; the hero's position (a shader global) bends them aside.
	var blade_material := ShaderMaterial.new()
	blade_material.shader = preload("res://shaders/grass.gdshader")
	_batch(fen, TreeKit.blade(0.5, 0.07, 0.25), blade_material, grass)
	var spruce_tints := [Color(0.2, 0.34, 0.24), Color(0.17, 0.3, 0.22), Color(0.24, 0.36, 0.2)]
	for i in spruces.size():
		_batch(fen, TreeKit.spruce(100 + i, 5 + i, spruce_tints[i]), null, spruces[i])
	for i in oaks.size():
		_batch(fen, TreeKit.oak(200 + i, Color(0.24, 0.33, 0.12).lerp(Color(0.4, 0.3, 0.1), i * 0.4)), null, oaks[i])
	for i in birches.size():
		_batch(fen, TreeKit.birch(300 + i, Color(0.4, 0.48, 0.18)), null, birches[i])
	var rock_material := B.pbr("stone_wall", Color(0.62, 0.6, 0.68), 0.5, 1.0, 0.0, 1.8)
	for i in stones.size():
		_batch(fen, _boulder(500 + i), rock_material, stones[i])


## The water shader reads depth from this baked height map of the ground (R32F, 8 px per cell).
static func _bake_riverbed(water: ShaderMaterial, field: Dictionary, relief: FastNoiseLite, grid: Grid) -> void:
	var px := 8
	var w := grid.w * px
	var h := (grid.h - START_ROW) * px
	var image := Image.create(w, h, false, Image.FORMAT_RF)
	for y in h:
		for x in w:
			var g := Vector2(float(x) / px, START_ROW + float(y) / px)
			image.set_pixel(x, y, Color(_surface(field, relief, g).y, 0, 0, 1))
	water.set_shader_parameter("bed", ImageTexture.create_from_image(image))
	water.set_shader_parameter("bed_rect", Vector4(0.0, START_ROW * Grid.CELL, grid.w * Grid.CELL, (grid.h - START_ROW) * Grid.CELL))


## One shared boulder: a faceted, noise-displaced sphere that is flat-shaded.
static func _boulder(seed_value: int) -> ArrayMesh:
	var n := FastNoiseLite.new()
	n.seed = seed_value
	n.frequency = 1.6
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var lat := 6
	var lon := 9
	var pts: Array = []
	for i in lat + 1:
		var row: Array = []
		for j in lon:
			var v := PI * i / lat
			var u := TAU * j / lon
			var d := Vector3(sin(v) * cos(u), cos(v), sin(v) * sin(u))
			var r := 0.8 * (1.0 + n.get_noise_3dv(d * 2.0) * 0.55)
			row.append(d * r * Vector3(1.0, 0.7, 1.0) + Vector3.UP * 0.35)
		pts.append(row)
	for i in lat:
		for j in lon:
			var k := (j + 1) % lon
			for v in [pts[i][j], pts[i][k], pts[i + 1][k], pts[i][j], pts[i + 1][k], pts[i + 1][j]]:
				st.add_vertex(v)
	st.generate_normals()
	return st.commit()


## Smoothed height field at the cell corners of the fen (rows START_ROW..h), kept flat beside walkable cells.
static func _height_field(grid: Grid, rows: Array, noise: FastNoiseLite) -> Dictionary:
	var w := grid.w + 1
	var h := grid.h + 1
	var raw := PackedFloat32Array()
	raw.resize(w * h)
	var keep := PackedByteArray()
	keep.resize(w * h)
	for y in range(START_ROW, h):
		for x in w:
			raw[y * w + x] = _height(Vector2i(x, y), rows, noise)
			for dy in [-1, 0]:
				for dx in [-1, 0]:
					var row: String = rows[clampi(y + dy, START_ROW, rows.size() - 1)]
					if row[clampi(x + dx, 0, row.length() - 1)] in WALKABLE:
						keep[y * w + x] = 1
	var soft := raw.duplicate()
	for pass_index in 3:
		var next := soft.duplicate()
		for y in range(START_ROW + 1, h - 1):
			for x in range(1, w - 1):
				var sum := 0.0
				for dy in range(-1, 2):
					for dx in range(-1, 2):
						sum += soft[(y + dy) * w + x + dx]
				next[y * w + x] = sum / 9.0
		soft = next
	for i in soft.size():
		if keep[i] == 1:
			soft[i] = minf(soft[i], raw[i]) if raw[i] > 0.0 else lerpf(raw[i], soft[i], 0.5)
	return {"w": w, "data": soft}


static func _sample(field: Dictionary, g: Vector2) -> float:
	var w: int = field["w"]
	var data: PackedFloat32Array = field["data"]
	var total := data.size() / w
	var gx := clampf(g.x, 0.0, w - 1.001)
	var gy := clampf(g.y, float(START_ROW), total - 1.001)
	var ix := int(gx)
	var iy := int(gy)
	var fx := gx - ix
	var fy := gy - iy
	var a := lerpf(data[iy * w + ix], data[iy * w + ix + 1], fx)
	var b := lerpf(data[(iy + 1) * w + ix], data[(iy + 1) * w + ix + 1], fx)
	return lerpf(a, b, fy)


## A point on the land at fractional grid position g: world XZ with fine relief added on the slopes.
static func _surface(field: Dictionary, relief: FastNoiseLite, g: Vector2) -> Vector3:
	var y := _sample(field, g)
	var wx := g.x * Grid.CELL
	var wz := g.y * Grid.CELL
	if y > 0.2:
		y += relief.get_noise_2d(wx * 3.0, wz * 3.0) * (0.35 + clampf(y * 0.5, 0.0, 1.0) * 1.6)
	return Vector3(wx, y, wz)


## Mountains beyond the walkable fen: noise ridges rising out of the level edge on the south, east and west
## sides, so the valley sits inside real hills and the horizon is never an empty void.
static func _backdrop(fen: Node3D, grid: Grid, material: Material) -> void:
	var ridge := FastNoiseLite.new()
	ridge.seed = 733
	ridge.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	ridge.fractal_type = FastNoiseLite.FRACTAL_RIDGED
	ridge.fractal_octaves = 5
	ridge.frequency = 0.018
	var width := grid.w * Grid.CELL
	var depth_start := START_ROW * Grid.CELL
	var depth_end := grid.h * Grid.CELL
	var margin := 70.0
	var step := 3.5
	var xs := int((width + margin * 2) / step)
	var zs := int((depth_end - depth_start + margin) / step)
	var heights := PackedFloat32Array()
	heights.resize((xs + 1) * (zs + 1))
	for zi in zs + 1:
		for xi in xs + 1:
			var wx := -margin + xi * step
			var wz := depth_start + zi * step
			var out := maxf(maxf(-wx, wx - width), wz - depth_end)
			var h := -4.0
			if out > 0.0:
				var rise := smoothstep(0.0, 26.0, out)
				var rise2 := smoothstep(0.0, 60.0, out)
				h = -0.8 + rise * (7.0 + (ridge.get_noise_2d(wx, wz) * 0.5 + 0.5) * 12.0) + rise2 * 16.0
			heights[zi * (xs + 1) + xi] = h
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var corner := [Vector2i(0, 0), Vector2i(1, 0), Vector2i(1, 1), Vector2i(0, 1)]
	for zi in zs:
		for xi in xs:
			var cs: Array[Vector3] = []
			var any := false
			for o in corner:
				var ix: int = xi + o.x
				var iz: int = zi + o.y
				var hh: float = heights[iz * (xs + 1) + ix]
				any = any or hh > -3.0
				cs.append(Vector3(-margin + ix * step, hh, depth_start + iz * step))
			if not any:
				continue
			for index in [0, 1, 2, 0, 2, 3]:
				st.set_color(Color(0.22, 0.24, 0.21))
				st.add_vertex(cs[index])
	st.generate_normals()
	B.mesh_node(st.commit(), material, Vector3.ZERO, fen).name = "Mountains"


static func _land_color(v: Vector2i, rows: Array, noise: FastNoiseLite) -> Color:
	var tint := Color(0, 0, 0, 1)
	for dy in [-1, 0]:
		for dx in [-1, 0]:
			var row: String = rows[clampi(v.y + dy, START_ROW, rows.size() - 1)]
			match row[clampi(v.x + dx, 0, row.length() - 1)]:
				"^": tint += Color("#615d64")
				"~", "=": tint += Color("#506760")
				":", "P": tint += Color("#9a815e")
				_: tint += Color("#586f47")
	tint *= 0.62 + noise.get_noise_2d(v.x * 2, v.y * 2) * 0.12
	tint.a = 1.0
	return tint


static func _height(v: Vector2i, rows: Array, noise: FastNoiseLite) -> float:
	var ridge := 0
	var wet := 0
	for dy in [-1, 0]:
		for dx in [-1, 0]:
			var row: String = rows[clampi(v.y + dy, START_ROW, rows.size() - 1)]
			var kind := row[clampi(v.x + dx, 0, row.length() - 1)]
			if kind == "^": ridge += 1
			if kind in ["~", "="]: wet += 1
	if wet > 0:
		return (-0.95 + noise.get_noise_2d(v.x * 2, v.y * 2) * 0.2) if wet >= 3 else -0.09
	if ridge >= 3:
		return (2.2 + noise.get_noise_2d(v.x, v.y) * 2.8 + (ridge - 3) * 1.6) * (ridge - 2.0)
	if ridge >= 1:
		return 0.15 * ridge
	return -0.025


static func _cone(radius: float, height: float, tip: float) -> CylinderMesh:
	var mesh := CylinderMesh.new()
	mesh.top_radius = tip
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 11
	mesh.rings = 1
	return mesh


static func _batch(parent: Node3D, mesh: Mesh, material: Material, poses: Array) -> void:
	if poses.is_empty():
		return
	var batch := MultiMesh.new()
	batch.transform_format = MultiMesh.TRANSFORM_3D
	batch.mesh = mesh
	batch.instance_count = poses.size()
	for i in poses.size():
		batch.set_instance_transform(i, poses[i])
	var instances := MultiMeshInstance3D.new()
	instances.multimesh = batch
	if material != null:
		instances.material_override = material
	parent.add_child(instances)


## Each outer edge of a deck gets piles and a sagging rope between them.
static func _bridge_rails(parent: Node3D, rows: Array, c: Vector2i, p: Vector3) -> void:
	var timber := B.mat(Color("#634b3c"))
	var rope := B.mat(Color("#aa8c61"))
	for side in [-1, 1]:
		if rows[c.y][c.x + side] == "=":
			continue
		var edge := p + Vector3(side * 0.92, 0, -0.85)
		for post in 3:
			B.cylinder(0.09, 0.14, 1.6, timber, edge + Vector3(0, 0.13, post * 2.85), parent, 7)
		for span in 2:
			for half in 2:
				var rail := B.box(Vector3(0.055, 0.055, 1.44), rope, edge + Vector3(0, 0.68, span * 2.85 + (half + 0.5) * 1.425), parent)
				rail.rotation.x = 0.14 if half == 0 else -0.14


static func _watchfire(world: Node3D, parent: Node3D, p: Vector3) -> void:
	var fire := Interactable.new()
	fire.kind = "watchfire"
	fire.display_name = "Southwatch Beacon"
	fire.position = p
	parent.add_child(fire)
	var shale := B.mat(Color("#716574"))
	B.cylinder(0.69, 0.9, 0.42, shale, Vector3.UP * 0.21, fire, 8)
	B.cylinder(0.46, 0.62, 1.6, shale, Vector3.UP * 1.22, fire, 8)
	B.cylinder(0.72, 0.32, 0.44, B.mat(Color("#483d40")), Vector3.UP * 2.18, fire, 8)
	B.torch(fire, Vector3.UP * 2.46, Vector3.ZERO, 12.0, 2.0)
	world.call("register_interactable", fire)
