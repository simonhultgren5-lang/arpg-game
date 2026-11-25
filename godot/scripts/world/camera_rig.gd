extends Camera3D
## Diablo IV style follow camera: a high, pulled-back three-quarter view in true perspective. It trails
## the hero with a soft spring, leans toward the cursor so you see where you are heading, and tilts
## lower as you zoom in (wheel) so close-ups feel cinematic and far views read tactically.
## Subtle far depth of field and a long lens keep the scene looking like a photographed miniature set
## rather than a flat map.

const DISTANCE := 25.0           # metres from the focus at zoom 1.0
const PITCH_FAR := 56.0          # degrees below the horizon when fully zoomed out
const PITCH_NEAR := 40.0         # ... and fully zoomed in
const LOOK_AHEAD := 3.2          # most the focus slides toward the cursor, metres
const FOCUS_HEIGHT := 1.1        # look at the hero's chest, not their feet

var target: Node3D
var zoom := 1.0
var _zoom_smooth := 1.0
var _trauma := 0.0
var _focus := Vector3.ZERO
var _ahead := Vector3.ZERO


func _ready() -> void:
	fov = 36.0
	near = 0.5
	far = 160.0
	var attrs := CameraAttributesPractical.new()
	attrs.dof_blur_far_enabled = true
	attrs.dof_blur_far_distance = 38.0
	attrs.dof_blur_far_transition = 22.0
	attrs.dof_blur_amount = 0.04
	attributes = attrs
	if target:
		_focus = target.global_position
		_place(1.0, 0.0)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			zoom = clampf(zoom - 0.08, 0.55, 1.35)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			zoom = clampf(zoom + 0.08, 0.55, 1.35)


func shake(amount: float) -> void:
	_trauma = minf(1.0, _trauma + amount)


func _process(delta: float) -> void:
	if target == null or not is_instance_valid(target):
		return
	_place(1.0 - exp(-delta * 6.5), delta)
	_trauma = maxf(0.0, _trauma - delta * 1.8)


## Where the cursor points on the ground, relative to the hero (zero when it can't be worked out).
func _cursor_lean() -> Vector3:
	var vp := get_viewport()
	if vp == null or DisplayServer.get_name() == "headless":
		return Vector3.ZERO
	var mouse := vp.get_mouse_position()
	var rect := vp.get_visible_rect()
	if rect.size.x <= 0.0 or not rect.has_point(mouse):
		return Vector3.ZERO
	var from := project_ray_origin(mouse)
	var dir := project_ray_normal(mouse)
	if absf(dir.y) < 0.001:
		return Vector3.ZERO
	var hit := from + dir * ((target.global_position.y - from.y) / dir.y)
	var lean := hit - target.global_position
	lean.y = 0.0
	return lean.limit_length(LOOK_AHEAD * 2.0) * 0.5


func _place(weight: float, delta: float) -> void:
	_zoom_smooth = lerpf(_zoom_smooth, zoom, 1.0 - exp(-maxf(delta, 0.0) * 8.0)) if delta > 0.0 else zoom
	_ahead = _ahead.lerp(_cursor_lean(), 1.0 - exp(-maxf(delta, 0.0) * 3.0)) if delta > 0.0 else Vector3.ZERO
	var anchor := target.global_position + _ahead
	_focus = _focus.lerp(anchor, weight)
	var shake_off := Vector3.ZERO
	if _trauma > 0.0:
		var t := _trauma * _trauma
		shake_off = Vector3(randf_range(-1, 1), randf_range(-1, 1), randf_range(-1, 1)) * t * 0.3
	var zt := clampf(inverse_lerp(0.55, 1.35, _zoom_smooth), 0.0, 1.0)
	var pitch := deg_to_rad(lerpf(PITCH_NEAR, PITCH_FAR, zt))
	var dist := DISTANCE * _zoom_smooth
	var offset := Vector3(0.0, sin(pitch), cos(pitch)) * dist
	global_position = _focus + Vector3(0, FOCUS_HEIGHT, 0) + offset + shake_off
	look_at(_focus + Vector3(0, FOCUS_HEIGHT, 0) + shake_off * 0.5, Vector3.UP)
