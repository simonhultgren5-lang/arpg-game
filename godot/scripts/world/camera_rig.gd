extends Camera3D
## Three-quarter top-down camera that follows the hero. Mouse wheel zooms.

const OFFSET := Vector3(0, 15.5, 11.0)

var target: Node3D
var zoom := 1.0
var _trauma := 0.0
var _focus := Vector3.ZERO


func _ready() -> void:
	fov = 40.0
	near = 0.5
	far = 120.0
	if target:
		_focus = target.global_position
		_place(1.0)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			zoom = clampf(zoom - 0.08, 0.6, 1.35)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			zoom = clampf(zoom + 0.08, 0.6, 1.35)


func shake(amount: float) -> void:
	_trauma = minf(1.0, _trauma + amount)


func _process(delta: float) -> void:
	if target == null or not is_instance_valid(target):
		return
	_place(1.0 - exp(-delta * 8.0))
	_trauma = maxf(0.0, _trauma - delta * 1.8)


func _place(weight: float) -> void:
	_focus = _focus.lerp(target.global_position, weight)
	var shake_off := Vector3.ZERO
	if _trauma > 0.0:
		var t := _trauma * _trauma
		shake_off = Vector3(randf_range(-1, 1), randf_range(-1, 1), randf_range(-1, 1)) * t * 0.35
	global_position = _focus + OFFSET * zoom + shake_off
	look_at(_focus + Vector3(0, 1.0, 0) + shake_off * 0.5, Vector3.UP)
