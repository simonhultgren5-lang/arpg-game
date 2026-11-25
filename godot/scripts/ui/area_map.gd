extends Control
## A north-up survey of the actual area. Both views sample the same cached terrain.
const INK := Color("#102025")
const BRASS := Color("#d4b482")
const JADE := Color("#95e5ce")
var world: Node3D
signal toggle_requested
var expanded := false
var terrain: ImageTexture
var extent: Vector2
## The map is a live top-down render of the real 3D level (an orthographic camera in a SubViewport that
## shares the game's World3D), so it shows the actual lit streets, roofs and walls. Headless runs (tests,
## servers) have no renderer, so they keep the flat survey image.
var _view: SubViewport
var _cam: Camera3D
var _live := false
var _tick := 0.0

func _ready() -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	clip_contents = true
	var grid = world.grid
	extent = Vector2(grid.w, grid.h)
	var image := Image.create(grid.w, grid.h, false, Image.FORMAT_RGBA8)
	image.fill(INK)
	for y in grid.h:
		for x in grid.w:
			var cell := Vector2i(x, y)
			if grid.is_walkable(cell):
				var edge: bool = not (grid.is_walkable(cell + Vector2i.RIGHT) and grid.is_walkable(cell + Vector2i.LEFT) and grid.is_walkable(cell + Vector2i.UP) and grid.is_walkable(cell + Vector2i.DOWN))
				image.set_pixel(x, y, Color("#918879") if edge else Color("#566569"))
			elif grid.get_cell(cell) == grid.PROP:
				image.set_pixel(x, y, Color("#364549"))
	if Game.area == "town":
		var town = preload("res://scripts/world/town.gd")
		for y in range(town.Fen.START_ROW, grid.h):
			for x in grid.w:
				match town.MAP[y][x]:
					"~": image.set_pixel(x, y, Color("#315b68"))
					"^": image.set_pixel(x, y, Color("#424c43"))
					":", "=", "P": image.set_pixel(x, y, Color("#bea47d"))
	terrain = ImageTexture.create_from_image(image)
	_live = DisplayServer.get_name() != "headless"
	if _live:
		_build_view()
	set_expanded(false)


func _build_view() -> void:
	_view = SubViewport.new()
	_view.own_world_3d = false
	_view.world_3d = world.get_viewport().world_3d
	_view.msaa_3d = Viewport.MSAA_2X
	_view.transparent_bg = false
	_view.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_view.size = Vector2i(420, 340)
	add_child(_view)
	_cam = Camera3D.new()
	_cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	_cam.near = 1.0
	_cam.far = 200.0
	_cam.cull_mask = 1  # layer 1 only: no floating 3D labels
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#0b0d12")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.75, 0.8, 0.95)
	env.ambient_light_energy = 0.9
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.adjustment_enabled = true
	env.adjustment_saturation = 0.85
	_cam.environment = env
	_view.add_child(_cam)

func set_expanded(value: bool) -> void:
	expanded = value
	if expanded:
		set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		offset_left = 48
		offset_right = -48
		offset_top = 32
		offset_bottom = -32
	else:
		set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
		offset_left = -228
		offset_right = -18
		offset_top = 16
		offset_bottom = 182
	tooltip_text = "Close map (M or Esc)" if expanded else "Open area map (M)"
	queue_redraw()

func _process(delta: float) -> void:
	if _live and expanded:
		_view.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	elif _live:
		# The minimap refreshes at ~20 fps: it is a second render of the level, so keep it cheap.
		_tick += delta
		_view.render_target_update_mode = SubViewport.UPDATE_ONCE if _tick >= 0.05 else SubViewport.UPDATE_DISABLED
		if _tick >= 0.05:
			_tick = 0.0
	queue_redraw()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		toggle_requested.emit()
		accept_event()

func _draw() -> void:
	if not terrain or not is_instance_valid(world.player):
		return
	var font := ThemeDB.fallback_font
	draw_rect(Rect2(Vector2.ZERO, size), INK)
	draw_rect(Rect2(Vector2.ONE, size - Vector2.ONE * 2), BRASS.darkened(0.4), false)
	var chart := Rect2(10, 32, size.x - 20, size.y - 60)
	var cell_size: float = world.grid.CELL
	var pos: Vector3 = world.player.global_position
	var hero := Vector2(pos.x, pos.z) / cell_size
	var scale_factor := minf(chart.size.x / extent.x, chart.size.y / extent.y) if expanded else 7.0
	var center := extent * 0.5 if expanded else hero
	var origin := chart.get_center() - center * scale_factor
	if _live and _view:
		# Frame exactly `chart` of the level: scale_factor is pixels per cell, a cell is CELL metres.
		var want := Vector2i((chart.size * (1.0 if expanded else 2.0)).round())
		if _view.size != want and want.x > 8 and want.y > 8:
			_view.size = want  # same aspect as the chart, so the picture is never stretched
		var metres_high := chart.size.y / scale_factor * cell_size
		_cam.size = metres_high
		var look := Vector3(center.x * cell_size, 0.0, center.y * cell_size)
		_cam.global_position = look + Vector3(0, 90, 0)
		_cam.look_at(look, Vector3(0, 0, -1))
		draw_texture_rect(_view.get_texture(), chart, false)
	else:
		var source := Rect2((chart.position - origin) / scale_factor, chart.size / scale_factor).intersection(Rect2(Vector2.ZERO, extent))
		draw_texture_rect_region(terrain, Rect2(origin + source.position * scale_factor, source.size * scale_factor), source)
	for landmark in get_tree().get_nodes_in_group("interactables"):
		var p: Vector3 = landmark.global_position
		var point := origin + Vector2(p.x, p.z) / cell_size * scale_factor
		if chart.grow(-6).has_point(point):
			if landmark.kind == "npc":
				draw_circle(point, 3, BRASS)
			elif landmark.kind == "stone":
				draw_circle(point, 4, Color("#bfa1da"))
			else:
				draw_rect(Rect2(point - Vector2.ONE * 4, Vector2.ONE * 8), JADE, false, 2)
	var at := origin + hero * scale_factor
	var direction: Vector3 = world.player.facing()
	var tip := Vector2(direction.x, direction.z).normalized()
	var wing := tip.orthogonal()
	draw_colored_polygon(PackedVector2Array([at + tip * 8, at - tip * 5 + wing * 5, at - tip * 5 - wing * 5]), Color.WHITE)
	draw_string(font, Vector2(12, 23), Game.area_title(), HORIZONTAL_ALIGNMENT_LEFT, size.x - 60, 17, BRASS)
	draw_string(font, Vector2(size.x - 30, 23), "N", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, JADE)
	var caption := "You  ▲     Townsfolk  ●     Passage  □     Oath stone  ●             M / Esc   Close" if expanded else "M   Area map     ·     H   Controls"
	draw_string(font, Vector2(12, size.y - 9), caption, HORIZONTAL_ALIGNMENT_LEFT, size.x - 20, 12, Color.WHITE)
