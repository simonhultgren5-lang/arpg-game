extends Node
## Headless test of the 0.5.0-beta.5 interface work: gear slots and save migration, the skill build,
## the panels and settings. Run: godot --headless --path godot res://tests/ui_test.tscn
## Prints "UI TEST PASSED" and exits 0 when everything passed, 1 otherwise.

const Items = preload("res://scripts/data/items.gd")

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

	# New stats.
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
