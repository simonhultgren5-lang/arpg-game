extends Node
## Headless test of the dev console commands (debug builds have dev mode on).
##   godot --headless --path godot res://tests/dev_console_test.tscn
## Exits with code 0 when everything passed, 1 otherwise.

var _failures := PackedStringArray()


func _ready() -> void:
	if has_meta("runner"):
		_run()
		return
	var runner := Node.new()
	runner.name = "DevRunner"
	runner.set_script(get_script())
	runner.set_meta("runner", true)
	get_tree().root.add_child.call_deferred(runner)


func _check(cond: bool, what: String) -> void:
	print("  ok   " if cond else "  FAIL ", what)
	if not cond:
		_failures.append(what)


func _frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame


func _world():
	return get_tree().current_scene


func _run() -> void:
	_check(Boot.dev_mode, "dev mode is on in a debug build")
	_check(Dev.enabled, "console enabled")
	_check(Dev.run("god").find("before") < 0, "commands before a hero answer without crashing")
	Boot.set_test_hero("rogue")
	Boot.character["id"] = "devtest-rogue"
	DirAccess.remove_absolute(SaveSystem._local_path())  # start fresh each run
	await Game.load_hero()
	get_tree().change_scene_to_file("res://scenes/world.tscn")
	await _frames(20)
	var w = _world()
	_check(w != null and w.player != null, "town loaded")

	Dev.run("level 10")
	_check(Game.level() == 10, "level 10")
	var gold := int(Game.progress["gold"])
	Dev.run("gold 500")
	_check(int(Game.progress["gold"]) == gold + 500, "gold +500")
	Dev.run("potions 9")
	_check(int(Game.progress["potions"]) == 9, "potions 9")
	var bag := Game.inventory().size()
	var reply: String = Dev.run("give chest 3")
	_check(Game.inventory().size() == bag + 1, "give chest: " + reply)
	Dev.run("quest 1")
	_check(Game.quest_state() == 1, "quest step 1")
	Dev.run("quest lamps 2")
	_check(Game.quest("lamps") == 2, "quest lamps 2")
	Dev.run("quest wardens 2")
	_check(Game.quest("wardens") == 2 and Game.warden_stones() == Game.WARDEN_STONES, "quest wardens 2 gives every name-stone")
	_check(Dev.run("quest nonsense 1").find("quest <") >= 0, "quest with an unknown id explains itself")
	_check(Dev.run("quests").find("act_end") >= 0, "quests lists every quest")
	Dev.run("quest lamps 0")
	Dev.run("quest wardens 0")
	bag = Game.inventory().size()
	Dev.run("unique wardens_vigil")
	_check(Game.inventory().size() == bag + 1 and Game.inventory()[-1].get("unique", "") == "wardens_vigil", "unique adds a unique item")
	_check(Dev.run("unique list").find("hasks_toll") >= 0, "unique list")
	Dev.run("god on")
	var hp: float = w.player.hp
	w.player.take_damage(50.0)
	_check(w.player.hp == hp, "god mode blocks damage")
	Dev.run("god off")
	_check(not Dev.god_mode, "god off")
	_check(Dev.run("stats").find("level 10") >= 0, "stats")
	_check(Dev.run("nonsense").find("Unknown") >= 0, "unknown command")

	Dev.run("tp boss")
	for i in 600:
		await get_tree().physics_frame
		if Dev.pending_tp == "" and Game.area == "catacomb":
			break
	await _frames(5)
	w = _world()
	_check(Game.area == "catacomb", "tp boss reaches the crypt")
	_check(w.boss != null and w.player.global_position.distance_to(w.boss.global_position) < 12.0, "hero is next to the boss")
	Dev.run("spawn hollow 3")
	var alive := 0
	for e in w.enemies():
		if is_instance_valid(e) and not e.dead:
			alive += 1
	_check(alive >= 4, "spawned monsters (%d alive)" % alive)
	Dev.run("kill")
	await _frames(3)
	var left := 0
	for e in w.enemies():
		if is_instance_valid(e) and not e.dead:
			left += 1
	_check(left == 0, "kill clears the area")
	Dev.run("loot 3")
	Dev.run("tp town")
	await _frames(30)
	_check(Game.area == "town", "tp town")
	Dev.run("speed 1")

	# Feature flags from the boot file
	Boot.flags = {"game.xp_multiplier": 2}
	Dev.run("level 1")
	Game.add_xp(10)
	_check(int(Game.progress["xp"]) == 20, "flag game.xp_multiplier doubles XP")
	Boot.flags = {"game.xp_multiplier": "lots"}
	_check(Boot.flag("game.xp_multiplier", 1.0) == 1.0, "a flag of the wrong type falls back")
	Boot.flags = {}

	print("\nDEV CONSOLE TEST %s" % ("PASSED" if _failures.is_empty() else "FAILED: " + ", ".join(_failures)))
	get_tree().quit(0 if _failures.is_empty() else 1)
