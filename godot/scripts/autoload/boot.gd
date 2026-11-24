extends Node
## Boot: reads which character to play (launcher contract) and sets up input actions.
##
## The launcher starts the game with either
##   DepthsOfDarkness.exe -- --character-json "C:\...\boot-character.json"
## or individual args:
##   -- --character-id 3 --character-name Edda --hero-class rogue --hero-color "#8d3430"
##      [--server-url http://raspberrypi.local:4100 --token <session token>]
## The JSON file holds {id, name, heroClass, color} and, when playing online, serverUrl and token.
## See godot/README.md for the full contract.

const HERO_CLASSES := ["warrior", "pyromancer", "rogue"]
const DEFAULT_COLOR := "#8d3430"

## The character handed over by the launcher (or a dev test hero).
var character: Dictionary = {}
## true when the launcher passed a character; false for a test hero picked in the main menu.
var from_launcher := false
## Online play: saves go to the game server. Offline: saves go to user://saves/.
var server_url := ""
var token := ""
var boot_error := ""


func _ready() -> void:
	_setup_input()
	_read_boot()


func is_online() -> bool:
	return server_url != "" and token != ""


func set_test_hero(hero_class: String) -> void:
	character = {
		"id": "dev-" + hero_class,
		"name": "Wanderer",
		"heroClass": hero_class,
		"color": DEFAULT_COLOR,
	}
	from_launcher = false


# ------------------------------------------------------------------ boot args

func _read_boot() -> void:
	var args := _all_args()
	var opts := {}
	var i := 0
	while i < args.size():
		var a: String = args[i]
		if a.begins_with("--") and a.find("=") > 0:
			var eq := a.find("=")
			opts[a.substr(2, eq - 2)] = a.substr(eq + 1)
		elif a.begins_with("--") and i + 1 < args.size() and not String(args[i + 1]).begins_with("--"):
			opts[a.substr(2)] = args[i + 1]
			i += 1
		elif a.begins_with("--"):
			opts[a.substr(2)] = ""
		i += 1

	var data := {}
	if opts.has("character-json"):
		var path: String = opts["character-json"]
		var text := FileAccess.get_file_as_string(path)
		if text == "":
			boot_error = "Could not read the character file: %s" % path
		else:
			var parsed = JSON.parse_string(text)
			if parsed is Dictionary:
				data = parsed
			else:
				boot_error = "The character file is not valid JSON: %s" % path
	# Individual args override (or replace) the file.
	var map := {
		"character-id": "id", "character-name": "name", "hero-class": "heroClass",
		"hero-color": "color", "server-url": "serverUrl", "token": "token",
	}
	for key in map:
		if opts.has(key):
			data[map[key]] = opts[key]

	if data.has("id") and str(data["id"]) != "":
		character = _clean_character(data)
		from_launcher = true
		server_url = str(data.get("serverUrl", "")).strip_edges().trim_suffix("/")
		token = str(data.get("token", "")).strip_edges()
		if server_url != "" and not server_url.begins_with("http"):
			server_url = "http://" + server_url


func _all_args() -> PackedStringArray:
	# User args after "--" first; Godot also passes on args it does not know.
	var out := PackedStringArray()
	out.append_array(OS.get_cmdline_user_args())
	for a in OS.get_cmdline_args():
		if not out.has(a):
			out.append(a)
	return out


func _clean_character(d: Dictionary) -> Dictionary:
	var hero_class := str(d.get("heroClass", "warrior")).to_lower()
	if not HERO_CLASSES.has(hero_class):
		hero_class = "warrior"
	var hero_name := str(d.get("name", "Wanderer")).strip_edges()
	if hero_name == "":
		hero_name = "Wanderer"
	var color := str(d.get("color", DEFAULT_COLOR))
	if not Color.html_is_valid(color):
		color = DEFAULT_COLOR
	return {"id": str(d["id"]), "name": hero_name.left(18), "heroClass": hero_class, "color": color}


# ------------------------------------------------------------------ input

func _setup_input() -> void:
	_key("move_up", [KEY_W, KEY_UP])
	_key("move_down", [KEY_S, KEY_DOWN])
	_key("move_left", [KEY_A, KEY_LEFT])
	_key("move_right", [KEY_D, KEY_RIGHT])
	_key("skill_1", [KEY_1])
	_key("skill_2", [KEY_2])
	_key("skill_3", [KEY_3])
	_key("skill_4", [KEY_4])
	_key("potion", [KEY_Q])
	_key("interact", [KEY_E])
	_key("inventory", [KEY_I, KEY_C])
	_key("pause", [KEY_ESCAPE])
	_key("force_attack", [KEY_SHIFT])
	_mouse("primary", MOUSE_BUTTON_LEFT)
	_mouse("secondary", MOUSE_BUTTON_RIGHT)


func _key(action: String, keys: Array) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)
	for k in keys:
		var ev := InputEventKey.new()
		ev.physical_keycode = k
		InputMap.action_add_event(action, ev)


func _mouse(action: String, button: MouseButton) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)
	var ev := InputEventMouseButton.new()
	ev.button_index = button
	InputMap.action_add_event(action, ev)
