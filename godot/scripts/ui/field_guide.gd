extends Control

const UiTheme = preload("res://scripts/ui/ui_theme.gd")
const SECTIONS := {
	"Heroes": {"warrior": "Warrior", "rogue": "Rogue", "pyromancer": "Pyromancer"},
	"The Sunken Crypt": {"hollow": "Hollow", "archer": "Bone Archer", "crawler": "Grave Crawler", "boss": "Hask, the Bell-Warden"},
	"Hollowmere": {"maud": "Sister Maud", "edda": "Edda Varge", "corwin": "Old Corwin"},
	"Objects": {"sconce": "Torch sconce", "barrel": "Oak barrel", "sarcophagus": "Sarcophagus"},
}

var _art := TextureRect.new()
var _caption: Label


func _ready() -> void:
	theme = UiTheme.make()
	var bg := ColorRect.new()
	bg.color = Color("#141217")
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var layout := HBoxContainer.new()
	layout.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	layout.offset_left = 54
	layout.offset_right = -54
	layout.offset_top = 32
	layout.offset_bottom = -32
	layout.add_theme_constant_override("separation", 48)
	add_child(layout)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size.x = 360
	layout.add_child(scroll)
	var index := VBoxContainer.new()
	index.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(index)
	var back := Button.new()
	back.text = "Return to title"
	back.pressed.connect(_back)
	index.add_child(back)
	index.add_child(UiTheme.label("Field guide", 36, UiTheme.GOLD))
	var group := ButtonGroup.new()
	for section: String in SECTIONS:
		index.add_child(UiTheme.label(section, 20, UiTheme.GOLD_DIM))
		for id: String in SECTIONS[section]:
			var b := Button.new()
			b.text = SECTIONS[section][id]
			b.alignment = HORIZONTAL_ALIGNMENT_LEFT
			b.toggle_mode = true
			b.button_group = group
			b.button_pressed = id == "warrior"
			b.pressed.connect(_select.bind(id, b.text))
			index.add_child(b)
	var view := VBoxContainer.new()
	view.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	layout.add_child(view)
	_art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_art.size_flags_vertical = Control.SIZE_EXPAND_FILL
	view.add_child(_art)
	_caption = UiTheme.label("", 24, UiTheme.GOLD)
	_caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	view.add_child(_caption)
	_select("warrior", "Warrior")


func _select(id: String, title: String) -> void:
	_art.texture = load("res://assets/textures/field_guide/%s.jpg" % id)
	_caption.text = title
	ActAudio.voice(self, id, true)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		_back()


func _back() -> void:
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
