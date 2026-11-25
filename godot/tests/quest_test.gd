extends Node
## Headless test of quests, the quest log, side quests, monsters in the fen, and XP balance.
## Run: godot --headless --path godot res://tests/quest_test.tscn  -> prints "QUEST TEST PASSED".

const Quests = preload("res://scripts/data/quests.gd")
const Fen = preload("res://scripts/world/fen.gd")

var _failures := PackedStringArray()


func _ready() -> void:
	if has_meta("runner"):
		_run()
		return
	var runner := Node.new()
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


func _hero() -> void:
	Boot.set_test_hero("warrior")
	Boot.character["id"] = "quest-test"
	await Game.load_hero()
	Game.progress = Game.new_progress()


func _run() -> void:
	print("== quest data and log")
	await _quest_log()
	print("== The Southwatch Fire")
	await _southwatch()
	print("== Restless Kin")
	await _kin()
	print("== XP and death")
	await _xp()
	print("== monsters in the fen")
	await _fen()
	if _failures.is_empty():
		print("QUEST TEST PASSED")
		get_tree().quit(0)
	else:
		print("QUEST TEST FAILED: %d\n  %s" % [_failures.size(), "\n  ".join(_failures)])
		get_tree().quit(1)


func _quest_log() -> void:
	await _hero()
	var ids := Quests.ids()
	for id in ["silent_bell", "lamps", "act_end", "wardens", "southwatch", "kin"]:
		_check(ids.has(id), "quest %s is defined" % id)
		_check(Game.QUESTS.has(id), "quest %s has a saved state" % id)
	var log: Array = Game.quest_log()
	_check(log.size() == 1 and log[0]["id"] == "silent_bell" and log[0]["kind"] == "main", "a new hero's log holds The Silent Bell")
	_check(str(log[0]["objective"]).contains("Maud"), "its first objective points to Maud")
	Game.set_quest("wardens", 1)
	Game.set_quest("silent_bell", 3)
	log = Game.quest_log()
	var by_id := {}
	for e in log:
		by_id[e["id"]] = e
	_check(by_id.has("wardens") and by_id["wardens"]["kind"] == "side" and not by_id["wardens"]["done"], "an accepted side quest is listed")
	_check(by_id.has("silent_bell") and by_id["silent_bell"]["done"], "a finished quest stays in the log as done")
	_check(str(by_id["wardens"]["objective"]).contains("0/3"), "objectives carry their counters")
	for e in log:
		_check(str(e.get("description", "")) != "" and str(e.get("reward", "x")) != "", "%s has a description" % e["id"])
	_check(Game.tracked_quests().size() >= 1 and Game.tracked_quests().size() <= 3, "the tracker shows up to three active quests")


func _southwatch() -> void:
	await _hero()
	Game.set_quest("silent_bell", 1)
	_check(Game.check_condition("southwatch_offer"), "Edda offers The Southwatch Fire once the bell quest is under way")
	Game.run_action("accept_southwatch")
	_check(Game.quest("southwatch") == 1, "The Southwatch Fire accepted")
	for i in Quests.SOUTHWATCH_KILLS - 1:
		Game.on_monster_killed("fen", false)
	_check(Game.quest("southwatch") == 1 and Game.quest_counter("southwatch") == Quests.SOUTHWATCH_KILLS - 1, "fen kills are counted")
	Game.on_monster_killed("crypt", false)
	_check(Game.quest_counter("southwatch") == Quests.SOUTHWATCH_KILLS - 1, "crypt kills don't count for the fen")
	Game.on_monster_killed("fen", false)
	_check(Game.quest("southwatch") == 2, "the fen is cleared: relight the beacon")
	_check(not Game.beacon_lit(), "the beacon is cold until relit")
	_check(Game.relight_beacon(), "the beacon relights")
	_check(Game.quest("southwatch") == 3 and Game.beacon_lit(), "beacon lit: return to Edda")
	_check(Game.dialogue_entry("edda") == "edda_s3", "Edda has the reward ready")
	var gold := int(Game.progress["gold"])
	var bag := Game.inventory().size()
	Game.run_action("complete_southwatch")
	_check(Game.quest("southwatch") == 4, "The Southwatch Fire done")
	_check(int(Game.progress["gold"]) > gold and Game.inventory().size() == bag + 1, "the reward is gold and a weapon")
	for node in ["edda_s0", "edda_s1", "edda_s3", "edda_s4"]:
		_check(not Game.dialogue_node(node).is_empty(), "dialogue %s exists" % node)


