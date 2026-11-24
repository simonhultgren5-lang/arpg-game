extends RefCounted
## A walkability grid shared by the town and the catacombs: pathfinding (A*), line of sight and
## cell <-> world conversion. Cell (x, y) covers world X in [x*CELL, (x+1)*CELL) and Z likewise.

const CELL := 2.0
const SOLID := 0
const FLOOR := 1
const PROP := 2  # walkable-looking but blocked (pillars, graves, tables)

var w := 0
var h := 0
var cells := PackedByteArray()
var astar := AStarGrid2D.new()


func _init(width: int, height: int) -> void:
	w = width
	h = height
	cells.resize(w * h)
	cells.fill(SOLID)


func inside(c: Vector2i) -> bool:
	return c.x >= 0 and c.y >= 0 and c.x < w and c.y < h


func get_cell(c: Vector2i) -> int:
	return cells[c.y * w + c.x] if inside(c) else SOLID


func set_cell(c: Vector2i, v: int) -> void:
	if inside(c):
		cells[c.y * w + c.x] = v


func is_walkable(c: Vector2i) -> bool:
	return get_cell(c) == FLOOR


func cell_of(p: Vector3) -> Vector2i:
	return Vector2i(floori(p.x / CELL), floori(p.z / CELL))


func center(c: Vector2i) -> Vector3:
	return Vector3((c.x + 0.5) * CELL, 0.0, (c.y + 0.5) * CELL)


func walkable_at(p: Vector3) -> bool:
	return is_walkable(cell_of(p))


func build_astar() -> void:
	astar.region = Rect2i(0, 0, w, h)
	astar.cell_size = Vector2(1, 1)
	astar.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
	astar.default_compute_heuristic = AStarGrid2D.HEURISTIC_OCTILE
	astar.default_estimate_heuristic = AStarGrid2D.HEURISTIC_OCTILE
	astar.update()
	for y in h:
		for x in w:
			if not is_walkable(Vector2i(x, y)):
				astar.set_point_solid(Vector2i(x, y), true)


func nearest_walkable(c: Vector2i, max_r := 6) -> Vector2i:
	if is_walkable(c):
		return c
	for r in range(1, max_r + 1):
		var best := Vector2i(-1, -1)
		var best_d := INF
		for dy in range(-r, r + 1):
			for dx in range(-r, r + 1):
				if absi(dx) != r and absi(dy) != r:
					continue
				var n := c + Vector2i(dx, dy)
				if is_walkable(n):
					var d := float(dx * dx + dy * dy)
					if d < best_d:
						best_d = d
						best = n
		if best.x >= 0:
			return best
	return Vector2i(-1, -1)


## World-space path from a to b (excluding the start). Empty if unreachable.
func find_path(a: Vector3, b: Vector3) -> PackedVector3Array:
	var out := PackedVector3Array()
	var ca := nearest_walkable(cell_of(a), 3)
	var cb := nearest_walkable(cell_of(b), 6)
	if ca.x < 0 or cb.x < 0:
		return out
	var ids: Array[Vector2i] = astar.get_id_path(ca, cb)
	if ids.is_empty():
		return out
	# Drop waypoints we can already see past (simple string pulling).
	var points: Array[Vector3] = []
	for i in range(1, ids.size()):
		points.append(center(ids[i]))
	if cb == cell_of(b):
		if points.is_empty():
			points.append(Vector3(b.x, 0.0, b.z))
		else:
			points[points.size() - 1] = Vector3(b.x, 0.0, b.z)
	var from := Vector3(a.x, 0.0, a.z)
	var i := 0
	while i < points.size():
		var j := points.size() - 1
		while j > i and not has_line(from, points[j], 0.45):
			j -= 1
		out.append(points[j])
		from = points[j]
		i = j + 1
	return out


## True when a straight walk from a to b (with some clearance) stays on walkable cells.
func has_line(a: Vector3, b: Vector3, clearance := 0.0) -> bool:
	var d := Vector3(b.x - a.x, 0.0, b.z - a.z)
	var length := d.length()
	if length < 0.01:
		return walkable_at(b)
	var steps := int(ceil(length / 0.4))
	var side := Vector3(-d.z, 0.0, d.x).normalized() * clearance
	for s in range(steps + 1):
		var p := a + d * (float(s) / steps)
		if not walkable_at(p):
			return false
		if clearance > 0.0 and (not walkable_at(p + side) or not walkable_at(p - side)):
			return false
	return true


func random_floor_near(c: Vector2i, r: int, rng: RandomNumberGenerator) -> Vector2i:
	for attempt in 20:
		var n := c + Vector2i(rng.randi_range(-r, r), rng.randi_range(-r, r))
		if is_walkable(n):
			return n
	return c
