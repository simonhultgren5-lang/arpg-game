extends PanelContainer
## Settings (Esc → Settings, or the title screen): Graphics, Audio, Gameplay and Controls tabs.
## Every change applies at once and is saved by the Settings autoload. In Controls, click a key and
## press the new key or mouse button (Esc cancels).

signal closed

const UiTheme = preload("res://scripts/ui/ui_theme.gd")

var _tabs: TabContainer
var _waiting := ""  # action waiting for a new key
var _key_buttons := {}
var _note: Label


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	process_mode = Node.PROCESS_MODE_ALWAYS
	custom_minimum_size = Vector2(780, 620)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	add_child(v)
	var top := HBoxContainer.new()
	v.add_child(top)
	var title := UiTheme.label("Settings", 26, UiTheme.GOLD)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(title)
	var close := Button.new()
	close.text = "✕"
	close.pressed.connect(close_panel)
	top.add_child(close)
	_tabs = TabContainer.new()
	_tabs.custom_minimum_size = Vector2(740, 470)
	_tabs.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(_tabs)
	_tabs.add_child(_graphics())
	_tabs.add_child(_audio())
	_tabs.add_child(_gameplay())
	_tabs.add_child(_controls())
	var foot := HBoxContainer.new()
	foot.add_theme_constant_override("separation", 10)
	v.add_child(foot)
	_note = UiTheme.label("Changes are saved on this PC.", 14, UiTheme.MUTED)
	_note.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	foot.add_child(_note)
	var reset := Button.new()
	reset.text = "Reset to defaults"
	reset.pressed.connect(func():
		Settings.reset()
		_rebuild()
	)
	foot.add_child(reset)
	var done := Button.new()
	done.text = "Done"
	done.pressed.connect(close_panel)
	foot.add_child(done)


func close_panel() -> void:
	_waiting = ""
	visible = false
	closed.emit()


func _rebuild() -> void:
	var at := _tabs.current_tab
	for c in _tabs.get_children():
		_tabs.remove_child(c)
		c.queue_free()
	_key_buttons.clear()
	_tabs.add_child(_graphics())
	_tabs.add_child(_audio())
	_tabs.add_child(_gameplay())
	_tabs.add_child(_controls())
	_tabs.current_tab = at


func _page(name: String) -> VBoxContainer:
	var p := VBoxContainer.new()
	p.name = name
	p.add_theme_constant_override("separation", 12)
	return p


func _row(page: Control, label: String, control: Control, tip := "") -> void:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 16)
	var l := UiTheme.label(label, 17)
	l.custom_minimum_size = Vector2(300, 0)
	h.add_child(l)
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(control)
	if tip != "":
		h.tooltip_text = tip
		l.tooltip_text = tip
		l.mouse_filter = Control.MOUSE_FILTER_PASS
	page.add_child(h)


func _choice(section: String, key: String, options: Array, names: Array) -> OptionButton:
	var o := OptionButton.new()
	for i in options.size():
		o.add_item(names[i], i)
	o.selected = maxi(0, options.find(str(Settings.get_value(section, key))))
	o.item_selected.connect(func(i): Settings.set_value(section, key, options[i]))
	return o


func _check(section: String, key: String, text: String) -> CheckBox:
	var c := CheckBox.new()
	c.text = text
	c.button_pressed = bool(Settings.get_value(section, key))
	c.toggled.connect(func(on): Settings.set_value(section, key, on))
	return c


func _slider(section: String, key: String, lo: float, hi: float, step: float, fmt: String) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 10)
	var s := HSlider.new()
	s.min_value = lo
	s.max_value = hi
	s.step = step
	s.value = float(Settings.get_value(section, key))
	s.custom_minimum_size = Vector2(300, 24)
	s.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	s.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var l := UiTheme.label(fmt % s.value, 16, UiTheme.GOLD)
	l.custom_minimum_size = Vector2(60, 0)
	s.value_changed.connect(func(x):
		l.text = fmt % x
		Settings.set_value(section, key, x if step < 1.0 else int(x))
	)
	h.add_child(s)
	h.add_child(l)
	return h