func _kin() -> void:
	await _hero()
	Game.set_quest("silent_bell", 1)
	_check(Game.check_condition("kin_offer"), "Corwin offers Restless Kin")
	Game.run_action("accept_kin")
	_check(Game.quest("kin") == 1, "Restless Kin accepted")
	_check(Game.wants_grave_token(), "elites should drop grave-tokens now")
	for i in Quests.KIN_TOKENS:
		Game.add_item(Quests.grave_token())
	Game.refresh_kin()
	_check(Game.quest("kin") == 2 and not Game.wants_grave_token(), "three tokens: return to Corwin")
	_check(Game.dialogue_entry("corwin") == "corwin_k2", "Corwin takes the tokens")
	Game.run_action("complete_kin")
	_check(Game.quest("kin") == 3, "Restless Kin done")
	_check(Game.inventory().all(func(i): return i.get("uid", "") != "grave_token"), "the tokens are handed over")
	for node in ["corwin_k0", "corwin_k1", "corwin_k2", "corwin_k3"]:
		_check(not Game.dialogue_node(node).is_empty(), "dialogue %s exists" % node)


func _xp() -> void:
	await _hero()
	Game.progress["level"] = 1
	_check(Game.kill_xp(12, 1, false) == 12, "an even-level kill gives its base XP")
	_check(Game.kill_xp(12, 1, true) == 30, "an elite gives 2.5 times")
	Game.progress["level"] = 6
	var low := Game.kill_xp(12, 1, false)
	_check(low >= 3 and low < 12, "monsters far below your level give much less (%d)" % low)
	Game.progress["level"] = 2
	_check(Game.kill_xp(12, 4, false) > Game.kill_xp(12, 2, false), "monsters above your level give more")
	Game.progress["level"] = 3
	Game.progress["xp"] = 200
	var need := Game.xp_to_next()
	var lost := Game.death_penalty()
	_check(lost == int(need * Game.DEATH_XP_LOSS), "death costs 10%% of the level's XP (%d)" % lost)
	_check(int(Game.progress["xp"]) == 200 - lost and Game.level() == 3, "the XP is lost, the level kept")
	Game.progress["xp"] = 4
	_check(Game.death_penalty() == 4 and int(Game.progress["xp"]) == 0 and Game.level() == 3, "death never costs a level")


func _fen() -> void:
	await _hero()
	Game.area = "town"
	get_tree().change_scene_to_file("res://scenes/world.tscn")
	await _frames(30)
	var w = get_tree().current_scene
	var foes: Array = w.enemies()
	_check(foes.size() >= 10, "the fen has monsters (%d)" % foes.size())
	var inside := foes.filter(func(e): return w.grid.cell_of(e.global_position).y < Fen.START_ROW)
	_check(inside.is_empty(), "no monster inside the town walls")
	_check(foes.any(func(e): return e.elite), "packs have elite leaders")
	var spawn_dist := 999.0
	for e in foes:
		spawn_dist = minf(spawn_dist, e.global_position.distance_to(w.town_spawn()))
	_check(spawn_dist > 12.0, "no monster waits at the hero's arrival point (%.1f m)" % spawn_dist)
	Game.set_quest("silent_bell", 1)
	Game.run_action("accept_southwatch")
	var e = foes[0]
	e.take_damage(99999.0, false, Vector3.ZERO)
	await _frames(5)
	_check(Game.quest_counter("southwatch") == 1, "killing a fen monster counts for The Southwatch Fire")
	# Fen monsters never follow the hero through the town wall.
	var chaser = null
	for f in w.enemies():
		if is_instance_valid(f) and not f.dead:
			chaser = f
			break
	if chaser:
		chaser.hp = chaser.max_hp * 0.5
		chaser.set_aggro()
		w.player.global_position = w.grid.center(Vector2i(17, 12))
		await _frames(10)
		_check(not chaser.aggro, "a fen monster gives up the chase at the town wall")
		_check(is_equal_approx(chaser.hp, chaser.max_hp), "and recovers its life, as monsters do when they leash")
	w.hud.open_panel("quests")
	await _frames(2)
	_check(w.hud.panel_open() == "quests", "J opens the quest log")
	_check(w.hud.panel("quests").entry_count() == Game.quest_log().size(), "the quest log lists every quest")
	w.hud.close_panels()
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
	await _frames(5)
