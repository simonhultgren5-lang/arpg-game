extends RefCounted
## The approach to Hollowmere. The same authored cells drive the land, bridges and navigation.
## ^ shale and spruce, ~ river, = timber deck, : pilgrim road, F abandoned watchfire.
const START_ROW := 25
const Grid = preload("res://scripts/world/level_grid.gd")
const B = preload("res://scripts/world/build.gd")
const Interactable = preload("res://scripts/world/interactable.gd")


static func build(world: Node3D, parent: Node3D, grid: Grid, rows: Array) -> void:
	var fen := Node3D.new()
	fen.name = "SouthwatchFen"
	parent.add_child(fen)
	var rng := RandomNumberGenerator.new()
	rng.seed = 62487
	var ground := SurfaceTool.new()
	ground.begin(Mesh.PRIMITIVE_TRIANGLES)
	var grass: Array[Transform3D] = []
	var boughs: Array[Transform3D] = []
	var trunks: Array[Transform3D] = []
	var stones: Array[Transform3D] = []
	var rushes: Array[Transform3D] = []
	var flowers: Array[Transform3D] = []
	var decks: Array[Transform3D] = []
	var noise := FastNoiseLite.new()
	noise.seed = 427
	noise.frequency = 0.12
	for y in range(START_ROW, grid.h):
		for x in grid.w:
			var c := Vector2i(x, y)
			var kind: String = rows[y][x]
			var p := grid.center(c)
			var corners: Array[Vector3] = []
			for offset in [Vector2i.ZERO, Vector2i.RIGHT, Vector2i.ONE, Vector2i.DOWN]:
				var v: Vector2i = c + offset
				var jitter := Vector2(noise.get_noise_2d(v.x * 5, v.y * 5), noise.get_noise_2d(v.x * 5 + 90, v.y * 5)) * 0.95
				if v.y == START_ROW:
					jitter = Vector2.ZERO
				corners.append(Vector3(v.x * Grid.CELL + jitter.x, _height(v, rows, noise), v.y * Grid.CELL + jitter.y))
			var shades: Array[Color] = []
			for offset in [Vector2i.ZERO, Vector2i.RIGHT, Vector2i.ONE, Vector2i.DOWN]:
				shades.append(_land_color(c + offset, rows, noise))
			for index in [0, 1, 2, 0, 2, 3]:
				ground.set_color(shades[index])
				ground.add_vertex(corners[index])
			match kind:
				"=":
					if rows[y - 1][x] != "=":
						_bridge_rails(fen, rows, c, p)
					for plank in 5:
						decks.append(Transform3D(Basis.IDENTITY, p + Vector3(0, -0.045, -0.8 + plank * 0.4)))
				"^":
					var h := (corners[0].y + corners[2].y) * 0.5
					var base := p + Vector3.UP * h
					if rng.randf() < 0.28:
						var scale_y := rng.randf_range(0.65, 1.25)
						trunks.append(Transform3D(Basis.IDENTITY.scaled(Vector3(1, scale_y, 1)), base + Vector3.UP * scale_y))
						for tier in 4:
							var radius := 1.0 - tier * 0.19
							var shape := Vector3(radius, scale_y, radius)
							boughs.append(Transform3D(Basis(Vector3.UP, tier * 1.7).scaled(shape), base + Vector3.UP * (1.6 + tier * 0.9) * scale_y))
					else:
						var size := Vector3(rng.randf_range(0.7, 1.5), rng.randf_range(0.5, 1.1), 0.92)
						stones.append(Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(size), base))
				".":
					var patch := p + Vector3(rng.randf_range(-0.7, 0.7), 0.0, rng.randf_range(-0.7, 0.7))
					var bank := false
					for offset in [Vector2i.UP, Vector2i.DOWN, Vector2i.LEFT, Vector2i.RIGHT]:
						var n: Vector2i = c + offset
						if grid.inside(n) and rows[n.y][n.x] == "~":
							bank = true
					for tuft in rng.randi_range(5, 11):
						var at := patch + Vector3(rng.randf_range(-0.38, 0.38), 0.12, rng.randf_range(-0.38, 0.38))
						var length := rng.randf_range(0.64, 1.35)
						var lean := Basis(Vector3.FORWARD, rng.randf_range(-0.48, 0.48)).rotated(Vector3.UP, rng.randf() * TAU)
						grass.append(Transform3D(lean.scaled(Vector3(1, length, 1)), at))
						if bank and tuft % 2 == 0:
							rushes.append(Transform3D(lean, at + Vector3.UP * 0.25))
						elif tuft % 3 == 0 and noise.get_noise_2d(x, y) > 0.1:
							flowers.append(Transform3D(Basis.IDENTITY, at + Vector3.UP * 0.14))
					if bank and rng.randf() < 0.65:
						var size := Vector3(0.55, 0.42, 0.68) * rng.randf_range(0.45, 1.1)
						stones.append(Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(size), patch))
				"F": _watchfire(world, fen, p)
	ground.generate_normals()
	# The fen's ground: the shared earth set in PBR, tinted by the painted vertex colours (grass, mud, scree).
	var earth: StandardMaterial3D = B.pbr("earth", Color.WHITE, 0.22, 1.0, 0.0, 1.3).duplicate()
	earth.vertex_color_use_as_albedo = true
	earth.albedo_color = Color(2.4, 2.4, 2.4)  # the painted vertex colours are dark; lift them to moonlit grass and mud
	B.mesh_node(ground.commit(), earth, Vector3.ZERO, fen)
	var water := ShaderMaterial.new()
	water.shader = preload("res://shaders/fen_river.gdshader")
	var river := PlaneMesh.new()
	river.size = Vector2(grid.w * Grid.CELL, 18.0)
	B.mesh_node(river, water, Vector3(river.size.x / 2, -0.15, (START_ROW + 10.5) * Grid.CELL), fen)
	var plank_mesh := BoxMesh.new()
	plank_mesh.size = Vector3(Grid.CELL, 0.09, 0.38)
	var wood := B.unique_mat(Color("#78654a"))
	B.surface_grain(wood, Vector3(0.08, 0.7, 0.75))
	_batch(fen, plank_mesh, wood, decks)
	_batch(fen, _cone(0.032, 0.94, 0.018), B.mat(Color("#ba995c")), rushes)
	_batch(fen, _cone(0.055, 0.09, 0.09), B.mat(Color("#d4b3b0")), flowers)
	_batch(fen, _cone(0.055, 0.46, 0.0), B.mat(Color("#718352")), grass)
	# Needles read as a dense, soft-lit weave (the cloth set gives them fine normal detail); trunks are bark.
	_batch(fen, _cone(1.28, 2.5, 0.0), B.pbr("cloth", Color(0.42, 0.62, 0.55), 1.4, 1.0, 0.0, 2.0), boughs)
	_batch(fen, _cone(0.2, 2.0, 0.13), B.pbr("timber", Color(0.5, 0.4, 0.36), 1.2, 1.0, 0.0, 1.5), trunks)
	var rock := SphereMesh.new()
	rock.radial_segments = 14
	rock.rings = 7
	rock.radius = 0.85
	rock.height = 1.4
	_batch(fen, rock, B.pbr("stone_wall", Color(0.62, 0.6, 0.68), 0.5, 1.0, 0.0, 1.8), stones)


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
		return -0.80 if wet >= 3 else -0.09
	if ridge >= 3:
		return (1.8 + noise.get_noise_2d(v.x, v.y) * 2.6) * (ridge - 2)
	return -0.025


static func _cone(radius: float, height: float, tip: float) -> CylinderMesh:
	var mesh := CylinderMesh.new()
	mesh.top_radius = tip
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 11
	mesh.rings = 1
	return mesh


static func _batch(parent: Node3D, mesh: Mesh, material: Material, poses: Array[Transform3D]) -> void:
	var batch := MultiMesh.new()
	batch.transform_format = MultiMesh.TRANSFORM_3D
	batch.mesh = mesh
	batch.instance_count = poses.size()
	for i in poses.size():
		batch.set_instance_transform(i, poses[i])
	var instances := MultiMeshInstance3D.new()
	instances.multimesh = batch
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