func _graphics() -> Control:
	var p := _page("Graphics")
	_row(p, "Window", _choice("graphics", "window", Settings.WINDOW_MODES, ["Windowed", "Borderless fullscreen", "Fullscreen"]))
	_row(p, "Resolution (windowed)", _choice("graphics", "resolution", Settings.RESOLUTIONS, Settings.RESOLUTIONS))
	_row(p, "Quality", _choice("graphics", "quality", Settings.QUALITIES, ["Low (fastest)", "Medium", "High", "Ultra (4K)"]),
		"Low turns off ambient occlusion, glow and volumetric fog and lowers anti-aliasing.")
	_row(p, "Shadows", _check("graphics", "shadows", "On"))
	_row(p, "Brightness", _slider("graphics", "brightness", 0.6, 1.5, 0.05, "%.2f"))
	_row(p, "Vertical sync", _check("graphics", "vsync", "On"), "Stops tearing; may add a little input delay.")
	return p


func _audio() -> Control:
	var p := _page("Audio")
	for pair in [["master", "Master volume"], ["music", "Music"], ["effects", "Spells and effects"], ["voice", "Voices"], ["ambience", "Ambience"]]:
		_row(p, pair[1], _slider("audio", pair[0], 0, 100, 1, "%d"))
	return p


func _gameplay() -> Control:
	var p := _page("Gameplay")
	_row(p, "Damage numbers", _check("gameplay", "damage_numbers", "Show"))
	_row(p, "Screen shake", _check("gameplay", "screen_shake", "On"))
	_row(p, "Enemy life bars", _check("gameplay", "enemy_bars", "Always show over wounded or angry foes"))
	_row(p, "Loot names", _check("gameplay", "loot_labels", "Show names over items on the ground"))
	return p


func _controls() -> Control:
	var scroll := ScrollContainer.new()
	scroll.name = "Controls"
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var p := _page("list")
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(p)
	p.add_child(UiTheme.label("Click a key, then press the new key or mouse button (not the left button). Esc cancels.", 14, UiTheme.MUTED))
	for a in Settings.ACTIONS:
		var b := Button.new()
		b.text = Settings.key_text(a[0])
		b.custom_minimum_size = Vector2(160, 0)
		var action: String = a[0]
		b.pressed.connect(func():
			_waiting = action
			b.text = "press a key…"
		)
		_key_buttons[action] = b
		_row(p, a[1], b)
	return scroll


func _input(event: InputEvent) -> void:
	if _waiting == "" or not visible:
		return
	var press: bool = (event is InputEventKey and event.pressed and not event.echo) or (event is InputEventMouseButton and event.pressed)
	if not press:
		return
	get_viewport().set_input_as_handled()
	if event is InputEventKey and event.physical_keycode == KEY_ESCAPE:
		_key_buttons[_waiting].text = Settings.key_text(_waiting)
		_waiting = ""
		return
	# The wheel scrolls, and a left click is just a click (it would otherwise take move/attack away).
	if event is InputEventMouseButton and event.button_index in [MOUSE_BUTTON_LEFT, MOUSE_BUTTON_WHEEL_UP, MOUSE_BUTTON_WHEEL_DOWN]:
		return
	var action := _waiting
	_waiting = ""
	var lost := Settings.rebind(action, event)
	for a in _key_buttons:
		_key_buttons[a].text = Settings.key_text(a)
	_note.text = "Changes are saved on this PC." if lost == "" else "That key was taken from \"%s\"; give it a new one." % _action_name(lost)


func _action_name(id: String) -> String:
	for a in Settings.ACTIONS:
		if a[0] == id:
			return a[1]
	return id


## True while waiting for a key (Esc then belongs to the panel, not the pause menu).
func is_capturing() -> bool:
	return _waiting != ""
