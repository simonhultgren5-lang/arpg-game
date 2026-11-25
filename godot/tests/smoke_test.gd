extends Node
## Headless smoke test: plays the Act I slice for every class without a human.
##   godot --headless --path godot res://tests/smoke_test.tscn
## Exits with code 0 when everything passed, 1 otherwise.

var _failures := PackedStringArray()


func _ready() -> void:
	if has_meta("runner"):
		_run()
		return
	# Run from a node under the root so scene changes don't free the test.
	var runner := Node.new()
	runner.name = "SmokeRunner"
	runner.set_script(get_script())
	runner.set_meta("runner", true)
	get_tree().root.add_child.call_deferred(runner)


func _check(cond: bool, what: String) -> void:
	if cond:
		print("  ok   ", what)
	else:
		print("  FAIL ", what)
		_failures.append(what)


func _frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame


func _world() -> Node:
	return get_tree().current_scene


func _run() -> void:
	if Boot.from_launcher:
		print("== launcher boot")
		_check(Boot.character["name"] == "Smoke Edda" and Boot.character["heroClass"] == "rogue" and Boot.character["color"] == "#336699", "boot file read (%s)" % str(Boot.character))
		_check(not Boot.is_online(), "no server in the boot file means offline")
	for hero_class in ["warrior", "pyromancer", "rogue"]:
		print("== ", hero_class)
		Boot.set_test_hero(hero_class)
		Boot.character["id"] = "smoke-" + hero_class
		# start fresh
		var path := "user://saves/%s.json" % Boot.character["id"]
		if FileAccess.file_exists(path):
			DirAccess.remove_absolute(path)
		await Game.load_hero()
		_check(Game.level() == 1 and Game.progress["equipped"]["weapon"] is Dictionary, "new hero with a starter weapon")
		Game.area = "town"
		get_tree().change_scene_to_file("res://scenes/world.tscn")
		await _frames(20)
		var w := _world()
		_check(w != null and w.player != null, "town loaded with hero")
		_check(w.grid.walkable_at(w.player.global_position), "hero spawns on walkable ground")
		# walk somewhere by path
		var start: Vector3 = w.player.global_position
		w.player._path_to(start + Vector3(0, 0, -8))
		await _frames(90)
		_check(w.player.global_position.distance_to(start) > 3.0, "click-to-move path walks the hero")
		# talk to Maud and accept the quest
		w.hud.open_dialogue("maud")
		_check(w.hud.is_blocking(), "dialogue opens")
		Game.run_action("accept_quest")
		w.hud.close_dialogue()
		_check(Game.quest_state() == 1, "quest accepted")
		# skills 3 and 4 are locked at level 1
		w.player.mana = 999.0
		w.player.cast_skill(2)
		w.player.cast_skill(3)
		_check(w.player.skill_cd[2] == 0.0 and w.player.skill_cd[3] == 0.0, "skills 3 and 4 locked at level 1")
		# skills in town (no enemies) must not error
		w.player.cast_skill(0)
		await _frames(5)
		w.player.cast_skill(1)
		await _frames(40)
		w.player.drink_potion()
		# into the catacomb
		Game.enter_area("catacomb")
		await _frames(30)
		w = _world()
		var foes: Array = w.enemies()
		_check(foes.size() >= 8, "catacomb has monsters (%d)" % foes.size())
		_check(w.boss != null, "boss spawned")
		_check(w.grid.walkable_at(w.player.global_position), "hero spawns in the crypt")
		var reach: PackedVector3Array = w.grid.find_path(w.player.global_position, w.boss.global_position)
		_check(reach.size() > 0, "boss room reachable from the entry")
		# fight: put the hero next to a monster and attack it
		var e: Node3D = foes[0]
		if e == w.boss and foes.size() > 1:
			e = foes[1]
		w.player.global_position = e.global_position + Vector3(1.2, 0, 0)
		w.player._target_enemy = e
		w.player.mana = 999.0
		var hp0: float = e.hp
		await _frames(60)
		_check(not is_instance_valid(e) or e.dead or e.hp < hp0, "basic attack damages a monster")
		w.player.cast_skill(0)
		w.player.skill_cd = [0.0, 0.0, 0.0, 0.0]
		w.player.cast_skill(1)
		await _frames(60)
		w.player.hp = 9999.0
		# kill the boss
		var xp_before: int = Game.level() * 100000 + int(Game.progress["xp"])
		var boss: Node3D = w.boss
		w.player.global_position = boss.global_position + Vector3(2.5, 0, 0)
		await _frames(10)
		for i in 60:
			if not is_instance_valid(boss) or boss.dead:
				break
			boss.take_damage(40.0, false, Vector3.ZERO)
			w.player.hp = 9999.0
			await _frames(2)
		await _frames(10)
		_check(Game.quest_state() == 2, "boss slain: clapper taken")
		_check(Game.level() * 100000 + int(Game.progress["xp"]) > xp_before, "xp gained")
		_check(_loot(w).size() > 0, "boss dropped loot")
		# walk over loot to pick it up
		var inv_before: int = Game.inventory().size()
		for l in _loot(w):
			if is_instance_valid(l):
				w.player.global_position = l.global_position
				await _frames(3)
		_check(Game.inventory().size() > inv_before, "items picked up")
		# equip an item
		for i in Game.inventory().size():
			if Game.inventory()[i].get("slot") != "quest":
				Game.equip(i)
				break
		# back to town via the portal and hand in the quest
		var portal: Node3D = null
		for it in w._interactables:
			if is_instance_valid(it) and it.kind == "portal":
				portal = it
		_check(portal != null, "return portal opened")
		w.interact(portal)
		await _frames(20)
		w = _world()
		_check(Game.area == "town", "back in town")
		Game.run_action("complete_quest")
		_check(Game.quest_state() == 3, "quest complete")
		w = await _act_one_story(w, hero_class)
		# death and respawn
		w.player.take_damage(1.0e6)
		await _frames(5)
		_check(w.player.dead and w.hud.is_blocking(), "death panel shows")
		w.respawn_in_town()
		await _frames(20)
		Game.save()
		await _frames(5)
		_check(FileAccess.file_exists(path), "offline save written")
		var saved = JSON.parse_string(FileAccess.get_file_as_string(path))
		_check(saved is Dictionary and int(saved.get("quests", {}).get("silent_bell", 0)) == 3, "save holds quest state")
		_check(saved is Dictionary and int(saved.get("quests", {}).get("act_end", 0)) == 2 and int(saved["quests"].get("wardens", 0)) == 3, "save holds the Act I ending and the Wardens' Oath")
		Game.loaded = false
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
	await _frames(10)
	print("")
	if _failures.is_empty():
		print("SMOKE TEST PASSED")
		get_tree().quit(0)
	else:
		print("SMOKE TEST FAILED: ", ", ".join(_failures))
		get_tree().quit(1)


