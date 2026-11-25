extends CanvasLayer
## Dev: an in-game developer console. Only active in debug builds (running from the editor) or when the
## game is started with --dev (the launcher's dev panel passes it). Toggle it with F1 or ` (backtick).
## While it is open the game is paused. Type "help" for the commands.

const Items = preload("res://scripts/data/items.gd")

## True when the console can be used at all.
var enabled := false
## Monsters can't hurt the hero (checked in player.gd take_damage).
var god_mode := false
## "boss": move the hero next to the boss once the crypt has loaded.
var pending_tp := ""

var _panel: PanelContainer
var _log: RichTextLabel
var _line: LineEdit
var _fps: Label
var _history := PackedStringArray()
var _history_i := 0
var _was_paused := false

const HELP := [
	["help", "this list"],
	["god [on|off]", "monsters can't hurt you"],
	["heal", "full health and mana"],
	["level <1-20>", "set the hero's level"],
	["xp <n>", "add experience"],
	["gold <n>", "add gold (negative takes it)"],
	["potions <n>", "set the number of draughts"],
	["give <weapon|chest|ring|...> [rarity 0-3]", "put a rolled item in the pack"],
	["loot [n]", "drop n random items at your feet"],
	["kill", "kill every monster in the area"],
	["spawn <hollow|archer|crawler|boss> [n] [elite]", "spawn monsters near you"],
	["tp <town|crypt|boss>", "go to an area (boss: next to the Bell-Warden)"],
	["quest <0-3>", "set The Silent Bell's step (3 = done)"],
	["quest <silent_bell|lamps|act_end|wardens> <step>", "set any Act I quest's step"],
	["quests", "list every Act I quest and its step"],
	["unique <id>|list", "put a unique item in the pack"],
	["speed <0.1-5>", "game speed"],
	["fps", "toggle the FPS counter"],
	["stats", "print the hero's stats"],
	["save", "save now"],
	["clear", "clear this log"],
]


func _ready() -> void:
	layer = 120
	process_mode = Node.PROCESS_MODE_ALWAYS
	enabled = Boot.dev_mode
	if not enabled:
		set_process(false)
		set_process_input(false)
		return
	_build()
	_print("[color=#e3b67e]Dev console[/color] · F1 or ` to close · [b]help[/b] for commands")
	if Boot.dev_start in ["crypt", "boss"]:
		pending_tp = Boot.dev_start


func _build() -> void:
	_panel = PanelContainer.new()
	_panel.anchor_right = 1.0
	_panel.offset_bottom = 380
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0.03, 0.025, 0.045, 0.94)
	bg.border_color = Color(0.89, 0.71, 0.49, 0.6)
	bg.border_width_bottom = 2
	bg.content_margin_left = 16
	bg.content_margin_right = 16
	bg.content_margin_top = 12
	bg.content_margin_bottom = 12
	_panel.add_theme_stylebox_override("panel", bg)
	_panel.visible = false
	add_child(_panel)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	_panel.add_child(box)

	_log = RichTextLabel.new()
	_log.bbcode_enabled = true
	_log.scroll_following = true
	_log.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_log.add_theme_font_size_override("normal_font_size", 17)
	_log.add_theme_font_size_override("bold_font_size", 17)
	_log.add_theme_color_override("default_color", Color(0.88, 0.84, 0.86))
	box.add_child(_log)

	_line = LineEdit.new()
	_line.placeholder_text = "Command (help)"
	_line.add_theme_font_size_override("font_size", 18)
	_line.text_submitted.connect(_submit)
	_line.gui_input.connect(_on_input_key)
	box.add_child(_line)

	_fps = Label.new()
	_fps.anchor_left = 1.0
	_fps.anchor_right = 1.0
	_fps.offset_left = -170
	_fps.offset_top = 10
	_fps.offset_right = -14
	_fps.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_fps.add_theme_font_size_override("font_size", 18)
	_fps.add_theme_color_override("font_color", Color(0.6, 1.0, 0.6))
	_fps.add_theme_constant_override("outline_size", 4)
	_fps.add_theme_color_override("font_outline_color", Color.BLACK)
	_fps.visible = false
	add_child(_fps)


func _input(event: InputEvent) -> void:
	if not (event is InputEventKey) or not event.pressed or event.echo:
		return
	if event.physical_keycode == KEY_F1 or event.physical_keycode == KEY_QUOTELEFT:
		toggle()
		get_viewport().set_input_as_handled()


func toggle() -> void:
	if _panel.visible:
		_panel.visible = false
		get_tree().paused = _was_paused
		_line.release_focus()
	else:
		_was_paused = get_tree().paused
		_panel.visible = true
		get_tree().paused = true
		_line.clear()
		_line.grab_focus.call_deferred()


func is_open() -> bool:
	return enabled and _panel != null and _panel.visible


