extends Node
## Renders the launcher's background film from the real game: a slow camera flight over Hollowmere at
## night, St. Aldric's chapel, the graveyard and the crypt gate, then a fight in the Southwatch Fen.
## Record it with Godot's movie maker, then encode it (scripts/render-launcher-film.mjs does both):
##   godot --path godot --write-movie C:/tmp/film.avi --fixed-fps 30 --resolution 1920x1080 res://tests/launcher_film.tscn
## Each shot fades through black, and the film starts and ends dark, so it loops cleanly.

const SHOT := 6.0
## Shots: [from position, to position, from look-at, to look-at] in world metres (2 m grid cells).
const SHOTS := [
	# The square at night, pushing in toward the chapel spire.
	[Vector3(35, 26, 52), Vector3(35, 17, 36), Vector3(35, 4, 22), Vector3(34, 9, 12)],
	# Low past the chapel front: torches, the rose window, the door.
	[Vector3(21, 5.0, 33), Vector3(47, 5.5, 31), Vector3(30, 5, 13), Vector3(38, 6, 13)],
	# The graveyard: gravestones, the mausoleum, the ember glow at the crypt gate.
	[Vector3(48, 7, 26), Vector3(56, 5, 20), Vector3(56, 1.5, 9), Vector3(58, 1.2, 10)],
	# The fen: a pack of the risen and the hero's spells, under the trees by the river.
	[Vector3(26, 14, 104), Vector3(30, 9, 96), Vector3(34, 0.5, 86), Vector3(35, 1.0, 84)],
]

var _cam: Camera3D
var _veil: ColorRect
var _t := 0.0
var _w: Node
var _hero_cast := 0.0


func _ready() -> void:
	if has_meta("runner"):
		_run()
		return
	var runner := Node.new()
	runner.set_script(get_script())
	runner.set_meta("runner", true)
	get_tree().root.add_child.call_deferred(runner)


func _run() -> void:
	Boot.set_test_hero("pyromancer")
	Boot.character["id"] = "launcher-film"
	await Game.load_hero()
	Game.progress = Game.new_progress()
	Game.progress["level"] = 8
	Game.area = "town"
	get_tree().change_scene_to_file("res://scenes/world.tscn")
	for i in 20:
		await get_tree().process_frame
	_w = get_tree().current_scene
	_w.hud.visible = false
	# A film has no interface: no damage numbers, loot names, NPC names or quest markers. These go to a
	# throwaway settings file, never the player's own.
	Settings.path = "user://launcher_film_settings.cfg"
	Settings.set_value("gameplay", "damage_numbers", false)
	Settings.set_value("gameplay", "loot_labels", false)
	for e in _w.enemies():
		e.queue_free()
	Dev.god_mode = true
	_cam = Camera3D.new()
	_cam.fov = 42.0
	_w.add_child(_cam)
	_cam.current = true
	var layer := CanvasLayer.new()
	layer.layer = 50
	_veil = ColorRect.new()
	_veil.color = Color.BLACK
	_veil.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(_veil)
	add_child(layer)
	# The fen fight: the hero and a pack of the risen at the river bend.
	var spot := Vector3(35, 0, 85)
	_w.player.global_position = spot
	for i in 5:
		var e = _w.spawn_enemy(["hollow", "hollow", "crawler", "archer", "hollow"][i], spot + Vector3(-4 + i * 2.0, 0, -5 + (i % 2) * 1.5), 3, i == 0)
		e.set_meta("where", "fen")
	set_process(true)


func _process(delta: float) -> void:
	if _cam == null:
		return
	_t += delta
	for l in _w.find_children("*", "Label3D", true, false):
		l.visible = false
	var total := SHOT * SHOTS.size()
	if _t >= total:
		DirAccess.remove_absolute(ProjectSettings.globalize_path(Settings.path))
		get_tree().quit(0)
		return
	var i := int(_t / SHOT)
	var k := (_t - i * SHOT) / SHOT
	var e := k * k * (3.0 - 2.0 * k)  # ease in and out
	var s: Array = SHOTS[i]
	_cam.global_position = (s[0] as Vector3).lerp(s[1], e)
	_cam.look_at((s[2] as Vector3).lerp(s[3], e), Vector3.UP)
	# Fade through black at each cut (0.6 s in, 0.6 s out).
	var fade := clampf(minf(k * SHOT / 0.6, (1.0 - k) * SHOT / 0.6), 0.0, 1.0)
	_veil.color.a = 1.0 - fade
	if i == 3:
		_hero_cast -= delta
		var p = _w.player
		p.mana = 999.0
		p.hp = 99999.0
		if _hero_cast <= 0.0:
			_hero_cast = 1.1
			for slot in [1, 2, 0]:
				p.reset_cooldowns()
				p.cast_slot(slot, false)
