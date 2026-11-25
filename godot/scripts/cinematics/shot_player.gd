extends Node
## Plays a data-driven cinematic: a list of camera shots with moves, lens changes, captions and fades.
##
## res://data/cinematics/<id>.json:
##   {"title": "...", "shots": [{
##       "duration": 6.0,
##       "from": [x, y, z], "to": [x, y, z],            camera position at the start and end (metres)
##       "look_from": [x, y, z], "look_to": [x, y, z],  the point the camera aims at
##       "fov_from": 45, "fov_to": 38,                  lens, degrees
##       "ease": "smooth" | "linear",
##       "caption": "text", "fade_in": 0.6, "fade_out": 0.6 }]}
## Space, Enter or Esc skips. The game is not paused, so keep the hero safe (the console can `god on`).

signal finished

const DIR := "res://data/cinematics/"

var _shots: Array = []
var _cam: Camera3D
var _previous: Camera3D
var _caption: Label
var _fade: ColorRect
var _bars: Array[ColorRect] = []
var _skip := false
var _hud: CanvasLayer


static func list() -> PackedStringArray:
	var out := PackedStringArray()
	var dir := DirAccess.open(DIR)
	if dir:
		for f in dir.get_files():
			if f.ends_with(".json"):
				out.append(f.get_basename())
	return out


## Starts the named cinematic in `world` (any Node in the tree). Returns the player, or null if missing.
static func play(world: Node, id: String) -> Node:
	var path := DIR + id + ".json"
	if not FileAccess.file_exists(path):
		return null
	var data = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not data is Dictionary:
		return null
	var player := new()
	player._shots = data.get("shots", [])
	world.add_child(player)
	player._run()
	return player


func _v(a: Array) -> Vector3:
	return Vector3(float(a[0]), float(a[1]), float(a[2]))


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode in [KEY_SPACE, KEY_ENTER, KEY_ESCAPE]:
		_skip = true
		get_viewport().set_input_as_handled()


func _run() -> void:
	_previous = get_viewport().get_camera_3d()
	_hud = get_parent().get("hud") if get_parent() else null
	if _hud:
		_hud.visible = false  # the interface stays out of the shot
	var layer := CanvasLayer.new()
	layer.layer = 90
	add_child(layer)
	for top in [true, false]:
		var bar := ColorRect.new()
		bar.color = Color.BLACK
		bar.set_anchors_preset(Control.PRESET_TOP_WIDE if top else Control.PRESET_BOTTOM_WIDE)
		bar.custom_minimum_size = Vector2(0, 90)
		bar.offset_bottom = 90 if top else 0
		bar.offset_top = 0 if top else -90
		bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
		layer.add_child(bar)
		_bars.append(bar)
	_caption = Label.new()
	_caption.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	_caption.offset_top = -80
	_caption.offset_bottom = -20
	_caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_caption.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_caption.add_theme_font_size_override("font_size", 24)
	_caption.add_theme_color_override("font_color", Color(0.93, 0.85, 0.7))
	_caption.add_theme_color_override("font_outline_color", Color.BLACK)
	_caption.add_theme_constant_override("outline_size", 8)
	layer.add_child(_caption)
	_fade = ColorRect.new()
	_fade.color = Color(0, 0, 0, 1)
	_fade.set_anchors_preset(Control.PRESET_FULL_RECT)
	_fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(_fade)
	_cam = Camera3D.new()
	add_child(_cam)
	_cam.current = true
	for shot in _shots:
		if _skip:
			break
		await _play_shot(shot)
	_cam.current = false
	if is_instance_valid(_hud):
		_hud.visible = true
	if is_instance_valid(_previous):
		_previous.make_current()
	finished.emit()
	queue_free()


func _play_shot(shot: Dictionary) -> void:
	var duration := maxf(float(shot.get("duration", 4.0)), 0.1)
	var p0 := _v(shot.get("from", [0, 5, 0]))
	var p1 := _v(shot.get("to", shot.get("from", [0, 5, 0])))
	var l0 := _v(shot.get("look_from", [0, 0, 0]))
	var l1 := _v(shot.get("look_to", shot.get("look_from", [0, 0, 0])))
	var f0 := float(shot.get("fov_from", 45.0))
	var f1 := float(shot.get("fov_to", f0))
	var smooth: bool = str(shot.get("ease", "smooth")) == "smooth"
	var fade_in := float(shot.get("fade_in", 0.5))
	var fade_out := float(shot.get("fade_out", 0.5))
	_caption.text = str(shot.get("caption", ""))
	var t := 0.0
	while t < duration and not _skip:
		var u := t / duration
		var k := smoothstep(0.0, 1.0, u) if smooth else u
		_cam.global_position = p0.lerp(p1, k)
		_cam.look_at(l0.lerp(l1, k), Vector3.UP)
		_cam.fov = lerpf(f0, f1, k)
		var a := 0.0
		if fade_in > 0.0:
			a = maxf(a, 1.0 - t / fade_in)
		if fade_out > 0.0:
			a = maxf(a, 1.0 - (duration - t) / fade_out)
		_fade.color.a = clampf(a, 0.0, 1.0)
		await get_tree().process_frame
		t += get_process_delta_time()
