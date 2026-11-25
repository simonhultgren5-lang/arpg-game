extends Node
## Headless test of the 0.5.0-beta.5 interface work: gear slots and save migration, the skill build,
## the panels and settings. Run: godot --headless --path godot res://tests/ui_test.tscn
## Prints "UI TEST PASSED" and exits 0 when everything passed, 1 otherwise.

const Items = preload("res://scripts/data/items.gd")
const Classes = preload("res://scripts/data/classes.gd")
const Passives = preload("res://scripts/data/passives.gd")

var _failures := PackedStringArray()


func _ready() -> void:
	if has_meta("runner"):
		_run()
		return
	var runner := Node.new()
	runner.name = "UiTestRunner"
	runner.set_script(get_script())
	runner.set_meta("runner", true)
	get_tree().root.add_child.call_deferred(runner)


func _check(ok: bool, what: String) -> void:
	print("  ok   " if ok else "  FAIL ", what)
	if not ok:
		_failures.append(what)


func _frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame


func _hero(cls: String) -> void:
	Boot.set_test_hero(cls)
	Boot.character["id"] = "ui-test-" + cls
	await Game.load_hero()
	Game.progress = Game.new_progress()
	Game.progress["equipped"]["weapon"] = Items.roll_item(1, cls, -1.0, "weapon")


func _run() -> void:
	print("== gear")
	await _gear()
	print("== skills")
	await _skills()
	print("== skills in the world")
	await _skills_in_world()
	print("== settings")
	await _settings()
	print("== panels")
	await _panels()
	if _failures.is_empty():
		print("UI TEST PASSED")
		get_tree().quit(0)
	else:
		print("UI TEST FAILED: %d check(s)\n  %s" % [_failures.size(), "\n  ".join(_failures)])
		get_tree().quit(1)


# ------------------------------------------------------------------ gear

func _v1_save() -> Dictionary:
	var pack := []
	for i in 23:
		pack.append({"uid": "p%d" % i, "name": "Old %d" % i, "slot": ["weapon", "armor", "charm"][i % 3],
			"rarity": 0, "ilvl": 2, "stats": {"life": 3}})
	pack.append(Items.make_unique("saints_knuckle"))
	pack[23]["slot"] = "charm"  # how a v1 save stored it
	return {
		"version": 1, "level": 4, "xp": 10, "gold": 99, "potions": 2, "inventory": pack,
		"equipped": {
			"weapon": {"uid": "w", "name": "Old Blade", "slot": "weapon", "rarity": 1, "ilvl": 2, "stats": {"damage": 4}},
			"armor": Items.make_unique("wardens_vigil"),
			"charm": Items.make_unique("lamplighters_wick"),
		},
		"quests": {}, "flags": {},
	}