func _find(w: Node, kind: String, npc_id := "") -> Node3D:
	for it in w._interactables:
		if is_instance_valid(it) and it.kind == kind and (npc_id == "" or it.npc_id == npc_id):
			return it
	return null


func _has_item(uid_or_unique: String) -> bool:
	for item in Game.inventory():
		if item.get("uid", "") == uid_or_unique or item.get("unique", "") == uid_or_unique:
			return true
	return false


func _equip(unique_id: String) -> void:
	for i in Game.inventory().size():
		if Game.inventory()[i].get("unique", "") == unique_id:
			Game.equip(i)
			return


## The rest of Act I after The Silent Bell: Lamps Without Oil, The Wardens' Oath, skills 3 and 4,
## the uniques and the act's end. Returns the town world it ends in.
func _act_one_story(w: Node, hero_class: String) -> Node:
	# Lamps Without Oil
	await _frames(2)  # quest objects show or hide on the next frame
	var lamplighter := _find(w, "npc", "lamplighter")
	_check(lamplighter != null and lamplighter.available(), "the Lamplighter appears once the bell is silent")
	_check(Game.npc_has_news("lamplighter") and Game.dialogue_entry("lamplighter") == "lamp_0", "the Lamplighter has something to ask")
	w.hud.open_dialogue("lamplighter")
	Game.run_action("accept_lamps")
	w.hud.close_dialogue()
	_check(Game.quest("lamps") == 1, "Lamps Without Oil accepted")
	var grave := _find(w, "grave")
	_check(grave != null, "the unmarked grave is in the graveyard")
	w.interact(grave)
	_check(Game.quest("lamps") == 2 and _has_item("founders_charter"), "digging the grave finds the Founders' Charter")
	_check(Game.dialogue_entry("maud") == "maud_l2", "Maud reads the charter")
	Game.run_action("complete_lamps")
	_check(Game.quest("lamps") == 3 and Game.quest("act_end") == 1, "Lamps Without Oil done: the wells toll")
	_check(not _has_item("founders_charter") and _has_item("lamplighters_wick"), "the charter goes to Maud; the Wick is the reward")
	await _frames(2)
	var stair := _find(w, "undercroft")
	_check(stair != null and stair.available(), "the undercroft stair opens")
	# The Wardens' Oath (optional)
	_check(Game.check_condition("wardens_offer"), "Corwin offers the Wardens' Oath")
	Game.run_action("accept_wardens")
	_check(Game.quest("wardens") == 1 and Game.dialogue_entry("corwin") == "corwin_w1", "the Wardens' Oath accepted")
	Game.enter_area("catacomb")
	await _frames(30)
	w = _world()
	var stones := []
	for it in w._interactables:
		if is_instance_valid(it) and it.kind == "stone":
			stones.append(it)
	_check(stones.size() == Game.WARDEN_STONES, "%d name-stones lie in the crypt" % stones.size())
	# Skills 3 and 4 at level 5, next to a monster.
	Game.progress["level"] = 5
	w.player.mana = 999.0
	w.player.hp = 9999.0
	_check(w.player.skill_unlocked(2) and w.player.skill_unlocked(3), "skills 3 and 4 unlock by level 5")
	var foe: Node3D = null
	for f in w.enemies():
		if f != w.boss:
			foe = f
			break
	if foe:
		w.player.global_position = foe.global_position + Vector3(1.0, 0, 0)
		var hp0: float = foe.hp
		w.player.cast_skill(2)
		await _frames(10)
		w.player.cast_skill(3)
		await _frames(110)
		_check(w.player.skill_cd[2] > 0.0 or w.player.skill_cd[3] > 0.0, "skills 3 and 4 cast (%s)" % hero_class)
		_check(not is_instance_valid(foe) or foe.dead or foe.hp < hp0 or hero_class == "pyromancer" and w.player.ward > 0.0, "skills 3 and 4 hurt or ward (%s)" % hero_class)
	for st in stones:
		if is_instance_valid(st):
			w.interact(st)
	_check(Game.quest("wardens") == 2 and Game.warden_stones() == Game.WARDEN_STONES, "all name-stones taken")
	# Uniques: the Warden's Vigil (later), Hask's Toll and the Wick's powers.
	Game.add_item(preload("res://scripts/data/items.gd").make_unique("hasks_toll"))
	_equip("hasks_toll")
	_check(Game.has_unique("hasks_toll"), "a unique can be equipped")
	Game.enter_area("town")
	await _frames(20)
	w = _world()
	w.interact(_find(w, "plinth"))
	_check(Game.quest("wardens") == 3 and _has_item("wardens_vigil"), "the stones go back: the Warden's Vigil")
	_equip("wardens_vigil")
	w.player.hp = Game.max_hp() * 0.5
	w.player.take_damage(Game.max_hp() * 0.4)
	_check(w.player.ward > 0.0 or w.player.hp > Game.max_hp() * 0.3, "the Warden's Vigil wards a heavy blow")
	w.player.hp = Game.max_hp()
	# The end of Act I
	w.interact(_find(w, "undercroft"))
	await _frames(2)
	_check(Game.quest("act_end") == 2 and w.hud.is_blocking() and get_tree().paused, "the undercroft stair ends Act I")
	_check(Game.main_quest()[0] == "Act I Complete", "the quest log says Act I is complete")
	w.hud._act_complete.visible = false
	get_tree().paused = false
	return w


func _loot(w: Node) -> Array:
	var out := []
	for c in w.get_children():
		if c.get_script() == preload("res://scripts/actors/loot.gd"):
			out.append(c)
	return out
