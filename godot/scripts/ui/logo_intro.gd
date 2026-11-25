extends Control
## The launch intro: out of the dark the emblem forges itself in, embers rise, the bell tolls once, a
## gold light runs across DEPTHS OF DARKNESS, then the title screen fades in. About six seconds; any key
## or click skips it. Headless runs (tests, CI's packaged-app QA) go straight to the title screen.

const UiTheme = preload("res://scripts/ui/ui_theme.gd")
const NEXT := "res://scenes/main_menu.tscn"
const SWEEP_SHADER := """
shader_type canvas_item;
// A band of warm light that runs across the screen (screen space, so it reads across every glyph).
uniform float sweep = -0.3;
uniform vec4 gleam : source_color = vec4(1.0, 0.92, 0.7, 1.0);
void fragment() {
	vec4 c = texture(TEXTURE, UV) * COLOR;
	float d = abs(SCREEN_UV.x - sweep + (SCREEN_UV.y - 0.5) * 0.35);
	float band = smoothstep(0.09, 0.0, d);
	c.rgb = mix(c.rgb, gleam.rgb, band * 0.85 * c.a);
	COLOR = c;
}
"""

var _leaving := false
var _emblem: TextureRect
var _title: Label
var _sub: Label
var _veil: ColorRect
var _embers: CPUParticles2D
var _sweep: ShaderMaterial


func _ready() -> void:
	if DisplayServer.get_name() == "headless":
		get_tree().change_scene_to_file.call_deferred(NEXT)
		return
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	theme = UiTheme.make()
	var bg := ColorRect.new()
	bg.color = Color(0.02, 0.016, 0.03)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	# A low ember glow that swells with the toll.
	var glow := TextureRect.new()
	var grad := Gradient.new()
	grad.set_color(0, Color(0.85, 0.33, 0.17, 0.45))
	grad.set_color(1, Color(0.1, 0.06, 0.1, 0.0))
	var gt := GradientTexture2D.new()
	gt.gradient = grad
	gt.fill = GradientTexture2D.FILL_RADIAL
	gt.fill_from = Vector2(0.5, 0.62)
	gt.fill_to = Vector2(0.5, 0.0)
	glow.texture = gt
	glow.set_anchors_preset(Control.PRESET_FULL_RECT)
	glow.stretch_mode = TextureRect.STRETCH_SCALE
	glow.modulate.a = 0.0
	add_child(glow)

	_embers = CPUParticles2D.new()
	_embers.position = Vector2(960, 1120)
	_embers.amount = 90
	_embers.lifetime = 5.0
	_embers.preprocess = 2.0
	_embers.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	_embers.emission_rect_extents = Vector2(900, 20)
	_embers.direction = Vector2(0, -1)
	_embers.spread = 18.0
	_embers.gravity = Vector2(0, -12)
	_embers.initial_velocity_min = 60.0
	_embers.initial_velocity_max = 170.0
	_embers.scale_amount_min = 3.0
	_embers.scale_amount_max = 7.0
	var ramp := Gradient.new()
	ramp.set_color(0, Color(1.0, 0.75, 0.35, 0.0))
	ramp.add_point(0.15, Color(1.0, 0.6, 0.25, 0.95))
	ramp.set_color(1, Color(0.8, 0.2, 0.08, 0.0))
	_embers.color_ramp = ramp
	_embers.emitting = false
	add_child(_embers)

	var col := VBoxContainer.new()
	col.set_anchors_preset(Control.PRESET_CENTER)
	col.offset_left = -700
	col.offset_right = 700
	col.offset_top = -330
	col.offset_bottom = 330
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 18)
	add_child(col)
	_emblem = TextureRect.new()
	_emblem.texture = load("res://assets/textures/branding/emblem.svg")
	_emblem.custom_minimum_size = Vector2(300, 300)
	_emblem.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_emblem.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_emblem.pivot_offset = Vector2(700, 150)
	_emblem.modulate = Color(1, 0.7, 0.5, 0.0)
	_emblem.scale = Vector2.ONE * 0.9
	col.add_child(_emblem)
	_title = UiTheme.label("DEPTHS OF DARKNESS", 74, UiTheme.GOLD)
	_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title.add_theme_constant_override("outline_size", 8)
	_title.add_theme_color_override("font_outline_color", Color(0.05, 0.02, 0.02))
	_sweep = ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = SWEEP_SHADER
	_sweep.shader = sh
	_title.material = _sweep
	_title.modulate.a = 0.0
	col.add_child(_title)
	_sub = UiTheme.label("Act I  ·  The Tolling of Hollowmere", 26, Color(0.82, 0.74, 0.66))
	_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_sub.modulate.a = 0.0
	col.add_child(_sub)
	var hint := UiTheme.label("Press any key", 14, Color(0.5, 0.45, 0.42))
	hint.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	hint.offset_top = -60
	hint.offset_left = -200
	hint.offset_right = 200
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.modulate.a = 0.0
	add_child(hint)
	_veil = ColorRect.new()
	_veil.color = Color(0, 0, 0, 0)
	_veil.set_anchors_preset(Control.PRESET_FULL_RECT)
	_veil.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_veil)

	var tw := create_tween()
	tw.tween_interval(0.5)
	tw.tween_callback(func(): _embers.emitting = true)
	tw.parallel().tween_property(glow, "modulate:a", 0.6, 1.6)
	tw.parallel().tween_property(_emblem, "modulate", Color(1, 1, 1, 1), 1.4).set_trans(Tween.TRANS_SINE)
	tw.parallel().tween_property(_emblem, "scale", Vector2.ONE, 1.8).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_callback(func():
		ActAudio.cue("wells", -10.0)
		var swell := create_tween()
		swell.tween_property(glow, "modulate:a", 1.0, 0.25)
		swell.tween_property(glow, "modulate:a", 0.55, 1.6)
	)
	tw.tween_property(_title, "modulate:a", 1.0, 0.9)
	tw.tween_method(func(x: float): _sweep.set_shader_parameter("sweep", x), -0.3, 1.3, 1.4).set_trans(Tween.TRANS_SINE)
	tw.parallel().tween_property(_sub, "modulate:a", 1.0, 0.8).set_delay(0.4)
	tw.parallel().tween_property(hint, "modulate:a", 1.0, 0.6).set_delay(0.8)
	tw.tween_interval(1.3)
	tw.tween_callback(_leave)


func _input(event: InputEvent) -> void:
	var skip: bool = (event is InputEventKey and event.pressed) or (event is InputEventMouseButton and event.pressed) \
		or (event is InputEventJoypadButton and event.pressed)
	if skip:
		get_viewport().set_input_as_handled()
		_leave()


func _leave() -> void:
	if _leaving:
		return
	_leaving = true
	var tw := create_tween()
	tw.tween_property(_veil, "color:a", 1.0, 0.45)
	tw.tween_callback(func(): get_tree().change_scene_to_file(NEXT))