func _gear() -> void:
	await _hero("warrior")
	_check(Items.SLOTS.size() == 13, "13 gear slots")
	_check(Items.slot_kind("ring_2") == "ring" and Items.slot_kind("head") == "head", "ring slots take rings")

	# Migration from a v1 save keeps every item and moves armor/charm.
	var m: Dictionary = Game.migrate(_v1_save())
	_check(int(m["version"]) == 2, "migrated save is version 2")
	var eq: Dictionary = m["equipped"]
	_check(eq.get("chest") is Dictionary and eq["chest"].get("unique") == "wardens_vigil", "armor moved to chest")
	_check(eq.get("amulet") is Dictionary and eq["amulet"].get("unique") == "lamplighters_wick", "charm moved to amulet")
	_check(not eq.has("armor") and not eq.has("charm"), "old slot names are gone")
	for s in Items.SLOTS:
		_check(eq.has(s), "migrated save has slot %s" % s)
	_check((m["inventory"] as Array).size() == 24, "no bag item lost in migration")
	var kinds := {}
	for it in m["inventory"]:
		kinds[it["slot"]] = true
	_check(not kinds.has("armor") and not kinds.has("charm"), "bag items get new kinds")
	var knuckle = (m["inventory"] as Array).filter(func(i): return i.get("unique") == "saints_knuckle")
	_check(knuckle.size() == 1 and knuckle[0]["slot"] == "ring", "Knuckle of the Thirteenth becomes a ring")
	_check((m["inventory"] as Array).all(func(i): return str(i.get("icon", "")) != ""), "migrated items get icons")

	# A version-2 save loads unchanged: both rings stay worn, nothing moves to the bag.
	var v2 := m.duplicate(true)
	v2["equipped"]["ring_1"] = Items.roll_item(3, "warrior", 0.0, "ring")
	v2["equipped"]["ring_2"] = Items.roll_item(3, "warrior", 0.0, "ring")
	var again: Dictionary = Game.migrate(v2)
	_check(again["equipped"]["ring_2"] == v2["equipped"]["ring_2"] and again["equipped"]["ring_1"] == v2["equipped"]["ring_1"], "reloading a v2 save keeps both rings worn")
	_check((again["inventory"] as Array).size() == (v2["inventory"] as Array).size(), "reloading a v2 save adds nothing to the bag")

	# Every kind rolls with an icon.
	for kind in Items.KINDS:
		var it: Dictionary = Items.roll_item(5, "warrior", 0.5, kind)
		_check(it["slot"] == kind and str(it.get("icon", "")) != "", "%s rolls with an icon" % kind)

	# Rings fill ring_1, then ring_2, then replace ring_1.
	for i in 3:
		Game.add_item(Items.roll_item(3, "warrior", 0.0, "ring"))
	var first: Dictionary = Game.inventory()[0]
	_check(Game.equip_to(0), "equip a ring")
	_check(Game.progress["equipped"]["ring_1"] == first, "first ring in ring_1")
	var second: Dictionary = Game.inventory()[0]
	Game.equip_to(0)
	_check(Game.progress["equipped"]["ring_2"] == second, "second ring in ring_2")
	var third: Dictionary = Game.inventory()[0]
	Game.equip_to(0)
	_check(Game.progress["equipped"]["ring_1"] == third and Game.inventory().has(first), "third ring replaces ring_1")
	_check(not Game.equip_to(0, "head"), "a ring does not fit the head slot")

	# Unequip with a full bag is refused.
	while Game.inventory().size() < Game.INVENTORY_SIZE:
		Game.inventory().append(Items.roll_item(1, "warrior", 0.0, "belt"))
	_check(Game.INVENTORY_SIZE == 60, "the bag holds 60")
	_check(not Game.unequip("ring_1") and Game.progress["equipped"]["ring_1"] == third, "unequip refused when the bag is full")
	Game.inventory().clear()
	_check(Game.unequip("ring_1") and Game.progress["equipped"]["ring_1"] == null, "unequip into the bag")

	# Moving items inside the bag.
	Game.inventory().clear()
	var a := Items.roll_item(1, "warrior", 0.0, "belt")
	var b := Items.roll_item(1, "warrior", 0.0, "feet")
	Game.inventory().append_array([a, b])
	Game.move_item(0, 1)
	_check(Game.inventory()[0] == b and Game.inventory()[1] == a, "move_item swaps bag cells")

	# Compare: signed deltas.
	var x := {"stats": {"armor": 10, "life": 5}}
	var y := {"stats": {"armor": 4, "crit": 2}}
	var d: Dictionary = Items.compare(x, y)
	_check(int(d.get("armor", 0)) == 6 and int(d.get("life", 0)) == 5 and int(d.get("crit", 0)) == -2, "compare gives signed deltas")

	# New stats (nothing else worn, so random affixes can't interfere).
	Game.progress["equipped"] = Game.empty_equipped()
	Game.progress["equipped"]["ring_1"] = {"slot": "ring", "stats": {"cdr": 90, "crit_dmg": 20, "attack_speed": 10, "regen": 3}}
	_check(is_equal_approx(Game.cooldown_mult(), 0.6), "cooldown reduction caps at 40%")
	_check(is_equal_approx(Game.crit_damage(), 1.95), "crit damage = 1.75 + 20%")
	_check(is_equal_approx(Game.attack_speed(), 1.1), "attack speed +10%")
	_check(is_equal_approx(Game.life_regen(), 3.0), "life regen from gear")
	_check(Game.has_unique("lamplighters_wick") == false, "no unique worn")
	Game.progress["equipped"]["ring_2"] = Items.make_unique("saints_knuckle")
	_check(Game.has_unique("saints_knuckle"), "a unique works from a ring slot")
	Game.progress["equipped"]["ring_1"] = null
	Game.progress["equipped"]["ring_2"] = null


# ------------------------------------------------------------------ skills

