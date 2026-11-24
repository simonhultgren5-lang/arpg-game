extends Node
## Round-trips a save through a running game server. Needs a boot file with serverUrl and token
## for an existing character:
##   godot --headless --path godot res://tests/online_save_test.tscn -- --character-json boot.json


func _ready() -> void:
	var ok := true
	if not Boot.is_online():
		print("FAIL: the boot file has no serverUrl/token")
		get_tree().quit(1)
		return
	await Game.load_hero()
	print("loaded level ", Game.level(), " quest ", Game.quest_state())
	var marker := randi() % 100000
	Game.progress["level"] = 3
	Game.progress["gold"] = marker
	Game.progress["depth"] = 2
	Game.progress["quests"]["silent_bell"] = 2
	Game.save()
	await SaveSystem.flush()
	if SaveSystem.last_status != "":
		print("FAIL: save status: ", SaveSystem.last_status)
		ok = false
	# Remove the local copy so the reload must come from the server.
	DirAccess.remove_absolute("user://saves/online-%s.json" % Boot.character["id"])
	var loaded: Dictionary = await SaveSystem.load_progress()
	if int(loaded.get("gold", -1)) != marker or int(loaded.get("level", 0)) != 3 or int(loaded.get("quests", {}).get("silent_bell", 0)) != 2:
		print("FAIL: server returned ", loaded)
		ok = false
	print("ONLINE SAVE TEST ", "PASSED" if ok else "FAILED")
	get_tree().quit(0 if ok else 1)