func _process(_delta: float) -> void:
	if _fps.visible:
		_fps.text = "%d FPS  ·  %.1f ms" % [Engine.get_frames_per_second(), 1000.0 / maxf(1.0, Engine.get_frames_per_second())]
	if pending_tp != "" and Game.loaded:
		var w = _world()
		if pending_tp == "crypt" or pending_tp == "boss":
			if Game.area != "catacomb":
				if w != null:
					Game.enter_area("catacomb")
				return
			if w == null or w.player == null:
				return
			if pending_tp == "boss" and w.boss != null and is_instance_valid(w.boss):
				var c: Vector2i = w.grid.cell_of(w.boss.global_position)
				var near: Vector2i = w.grid.random_floor_near(c, 4, w.rng)
				w.player.global_position = w.grid.center(near)
				_print("Moved next to the Bell-Warden.")
			pending_tp = ""


func _on_input_key(event: InputEvent) -> void:
	if not (event is InputEventKey) or not event.pressed:
		return
	if event.keycode == KEY_UP and _history.size() > 0:
		_history_i = maxi(0, _history_i - 1)
		_line.text = _history[_history_i]
		_line.caret_column = _line.text.length()
		_line.accept_event()
	elif event.keycode == KEY_DOWN and _history.size() > 0:
		_history_i = mini(_history.size(), _history_i + 1)
		_line.text = _history[_history_i] if _history_i < _history.size() else ""
		_line.caret_column = _line.text.length()
		_line.accept_event()


func _submit(text: String) -> void:
	_line.clear()
	text = text.strip_edges()
	if text == "":
		return
	_history.append(text)
	_history_i = _history.size()
	_print("[color=#8e8096]> %s[/color]" % text.replace("[", "[lb]"))
	var reply := run(text)
	if reply != "":
		_print(reply)


func _print(text: String) -> void:
	if _log:
		_log.append_text(text + "\n")
	print_rich(text)


func _world():
	var s := get_tree().current_scene
	if s != null and "player" in s and "grid" in s:
		return s
	return null


func _err(text: String) -> String:
	return "[color=#e07a74]%s[/color]" % text


func _ok(text: String) -> String:
	return "[color=#7fd49a]%s[/color]" % text


func _arg(args: PackedStringArray, i: int, fallback: String) -> String:
	return String(args[i]) if args.size() > i else fallback