func _skills() -> void:
	for cls in ["warrior", "pyromancer", "rogue"]:
		var list: Array = Classes.skills(cls)
		_check(list.size() == 8, "%s has 8 skills" % cls)
		_check(list.filter(func(s): return s.get("primary", false)).size() == 2, "%s has 2 primaries" % cls)
		_check(list.all(func(s): return (s["variants"] as Array).size() == 4), "%s skills have 4 variants each" % cls)
		var unlocks := list.map(func(s): return int(s.get("unlock", 1)))
		_check(unlocks == [1, 1, 1, 1, 2, 3, 5, 6], "%s unlock order %s" % [cls, unlocks])
		_check(Passives.for_class(cls).size() == 8, "%s has 8 passives" % cls)
		var ids := {}
		for s in list:
			ids[s["id"]] = true
			for v in s["variants"]:
				ids[v["id"]] = true
		_check(ids.size() == 8 + 32, "%s skill and variant ids are unique" % cls)
	_check(Passives.SLOT_LEVELS == [3, 6, 10], "passive slots open at 3, 6, 10")

	await _hero("warrior")
	Game.progress["level"] = 1
	Game.sanitize_build()
	var b: Dictionary = Game.build()
	_check(b["bar"] == ["grave_cleave", "earthsplitter", "iron_rush", "grave_roar", "sextons_whirl", ""], "default warrior bar %s" % [b["bar"]])
	_check(Game.set_bar(0, "earthsplitter") != "", "LMB refuses a non-primary")
	_check(Game.set_bar(0, "shield_bash") == "" and Game.build()["bar"][0] == "shield_bash", "LMB takes the second primary")
	_check(Game.set_bar(5, "shield_bash") == "" and Game.build()["bar"][0] == "" , "a skill moves, not copies, between slots")
	_check(Game.set_bar(0, "grave_cleave") == "", "LMB back to Grave Cleave")
	_check(Game.set_bar(3, "no_such_skill") != "", "unknown skill refused")

	var sk: Dictionary = Classes.skill("warrior", "earthsplitter")
	var last: Dictionary = sk["variants"][3]
	_check(Classes.variant_unlock(sk, 3) == 9 and Classes.variant_unlock(sk, 0) == 2, "variant unlock levels")
	_check(Game.set_variant("earthsplitter", last["id"]) == "", "a locked variant can be chosen")
	var r: Dictionary = Game.resolved("earthsplitter")
	_check(r.get("variant", "") == "", "a locked variant casts as the base skill")
	Game.progress["level"] = 9
	r = Game.resolved("earthsplitter")
	_check(r.get("variant", "") == last["id"], "the variant applies once unlocked")
	for k in last["mods"]:
		_check(r[k] == last["mods"][k], "variant sets %s" % k)
	_check(Game.set_variant("earthsplitter", "nope") != "", "unknown variant refused")
	_check(Game.set_variant("earthsplitter", "") == "" and Game.resolved("earthsplitter").get("variant", "") == "", "clearing the variant")

	var pid: String = Passives.for_class("warrior")[0]["id"]
	Game.progress["level"] = 2
	_check(Game.set_passive(0, pid) != "", "passive slot 1 shut before level 3")
	Game.progress["level"] = 3
	_check(Game.set_passive(0, pid) == "", "passive slot 1 opens at level 3")
	_check(Game.set_passive(1, Passives.for_class("warrior")[1]["id"]) != "", "passive slot 2 shut at level 3")
	_check(Game.set_passive(0, "nope") != "", "unknown passive refused")
	var p0: Dictionary = Passives.for_class("warrior")[0]
	var stat: String = (p0["effect"] as Dictionary).keys()[0]
	_check(is_equal_approx(Game.passive_bonus(stat), float(p0["effect"][stat])), "passive bonus counts")

	Game.progress["build"] = {"bar": ["grave_cleave", "nope", "", "", "", ""], "variants": {"x": "y", "iron_rush": "zzz"}, "passives": ["bad", "", ""]}
	Game.sanitize_build()
	b = Game.build()
	_check(b["bar"][1] == "" and not b["variants"].has("x") and not b["variants"].has("iron_rush") and b["passives"][0] == "", "sanitize drops unknown ids")
	Game.progress["build"] = {"bar": [], "variants": [], "passives": "x"}
	Game.sanitize_build()
	_check((Game.build()["bar"] as Array).size() == 6 and Game.build()["bar"][0] == "grave_cleave", "sanitize rebuilds a broken build")

	# A skill that unlocks goes into the first empty bar slot.
	Game.progress["level"] = 1
	Game.progress["xp"] = 0
	Game.progress["build"] = Game.default_build("warrior")
	Game.add_xp(Game.xp_to_next())
	_check(Game.level() == 2 and Game.build()["bar"][5] == "grave_leap", "Grave Leap slots itself at level 2")


