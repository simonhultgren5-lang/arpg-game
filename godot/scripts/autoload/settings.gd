extends Node
## Settings: graphics, audio, gameplay and key bindings, saved to user://settings.cfg on this PC.
## Values apply the moment they change (set_value). Boot sets the default keys first; this autoload
## loads after it, remembers those defaults and applies any rebinds on top.
##   Settings.get_value("gameplay", "screen_shake")   -> true
##   Settings.set_value("audio", "music", 40)          (0-100)
##   Settings.rebind("potion", event)                  -> the action that lost that key, or ""

signal changed(section: String, key: String)

const DEFAULTS := {
	"graphics": {"window": "windowed", "resolution": "1920x1080", "quality": "high", "shadows": true,
		"brightness": 1.0, "vsync": true},
	"audio": {"master": 80, "music": 70, "effects": 85, "voice": 90, "ambience": 70},
	"gameplay": {"damage_numbers": true, "screen_shake": true, "enemy_bars": false, "loot_labels": true},
}
const WINDOW_MODES := ["windowed", "borderless", "fullscreen"]
const RESOLUTIONS := ["1280x720", "1600x900", "1920x1080", "2560x1440", "3840x2160"]
const QUALITIES := ["low", "medium", "high"]
## Audio buses (ActAudio routes each kind of sound to one).
const BUSES := {"master": "Master", "music": "Music", "effects": "Effects", "voice": "Voice", "ambience": "Ambience"}
## The actions a player can rebind, in the order the Controls tab lists them, with their names.
const ACTIONS := [
	["bar_1", "Skill: left mouse slot"], ["bar_2", "Skill: right mouse slot"], ["bar_3", "Skill slot 1"],
	["bar_4", "Skill slot 2"], ["bar_5", "Skill slot 3"], ["bar_6", "Skill slot 4"], ["potion", "Drink a draught"],
	["interact", "Talk / use"], ["force_attack", "Attack in place (hold)"], ["move_up", "Move up"],
	["move_down", "Move down"], ["move_left", "Move left"], ["move_right", "Move right"],
	["inventory", "Character and bag"], ["skills", "Skills"], ["quests", "Quest log"], ["map", "Area map"],
]

## Where settings are saved (tests point this elsewhere).
var path := "user://settings.cfg"
var _values := {}
var _default_keys := {}
var _keys := {}  # action -> [descriptor strings] the player chose


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for a in ACTIONS:
		if InputMap.has_action(a[0]):
			_default_keys[a[0]] = InputMap.action_get_events(a[0]).map(func(e): return _describe(e)).filter(func(d): return d != "")
	_ensure_buses()
	load_settings()


func get_value(section: String, key: String) -> Variant:
	return _values.get(section, {}).get(key, DEFAULTS.get(section, {}).get(key))


func set_value(section: String, key: String, value: Variant) -> void:
	if not _values.has(section):
		_values[section] = {}
	_values[section][key] = value
	_apply(section, key)
	save()
	changed.emit(section, key)


func load_settings() -> void:
	_values = {}
	for section in DEFAULTS:
		_values[section] = (DEFAULTS[section] as Dictionary).duplicate()
	_keys = {}
	var cfg := ConfigFile.new()
	if cfg.load(path) == OK:
		for section in DEFAULTS:
			for key in DEFAULTS[section]:
				if cfg.has_section_key(section, key):
					_values[section][key] = cfg.get_value(section, key)
		if cfg.has_section("controls"):
			for action in cfg.get_section_keys("controls"):
				if _default_keys.has(action):
					_keys[action] = Array(cfg.get_value("controls", action, []))
	_apply_keys()
	for section in DEFAULTS:
		for key in DEFAULTS[section]:
			_apply(section, key)


func save() -> void:
	var cfg := ConfigFile.new()
	for section in _values:
		for key in _values[section]:
			cfg.set_value(section, key, _values[section][key])
	for action in _keys:
		cfg.set_value("controls", action, _keys[action])
	cfg.save(path)


## Back to the defaults for everything, keys included.
func reset() -> void:
	_values = {}
	for section in DEFAULTS:
		_values[section] = (DEFAULTS[section] as Dictionary).duplicate()
	_keys = {}
	_apply_keys()
	for section in DEFAULTS:
		for key in DEFAULTS[section]:
			_apply(section, key)
	save()
	changed.emit("", "")


# ------------------------------------------------------------------ keys

## Binds `event` (a key or mouse button) to `action`, replacing its keys. Any other action that had that
## key loses it; returns that action's id, or "".
func rebind(action: String, event: InputEvent) -> String:
	var d := _describe(event)
	if d == "" or not _default_keys.has(action):
		return ""
	var lost := ""
	for a in _default_keys:
		if a == action:
			continue
		var mine: Array = _current(a)
		if d in mine:
			mine.erase(d)
			_keys[a] = mine
			lost = a
	_keys[action] = [d]
	_apply_keys()
	save()
	changed.emit("controls", action)
	return lost


## The key or button shown for an action ("Q", "1", "LMB"), or "—" if it has none.
func key_text(action: String) -> String:
	var keys: Array = _current(action)
	return _text(keys[0]) if not keys.is_empty() else "—"


func _current(action: String) -> Array:
	return (_keys[action] if _keys.has(action) else _default_keys.get(action, [])).duplicate()


func _apply_keys() -> void:
	for action in _default_keys:
		InputMap.action_erase_events(action)
		for d in _current(action):
			var ev := _event(d)
			if ev:
				InputMap.action_add_event(action, ev)


