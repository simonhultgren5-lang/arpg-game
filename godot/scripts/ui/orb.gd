extends Control
## A health or mana orb: a glass sphere that drains from the top.

var fill := 1.0
var color := Color(0.75, 0.1, 0.1)
var text := ""


var _glass: ColorRect
var _mat: ShaderMaterial
var _t := 0.0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	_mat = ShaderMaterial.new()
	_mat.shader = preload("res://shaders/orb.gdshader")
	_glass = ColorRect.new()
	_glass.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_glass.show_behind_parent = true  # the glass sits under the number
	_glass.material = _mat
	_glass.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_glass)
	_sync()


func _process(delta: float) -> void:
	_t += delta
	_mat.set_shader_parameter("t", _t)


func _sync() -> void:
	if _mat:
		_mat.set_shader_parameter("liquid", color)
		_mat.set_shader_parameter("fill", clampf(fill, 0.0, 1.0))


func _draw() -> void:
	var r := minf(size.x, size.y) * 0.5
	var c := size * 0.5
	if text != "":
		var font := get_theme_default_font()
		var fs := 16
		var w := font.get_string_size(text, HORIZONTAL_ALIGNMENT_CENTER, -1, fs).x
		var pos := Vector2(c.x - w * 0.5, c.y + fs * 0.35)
		draw_string_outline(font, pos, text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 4, Color(0, 0, 0, 0.9))
		draw_string(font, pos, text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 0.95, 0.9))


func set_values(f: float, t: String) -> void:
	if absf(f - fill) > 0.001 or t != text:
		fill = f
		text = t
		_sync()
		queue_redraw()