## Runs one command and returns what to print. Also used by tests.
func run(text: String) -> String:
	var args := text.split(" ", false)
	var cmd := args[0].to_lower()
	var w = _world()
	var p = w.player if w != null else null

	if cmd == "help":
		var lines := PackedStringArray()
		for h in HELP:
			lines.append("[b]%s[/b] [color=#a998ad]— %s[/color]" % [h[0], h[1]])
		return "\n".join(lines)
	if cmd == "clear":
		_log.clear()
		return ""
	if cmd == "fps":
		_fps.visible = not _fps.visible
		return "FPS counter %s." % ("on" if _fps.visible else "off")
	if cmd == "speed":
		var s := clampf(float(_arg(args, 1, "1")), 0.1, 5.0)
		Engine.time_scale = s
		return _ok("Game speed ×%.1f" % s)
	if not Game.loaded:
		return _err("Enter the world first (no hero loaded).")

	match cmd:
		"god":
			var mode: String = _arg(args, 1, "")
			god_mode = (not god_mode) if mode == "" else mode == "on"
			return _ok("God mode %s." % ("on" if god_mode else "off"))
		"heal":
			if p == null:
				return _err("No hero in this scene.")
			p.hp = Game.max_hp()
			p.mana = Game.max_mana()
			if p.dead:
				return _err("The hero is dead: use tp town.")
			return _ok("Healed.")
		"level":
			var lv := clampi(int(_arg(args, 1, "1")), 1, Game.MAX_LEVEL)
			Game.progress["level"] = lv
			Game.progress["xp"] = 0
			Game.stats_changed.emit()
			Game.xp_changed.emit()
			if p != null:
				p.hp = Game.max_hp()
				p.mana = Game.max_mana()
			return _ok("Level %d." % lv)
		"xp":
			Game.add_xp(maxi(0, int(_arg(args, 1, "100"))))
			return _ok("Level %d · %d XP." % [Game.level(), int(Game.progress["xp"])])
		"gold":
			Game.add_gold(int(_arg(args, 1, "100")))
			return _ok("%d gold." % int(Game.progress["gold"]))
		"potions":
			Game.progress["potions"] = clampi(int(_arg(args, 1, "5")), 0, 99)
			Game.stats_changed.emit()
			return _ok("%d draughts." % int(Game.progress["potions"]))
		"give":
			var slot: String = _arg(args, 1, "weapon")
			if slot not in Items.KINDS:
				return _err("give <%s> [rarity 0-3]" % "|".join(Items.KINDS))
			var item: Dictionary = {}
			var want := int(_arg(args, 2, "-1"))
			for i in 200:  # roll until the rarity matches (or take the last roll)
				item = Game.roll_loot(Game.monster_level() + 2, 0.6, slot)
				if want < 0 or int(item.get("rarity", 0)) == clampi(want, 0, 3):
					break
			if not Game.add_item(item):
				return _err("The pack is full.")
			return _ok("Added %s (%s)." % [item.get("name", "item"), Items.RARITY_NAMES[int(item.get("rarity", 0))]])
		"loot":
			if w == null:
				return _err("No world in this scene.")
			var n := clampi(int(_arg(args, 1, "5")), 1, 30)
			for i in n:
				w.drop_item(p.global_position, Game.monster_level() + 1, 0.5)
			return _ok("Dropped %d items." % n)
		"kill":
			if w == null:
				return _err("No world in this scene.")
			var killed := 0
			for e in w.enemies():
				if is_instance_valid(e) and not e.dead:
					e.take_damage(1.0e9)
					killed += 1
			return _ok("Killed %d monsters." % killed)
		"spawn":
			if w == null:
				return _err("No world in this scene.")
			var kind: String = _arg(args, 1, "hollow")
			if kind not in ["hollow", "archer", "crawler", "boss"]:
				return _err("spawn hollow|archer|crawler|boss [n] [elite]")
			var n := clampi(int(_arg(args, 2, "1")), 1, 30)
			var elite: bool = _arg(args, 3, "") == "elite" or _arg(args, 2, "") == "elite"
			if _arg(args, 2, "") == "elite":
				n = 1
			var c: Vector2i = w.grid.cell_of(p.global_position)
			for i in n:
				var spot: Vector2i = w.grid.random_floor_near(c, 4, w.rng)
				var e = w.spawn_enemy(kind, w.grid.center(spot), Game.monster_level() + (2 if kind == "boss" else 0), elite)
				if kind == "boss":
					w.boss = e
			return _ok("Spawned %d %s%s." % [n, kind, " (elite)" if elite else ""])
		"tp":
			var where: String = _arg(args, 1, "")
			match where:
				"town":
					Game.enter_area("town")
					return _ok("To Hollowmere.")
				"crypt", "boss":
					pending_tp = where
					if Game.area == "catacomb" and where == "crypt":
						pending_tp = ""
						Game.enter_area("catacomb")
					return _ok("To the Sunken Crypt%s." % (", next to the boss" if where == "boss" else ""))
			return _err("tp town|crypt|boss")
		"quest":
			var first: String = _arg(args, 1, "0")
			if first.is_valid_int():
				var s := clampi(int(first), 0, 3)
				Game.set_quest_state(s)
				return _ok("Quest step %d: %s" % [s, Game.quest_text()])
			if not Game.QUESTS.has(first):
				return _err("quest <%s> <step>" % "|".join(Game.QUESTS.keys()))
			var step := clampi(int(_arg(args, 2, "0")), 0, int(Game.QUESTS[first]))
			if first == "wardens":
				# Step 2 means every name-stone was found; earlier steps start the search over.
				Game.flags()["warden_stones"] = Game.WARDEN_STONES if step >= 2 else 0
			Game.set_quest(first, step)
			var main: Array = Game.main_quest()
			return _ok("%s step %d. Now: %s: %s" % [first, step, main[0], main[1]])
		"quests":
			var lines := PackedStringArray()
			for q in Game.QUESTS:
				lines.append("%s %d/%d" % [q, Game.quest(q), int(Game.QUESTS[q])])
			lines.append("name-stones %d/%d" % [Game.warden_stones(), Game.WARDEN_STONES])
			return "\n".join(lines)
		"unique":
			var id: String = _arg(args, 1, "list")
			if not Items.UNIQUES.has(id):
				return "Uniques: " + ", ".join(Items.UNIQUES.keys())
			if not Game.add_item(Items.make_unique(id)):
				return _err("The pack is full.")
			return _ok("Added %s." % Items.UNIQUES[id]["name"])
		"stats":
			var dmg: Vector2 = Game.damage_range()
			return "%s · %s · level %d (%d/%d XP)\nHP %d · mana %d · armor %d · damage %d–%d · crit %d%% · speed %.1f\nGold %d · draughts %d · kills %d · area %s · quest step %d" % [
				Boot.character.get("name", "?"), Game.hero_class, Game.level(), int(Game.progress["xp"]), Game.xp_to_next(),
				int(Game.max_hp()), int(Game.max_mana()), int(Game.armor()), int(dmg.x), int(dmg.y),
				int(Game.crit_chance() * 100.0), Game.move_speed(),
				int(Game.progress["gold"]), int(Game.progress["potions"]), int(Game.progress.get("kills", 0)), Game.area, Game.quest_state(),
			]
		"save":
			Game.save()
			return _ok("Saved%s." % (" to the server" if Boot.is_online() else ""))
	return _err("Unknown command: %s (try help)" % cmd)