static func _describe(e: InputEvent) -> String:
	if e is InputEventKey:
		return "key:%d" % int(e.physical_keycode if e.physical_keycode != 0 else e.keycode)
	if e is InputEventMouseButton:
		return "mouse:%d" % int(e.button_index)
	return ""


static func _event(d: String) -> InputEvent:
	var parts := d.split(":")
	if parts.size() != 2:
		return null
	if parts[0] == "key":
		var k := InputEventKey.new()
		k.physical_keycode = int(parts[1]) as Key
		return k
	if parts[0] == "mouse":
		var m := InputEventMouseButton.new()
		m.button_index = int(parts[1]) as MouseButton
		return m
	return null


static func _text(d: String) -> String:
	var parts := d.split(":")
	if parts[0] == "mouse":
		return {"1": "LMB", "2": "RMB", "3": "MMB", "8": "Mouse 4", "9": "Mouse 5"}.get(parts[1], "Mouse " + parts[1])
	return OS.get_keycode_string(int(parts[1]) as Key)


# ------------------------------------------------------------------ applying

func _ensure_buses() -> void:
	for key in BUSES:
		var bus: String = BUSES[key]
		if AudioServer.get_bus_index(bus) < 0:
			AudioServer.add_bus()
			AudioServer.set_bus_name(AudioServer.bus_count - 1, bus)
			AudioServer.set_bus_send(AudioServer.bus_count - 1, "Master")
	# Scene dynamics have their own faders so player preferences always compose with ducking.
	for parent in ["Music", "Ambience"]:
		var mix_bus: String = parent + " Mix"
		if AudioServer.get_bus_index(mix_bus) < 0:
			AudioServer.add_bus()
			var index := AudioServer.bus_count - 1
			AudioServer.set_bus_name(index, mix_bus)
			AudioServer.set_bus_send(index, parent)


func _apply(section: String, key: String) -> void:
	var v = get_value(section, key)
	match section:
		"audio":
			var i := AudioServer.get_bus_index(BUSES.get(key, ""))
			if i >= 0:
				var lin := clampf(float(v) / 100.0, 0.0, 1.0)
				AudioServer.set_bus_volume_db(i, linear_to_db(maxf(lin, 0.0001)))
				AudioServer.set_bus_mute(i, lin <= 0.001)
		"graphics":
			_apply_graphics(key, v)
		"gameplay":
			var w = get_tree().current_scene if get_tree() else null
			if w and w.has_method("apply_settings"):
				w.apply_settings()


func _apply_graphics(key: String, v: Variant) -> void:
	if DisplayServer.get_name() == "headless":
		return
	var win := get_window()
	match key:
		"window":
			match str(v):
				"fullscreen":
					win.mode = Window.MODE_EXCLUSIVE_FULLSCREEN
				"borderless":
					win.mode = Window.MODE_FULLSCREEN
				_:
					win.mode = Window.MODE_WINDOWED
					_apply_graphics("resolution", get_value("graphics", "resolution"))
		"resolution":
			if win.mode == Window.MODE_WINDOWED:
				var p := str(v).split("x")
				if p.size() == 2:
					var size := Vector2i(int(p[0]), int(p[1]))
					var screen := DisplayServer.screen_get_usable_rect(win.current_screen).size
					size = Vector2i(mini(size.x, screen.x), mini(size.y, screen.y))
					win.size = size
					win.position = DisplayServer.screen_get_position(win.current_screen) + (screen - size) / 2
		"vsync":
			DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_ENABLED if v else DisplayServer.VSYNC_DISABLED)
		"quality", "shadows", "brightness":
			var vp := get_viewport()
			var q := str(get_value("graphics", "quality"))
			vp.msaa_3d = Viewport.MSAA_DISABLED if q == "low" else (Viewport.MSAA_2X if q == "medium" else Viewport.MSAA_4X)
			vp.positional_shadow_atlas_size = 0 if not get_value("graphics", "shadows") else (1024 if q == "low" else (2048 if q == "medium" else 4096))
			var w = get_tree().current_scene if get_tree() else null
			if w and w.has_method("apply_settings"):
				w.apply_settings()


## Applies quality, shadows and brightness to a level's environment and lights (world.gd calls this).
func apply_world(env: Environment, lights: Array) -> void:
	var q := str(get_value("graphics", "quality"))
	if not env.has_meta("base_exposure"):
		env.set_meta("base_exposure", env.tonemap_exposure)
		env.set_meta("base_ssao", env.ssao_enabled)
		env.set_meta("base_volumetric", env.volumetric_fog_enabled)
		env.set_meta("base_ssil", env.ssil_enabled)
		env.set_meta("base_ssr", env.ssr_enabled)
	env.tonemap_exposure = float(env.get_meta("base_exposure")) * float(get_value("graphics", "brightness"))
	env.ssao_enabled = bool(env.get_meta("base_ssao")) and q != "low"
	env.volumetric_fog_enabled = bool(env.get_meta("base_volumetric")) and q == "high"
	env.glow_enabled = q != "low"
	env.ssil_enabled = bool(env.get_meta("base_ssil", false)) and q == "high"
	env.ssr_enabled = bool(env.get_meta("base_ssr", false)) and q == "high"
	var shadows: bool = get_value("graphics", "shadows")
	for l in lights:
		if not is_instance_valid(l):
			continue
		if not l.has_meta("base_shadow"):
			l.set_meta("base_shadow", l.shadow_enabled)
		l.shadow_enabled = bool(l.get_meta("base_shadow")) and shadows