func _skills_in_world() -> void:
	for cls in ["warrior", "pyromancer", "rogue"]:
		await _hero(cls)
		Game.progress["level"] = 20
		Game.area = "town"
		get_tree().change_scene_to_file("res://scenes/world.tscn")
		await _frames(20)
		var w = get_tree().current_scene
		var p = w.player
		var first: String = Game.build()["bar"][1]
		p.mana = 999.0
		p.cast_slot(1)
		var cd0: float = p.cooldown_left(first)
		_check(cd0 > 0.0, "%s: casting starts its cooldown" % first)
		Game.set_bar(1, Classes.skills(cls)[4]["id"])
		Game.set_bar(1, first)
		_check(p.cooldown_left(first) > 0.0 and p.cooldown_left(first) <= cd0, "%s: cooldown follows the skill" % first)
		var casts := 0
		for s in Classes.skills(cls):
			for v in [""] + (s["variants"] as Array).map(func(x): return x["id"]):
				Game.set_bar(1 if not s.get("primary", false) else 0, s["id"])
				Game.set_variant(s["id"], v)
				p.reset_cooldowns()
				p.mana = 999.0
				p.dead = false
				p.hp = 9999.0
				p.cast_slot(1 if not s.get("primary", false) else 0)
				await _frames(2)
				casts += 1
		_check(casts == 40, "%s: every skill and variant cast (%d)" % [cls, casts])
		await _frames(60)
		get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
		await _frames(5)


# ------------------------------------------------------------------ settings

func _settings() -> void:
	Settings.path = "user://settings_test.cfg"
	Settings.reset()
	_check(int(Settings.get_value("audio", "music")) == int(Settings.DEFAULTS["audio"]["music"]), "settings start at defaults")
	Settings.set_value("audio", "music", 40)
	Settings.set_value("gameplay", "screen_shake", false)
	Settings.load_settings()
	_check(int(Settings.get_value("audio", "music")) == 40, "a volume survives a reload")
	_check(Settings.get_value("gameplay", "screen_shake") == false, "a gameplay switch survives a reload")
	_check(AudioServer.get_bus_index("Music") >= 0 and AudioServer.get_bus_index("Effects") >= 0, "audio buses exist")
	_check(absf(AudioServer.get_bus_volume_db(AudioServer.get_bus_index("Music")) - linear_to_db(0.4)) < 0.5, "music volume applied")
	var key := InputEventKey.new()
	key.physical_keycode = KEY_1
	var lost: String = Settings.rebind("potion", key)
	_check(lost == "bar_3", "rebinding 1 to the draught takes it from skill slot 3 (%s)" % lost)
	var has_one := false
	for ev in InputMap.action_get_events("bar_3"):
		if ev is InputEventKey and ev.physical_keycode == KEY_1:
			has_one = true
	_check(not has_one, "the old action lost the key")
	_check(Settings.key_text("potion") == "1", "the draught key reads 1 (%s)" % Settings.key_text("potion"))
	Settings.load_settings()
	_check(Settings.key_text("potion") == "1", "a rebind survives a reload")
	Settings.reset()
	_check(Settings.key_text("potion") == "Q" and Settings.key_text("bar_3") == "1", "reset restores keys")
	DirAccess.remove_absolute(ProjectSettings.globalize_path("user://settings_test.cfg"))


# ------------------------------------------------------------------ panels

