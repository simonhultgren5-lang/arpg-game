extends Control
## Title screen: the emblem, the character handed over by the launcher and "Enter Hollowmere".
## Started without a launcher character (for example from the Godot editor), it offers a test hero
## of each class instead.

const UiTheme = preload("res://scripts/ui/ui_theme.gd")
const Classes = preload("res://scripts/data/classes.gd")

var _status: Label
var _hero_line: Label
var _buttons: VBoxContainer
var _busy := false
var _ember_t := 0.0
var _glow: TextureRect
var _portrait := TextureRect.new()


func _ready() -> void:
	ActAudio.play_area("title")
	get_tree().paused = false
	set_anchors_preset(Control.PRESET_FULL_RECT)
	theme = UiTheme.make()
	# Background: purple-black with an ember glow rising from below.
	var bg := ColorRect.new()
	bg.color = Color(0.047, 0.039, 0.071)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	_glow = TextureRect.new()
	var grad := Gradient.new()
	grad.set_color(0, Color(0.85, 0.33, 0.17, 0.35))
	grad.set_color(1, Color(0.14, 0.1, 0.18, 0.0))
	var gt := GradientTexture2D.new()
	gt.gradient = grad
	gt.fill = GradientTexture2D.FILL_RADIAL
	gt.fill_from = Vector2(0.5, 1.0)
	gt.fill_to = Vector2(0.5, 0.15)
	gt.width = 256
	gt.height = 256
	_glow.texture = gt
	_glow.set_anchors_preset(Control.PRESET_FULL_RECT)
	_glow.stretch_mode = TextureRect.STRETCH_SCALE
	add_child(_glow)

	_portrait.anchor_right = 0.43
	_portrait.anchor_bottom = 1.0
	_portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_portrait.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_portrait)
	_show_portrait(str(Boot.character.get("heroClass", "warrior")))
	var col := VBoxContainer.new()
	col.set_anchors_preset(Control.PRESET_CENTER)
	col.anchor_left = 0.67
	col.anchor_right = 0.67
	col.anchor_top = 0.5
	col.anchor_bottom = 0.5
	col.offset_left = -300
	col.offset_right = 300
	col.offset_top = -400
	col.offset_bottom = 400
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 12)
	add_child(col)

	var emblem := TextureRect.new()
	emblem.texture = load("res://assets/textures/branding/emblem.svg")
	emblem.custom_minimum_size = Vector2(260, 260)
	emblem.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	emblem.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	col.add_child(emblem)
	var title := UiTheme.label("DEPTHS OF DARKNESS", 52, UiTheme.GOLD)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_constant_override("outline_size", 10)
	title.add_theme_color_override("font_outline_color", Color(0.25, 0.08, 0.05))
	col.add_child(title)
	var sub := UiTheme.label("ACT I  ·  THE TOLLING OF HOLLOWMERE", 18, UiTheme.GOLD_DIM)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(sub)
	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 18)
	col.add_child(spacer)
	_hero_line = UiTheme.label("", 20)
	_hero_line.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(_hero_line)
	_buttons = VBoxContainer.new()
	_buttons.add_theme_constant_override("separation", 8)
	_buttons.custom_minimum_size = Vector2(360, 0)
	_buttons.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	col.add_child(_buttons)
	_status = UiTheme.label("", 15, Color(0.85, 0.55, 0.45))
	_status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	col.add_child(_status)

	var ver := UiTheme.label("v%s" % ProjectSettings.get_setting("application/config/version", "0.1.0"), 13, Color(0.45, 0.4, 0.45))
	ver.anchor_top = 1.0
	ver.anchor_bottom = 1.0
	ver.offset_left = 16
	ver.offset_top = -30
	add_child(ver)
	_show_buttons()


func _process(delta: float) -> void:
	_ember_t += delta
	_glow.modulate.a = 0.85 + sin(_ember_t * 1.3) * 0.15


func _show_buttons() -> void:
	for c in _buttons.get_children():
		c.queue_free()
	if Boot.boot_error != "":
		_status.text = Boot.boot_error
	if Boot.from_launcher:
		var cls := Classes.get_class_data(Boot.character["heroClass"])
		_hero_line.text = "%s  ·  %s" % [Boot.character["name"], cls["title"]]
		_hero_line.add_theme_color_override("font_color", Color.html(Boot.character["color"]).lightened(0.35))
		_add_button("Enter Hollowmere", _start)
	else:
		_hero_line.text = "No hero from the launcher: choose a test hero"
		for c in ["warrior", "pyromancer", "rogue"]:
			var data := Classes.get_class_data(c)
			var b := _add_button("%s  —  %s" % [data["title"], data["blurb"]], func():
				Boot.set_test_hero(c)
				_start()
			)
			b.custom_minimum_size = Vector2(560, 0)
			b.mouse_entered.connect(_show_portrait.bind(c))
			b.focus_entered.connect(_show_portrait.bind(c))
	_add_button("Field guide", func(): get_tree().change_scene_to_file("res://scenes/field_guide.tscn"))
	_add_button("Settings", _open_settings)
	_add_button("Quit", func(): Game.quit_game())


var _settings: Control


func _open_settings() -> void:
	if _settings == null:
		_settings = preload("res://scripts/ui/settings_panel.gd").new()
		_settings.theme = preload("res://scripts/ui/ui_theme.gd").make()
		_settings.set_anchors_preset(Control.PRESET_CENTER)
		_settings.offset_left = -400
		_settings.offset_right = 400
		_settings.offset_top = -320
		_settings.offset_bottom = 320
		add_child(_settings)
	_settings.visible = true


func _show_portrait(id: String) -> void:
	if id not in ["warrior", "rogue", "pyromancer"]:
		id = "warrior"
	_portrait.texture = load("res://assets/textures/field_guide/previews/%s.jpg" % id)


func _add_button(text: String, cb: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.pressed.connect(cb)
	_buttons.add_child(b)
	return b


func _start() -> void:
	if _busy:
		return
	_busy = true
	_status.text = "Loading the hero..." if not Boot.is_online() else "Loading the hero from %s..." % Boot.server_url
	await Game.load_hero()
	get_tree().change_scene_to_file("res://scenes/world.tscn")
