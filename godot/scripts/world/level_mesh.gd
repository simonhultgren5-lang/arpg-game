extends RefCounted
## Turns a LevelGrid into geometry: multimesh floor tiles, wall blocks around the walkable area and
## merged box colliders for the walls.

const LevelGrid = preload("res://scripts/world/level_grid.gd")
const WALL_SHADER = preload("res://shaders/wall.gdshader")


## floor_color(cell) -> Color is called per floor tile. Returns the wall ShaderMaterial (the world
## updates its player_pos every frame).
static func build(grid: LevelGrid, parent: Node3D, wall_height: float, wall_color: Color, floor_color: Callable, rng: RandomNumberGenerator) -> ShaderMaterial:
	var cell := LevelGrid.CELL
	# ---- floor tiles (every non-solid cell, props included)
	var floor_cells: Array[Vector2i] = []
	for y in grid.h:
		for x in grid.w:
			if grid.get_cell(Vector2i(x, y)) != LevelGrid.SOLID:
				floor_cells.append(Vector2i(x, y))
	var fm := MultiMesh.new()
	fm.transform_format = MultiMesh.TRANSFORM_3D
	fm.use_colors = true
	var tile := BoxMesh.new()
	tile.size = Vector3(cell * 0.97, 0.2, cell * 0.97)
	fm.mesh = tile
	fm.instance_count = floor_cells.size()
	for i in floor_cells.size():
		var c: Vector2i = floor_cells[i]
		var p := grid.center(c) + Vector3(0, -0.1 - rng.randf() * 0.04, 0)
		fm.set_instance_transform(i, Transform3D(Basis(Vector3.UP, rng.randi_range(0, 3) * PI * 0.5), p))
		fm.set_instance_color(i, floor_color.call(c))
	var fmi := MultiMeshInstance3D.new()
	fmi.multimesh = fm
	var floor_mat := StandardMaterial3D.new()
	floor_mat.vertex_color_use_as_albedo = true
	floor_mat.roughness = 0.95
	fmi.material_override = floor_mat
	fmi.name = "Floor"
	parent.add_child(fmi)
	# Dark ground under everything so gaps never show the void.
	var under := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(grid.w * cell + 40, grid.h * cell + 40)
	under.mesh = plane
	under.position = Vector3(grid.w * cell * 0.5, -0.25, grid.h * cell * 0.5)
	var under_mat := StandardMaterial3D.new()
	under_mat.albedo_color = Color(0.03, 0.025, 0.04)
	under.material_override = under_mat
	parent.add_child(under)

	# ---- wall blocks: solid cells that touch a non-solid cell
	var wall_cells: Array[Vector2i] = []
	var is_wall := PackedByteArray()
	is_wall.resize(grid.w * grid.h)
	for y in grid.h:
		for x in grid.w:
			var c := Vector2i(x, y)
			if grid.get_cell(c) != LevelGrid.SOLID:
				continue
			var touches := false
			for dy in range(-1, 2):
				for dx in range(-1, 2):
					var n := c + Vector2i(dx, dy)
					if grid.inside(n) and grid.get_cell(n) != LevelGrid.SOLID:
						touches = true
			if touches:
				wall_cells.append(c)
				is_wall[y * grid.w + x] = 1
	var wm := MultiMesh.new()
	wm.transform_format = MultiMesh.TRANSFORM_3D
	var block := BoxMesh.new()
	block.size = Vector3(cell, wall_height, cell)
	wm.mesh = block
	wm.instance_count = wall_cells.size()
	for i in wall_cells.size():
		var h_jitter := rng.randf_range(-0.15, 0.25)
		var t := Transform3D(Basis().scaled(Vector3(1, 1.0 + h_jitter / wall_height, 1)), grid.center(wall_cells[i]) + Vector3(0, (wall_height + h_jitter) * 0.5, 0))
		wm.set_instance_transform(i, t)
	var wmi := MultiMeshInstance3D.new()
	wmi.multimesh = wm
	var wall_mat := ShaderMaterial.new()
	wall_mat.shader = WALL_SHADER
	wall_mat.set_shader_parameter("albedo", wall_color)
	wmi.material_override = wall_mat
	wmi.name = "Walls"
	parent.add_child(wmi)

	# ---- collision: merge horizontal runs of solid cells next to the walkable area
	var body := StaticBody3D.new()
	body.name = "WallCollision"
	body.collision_layer = 1
	body.collision_mask = 0
	parent.add_child(body)
	for y in grid.h:
		var x := 0
		while x < grid.w:
			if is_wall[y * grid.w + x] == 1 or (grid.get_cell(Vector2i(x, y)) == LevelGrid.PROP):
				var start := x
				var kind := 1 if is_wall[y * grid.w + x] == 1 else 2
				while x < grid.w and ((kind == 1 and is_wall[y * grid.w + x] == 1) or (kind == 2 and grid.get_cell(Vector2i(x, y)) == LevelGrid.PROP)):
					x += 1
				var length := x - start
				var shape := BoxShape3D.new()
				var shrink := 0.0 if kind == 1 else 0.35
				shape.size = Vector3(length * cell - shrink, 3.0, cell - shrink)
				var cs := CollisionShape3D.new()
				cs.shape = shape
				cs.position = Vector3((start + length * 0.5) * cell, 1.5, (y + 0.5) * cell)
				body.add_child(cs)
			else:
				x += 1
	return wall_mat