func _panels() -> void:
	await _hero("warrior")
	Game.progress["level"] = 10
	Game.area = "town"
	get_tree().change_scene_to_file("res://scenes/world.tscn")
	await _frames(20)
	var w = get_tree().current_scene
	var hud = w.hud
	# In the town square, away from the fen's packs.
	w.player.global_position = w.grid.center(Vector2i(17, 12))
	await _frames(2)
	for name in ["character", "skills", "settings"]:
		hud.open_panel(name)
		await _frames(2)
		_check(hud.panel_open() == name and hud.is_blocking(), "%s panel opens and blocks clicks" % name)
		_check(not get_tree().paused or name == "settings", "%s panel doesn't pause the game" % name)
		hud.close_panels()
		_check(hud.panel_open() == "" and not hud.is_blocking(), "%s panel closes" % name)
	# Esc: panel first, then the pause menu.
	hud.open_panel("character")
	hud.escape()
	_check(hud.panel_open() == "" and not hud.is_paused(), "Esc closes the open panel first")
	hud.escape()
	_check(hud.is_paused(), "Esc with nothing open pauses")
	hud.escape()
	_check(not hud.is_paused(), "Esc again resumes")

	# Character panel: drag a bag item onto its slot, and back.
	hud.open_panel("character")
	var cp = hud.panel("character")
	Game.inventory().clear()
	var helm := Items.roll_item(3, "warrior", 0.0, "head")
	Game.add_item(helm)
	await _frames(2)
	_check(cp.bag_cells() == Game.INVENTORY_SIZE, "the bag shows 60 cells")
	_check(cp.drop({"slot": "head"}, {"bag": 0}), "drag a helm from the bag to the head slot")
	_check(Game.progress["equipped"]["head"] == helm and Game.inventory().is_empty(), "the helm is worn")
	_check(not cp.drop({"slot": "feet"}, {"slot": "head"}), "a helm can't go on the feet")
	_check(cp.drop({"bag": 5}, {"slot": "head"}), "drag the helm back to the bag")
	_check(Game.progress["equipped"]["head"] == null and Game.inventory().size() == 1, "the helm is in the bag")
	var t: String = cp.tooltip_for({"bag": 0})
	_check(t.contains(helm["name"]), "the tooltip names the item")
	hud.close_panels()

	# Skills panel lists the class's skills, and locks with a foe near.
	hud.open_panel("skills")
	var sp = hud.panel("skills")
	_check(sp.skill_ids().size() == 8, "the skills panel lists 8 skills")
	_check(sp.locked_reason() == "", "skills can change in town")
	var foe = w.spawn_enemy("hollow", w.player.global_position + Vector3(3, 0, 0), 1, false) if w.has_method("spawn_enemy") else null
	if foe:
		await _frames(2)
		_check(sp.locked_reason() != "", "skills lock with a foe near")
		foe.queue_free()
		await _frames(2)
	hud.close_panels()
	_check(hud.hotbar_slots() == Game.BAR_SIZE, "the hotbar shows six skill slots")

	# With a panel open, keys still work (a draught mid-fight) and the hero stops walking.
	var p = w.player
	p._path = PackedVector3Array([p.global_position + Vector3(8, 0, 0)])
	p._path_i = 0
	p._lmb_held = true
	hud.open_panel("character")
	await _frames(2)
	_check(p._path.is_empty() and not p._lmb_held, "opening a panel stops the hero")
	Game.progress["potions"] = 3
	p.hp = 10.0
	p.potion_cd = 0.0
	var ev := InputEventAction.new()
	ev.action = "potion"
	ev.pressed = true
	p._unhandled_input(ev)
	_check(int(Game.progress["potions"]) == 2, "a draught works with a panel open")
	hud.close_panels()

	# Attack in place follows its binding, not a hard-wired Shift.
	var f := InputEventKey.new()
	f.physical_keycode = KEY_F
	Settings.path = "user://settings_test.cfg"
	Settings.rebind("force_attack", f)
	Input.action_press("force_attack")
	p._hold_mode = ""
	p._primary_press()
	_check(p._hold_mode == "force", "the rebound attack-in-place key works")
	Input.action_release("force_attack")

	# A stray left click while the Controls tab waits for a key doesn't steal the left mouse button.
	hud.open_panel("settings")
	var sp2 = hud.panel("settings")
	sp2._waiting = "potion"
	sp2._key_buttons["potion"] = Button.new()
	var click := InputEventMouseButton.new()
	click.button_index = MOUSE_BUTTON_LEFT
	click.pressed = true
	sp2._input(click)
	_check(Settings.key_text("bar_1") == "LMB" and Settings.key_text("potion") != "LMB", "left click can't be taken by a rebind")
	sp2._waiting = ""
	hud.close_panels()
	Settings.reset()
	DirAccess.remove_absolute(ProjectSettings.globalize_path("user://settings_test.cfg"))
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
	await _frames(5)
