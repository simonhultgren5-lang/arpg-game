extends Node
## Scene-owned playback stops with the actor, dialogue panel or guide that started it.
## Also plays the music and ambience (see play_area), which belong to this autoload, not a scene.

const MUSIC_DB := -15.0
const AMBIENCE_DB := -19.0
const FADE := 1.6

var _voice: AudioStreamPlayer
var _next_bark := 0
var _last_take := {}
var _repeat_after := {}
var _rng := RandomNumberGenerator.new()
var _music: AudioStreamPlayer
var _ambience: AudioStreamPlayer
var _music_id := ""
var _ambience_id := ""
var _streams := {}
var _cue_after := {}
var _fades := {}
var _boss_layer: AudioStreamPlayer
var _warning: AudioStreamPlayer3D
var _duck_db := 0.0
const BANK := "res://assets/audio/hollowmere/"


func _ready() -> void:
	# Fades keep running in the pause menu and on the Act I complete screen.
	process_mode = Node.PROCESS_MODE_ALWAYS
	get_tree().node_added.connect(_wire_button)


func _process(delta: float) -> void:
	var warning_active := is_instance_valid(_warning) and _warning.playing and not _warning.stream_paused
	var voice_active := is_instance_valid(_voice) and _voice.playing and not _voice.stream_paused
	var target := -4.0 if warning_active else (-3.0 if voice_active else 0.0)
	if is_equal_approx(target, _duck_db):
		return
	_duck_db = move_toward(_duck_db, target, delta * (80.0 if target < _duck_db else 8.0))
	for bus in ["Music Mix", "Ambience Mix"]:
		var index := AudioServer.get_bus_index(bus)
		if index >= 0:
			AudioServer.set_bus_volume_db(index, _duck_db)


func _wire_button(node: Node) -> void:
	if node is BaseButton:
		node.pressed.connect(_button_sound)
		node.mouse_entered.connect(_button_hover.bind(node))


func _button_hover(button: BaseButton) -> void:
	if not button.disabled:
		cue("ui_hover", -26.0, null, 60)


func _button_sound() -> void:
	cue("ui_click", -18.0)


func _stream(folder: String, id: String) -> AudioStream:
	var path := BANK + folder + "/" + id + ".wav"
	if not _streams.has(path):
		_streams[path] = load(path) if ResourceLoader.exists(path) else null
	return _streams[path]


func cue(id: String, db: float, source: Node3D = null, cooldown_ms := 0) -> AudioStreamPlayer3D:
	var now := Time.get_ticks_msec()
	if now < int(_cue_after.get(id, 0)):
		return null
	var stream := _stream("sfx", id)
	if stream == null:
		return null
	_cue_after[id] = now + cooldown_ms
	if source:
		var spatial := _spatial(stream, db, source, id.begins_with("boss_"))
		if id == "boss_prepare":
			_warning = spatial
		return spatial
	var player := AudioStreamPlayer.new()
	player.stream = stream
	player.bus = _bus("ambience" if id == "thunder" else "sfx")
	player.volume_db = db
	if id == "thunder" and get_tree().current_scene:
		player.process_mode = Node.PROCESS_MODE_PAUSABLE
		get_tree().current_scene.add_child(player)
	else:
		add_child(player)
	player.finished.connect(player.queue_free)
	player.play()
	return null


func _spatial(stream: AudioStream, db: float, source: Node3D, priority := false) -> AudioStreamPlayer3D:
	if not priority and get_tree().get_node_count_in_group("world_audio_voices") >= 28:
		return null
	var player := AudioStreamPlayer3D.new()
	player.stream = stream
	player.bus = _bus("sfx")
	player.volume_db = db
	player.unit_size = 4.0
	player.max_distance = 35.0
	player.panning_strength = 0.75
	player.top_level = true
	source.add_child(player)
	player.global_position = source.global_position
	player.add_to_group("world_audio_voices")
	player.finished.connect(player.queue_free)
	player.play()
	return player


func stop_voice(owner_node: Node) -> void:
	if is_instance_valid(_voice) and _voice.get_parent() == owner_node:
		_voice.stop()
		_voice.queue_free()
		_voice = null


func voice(owner_node: Node, id: String, interrupt := false) -> void:
	if not _exists("voice", id):
		return  # not every line is recorded
	var now := Time.get_ticks_msec()
	if not interrupt and (now < _next_bark or now < _repeat_after.get(id, 0) or (is_instance_valid(_voice) and _voice.playing)):
		return
	if is_instance_valid(_voice):
		stop_voice(_voice.get_parent())
	_voice = _play(owner_node, "voice", id, -3.0)
	_next_bark = now + _rng.randi_range(6500, 10000)
	_repeat_after[id] = now + _rng.randi_range(16000, 23000)


func spell(owner_node: Node, id: String) -> void:
	# Pick one of the other two recorded mixes so adjacent casts sound different.
	var take := (int(_last_take.get(id, _rng.randi_range(0, 2))) + _rng.randi_range(1, 2)) % 3
	_last_take[id] = take
	var clip := id if take == 0 else "%s_%d" % [id, take + 1]
	var stream := _stream("spells", clip)
	if stream and owner_node is Node3D:
		_spatial(stream, _rng.randf_range(-13.0, -11.0), owner_node)
	elif _exists("spells", clip):
		_play(owner_node, "spells", clip, -11.0)
	voice(owner_node, id)


# ------------------------------------------------------------------ music and ambience

## Music and ambience for an area: "town", "crypt", "boss" or "title". Crossfades from what plays now.
func play_area(area: String) -> void:
	if area != "boss" and is_instance_valid(_boss_layer):
		_boss_layer = _crossfade(_boss_layer, "music", "", MUSIC_DB)
	match area:
		"opening":
			_set_music("")
			_set_ambience("")
		"town":
			_set_music("hollowmere")
			_set_ambience("wind")
		"crypt":
			_set_music("sunken_crypt")
			_set_ambience("drips")
		"boss":
			_set_music("bell_warden")
		"title":
			_set_music("title")
			_set_ambience("")


func music_id() -> String:
	return _music_id


func combat(active: bool) -> void:
	if _music_id in ["sunken_crypt", "combat"]:
		_set_music("combat" if active else "sunken_crypt")


func boss_phase(enraged: bool) -> void:
	if _music_id == "bell_warden" and is_instance_valid(_music):
		var layer_id := "boss_enrage" if enraged else "boss_summon"
		_boss_layer = _crossfade(_boss_layer, "music", layer_id, MUSIC_DB - 6.0, _music.get_playback_position())


## Level/weather volumes may select authored beds when those environments are present.
func environment(id: String) -> void:
	if id in ["wind", "drips", "cave", "forest", "rain"]:
		_set_ambience(id)


func _set_music(id: String) -> void:
	if id == _music_id:
		return
	_music_id = id
	_music = _crossfade(_music, "music", id, MUSIC_DB)


func _set_ambience(id: String) -> void:
	if id == _ambience_id:
		return
	_ambience_id = id
	_ambience = _crossfade(_ambience, "ambience", id, AMBIENCE_DB)


func _crossfade(old: AudioStreamPlayer, folder: String, id: String, volume: float, offset := 0.0) -> AudioStreamPlayer:
	if is_instance_valid(old):
		var previous: Tween = _fades.get(old.get_instance_id())
		if previous and previous.is_valid():
			previous.kill()
		_fades.erase(old.get_instance_id())
		var out := create_tween()
		out.tween_property(old, "volume_db", -60.0, FADE)
		out.tween_callback(old.queue_free)
	if id == "":
		return null
	var stream := _stream(folder, id)
	if stream == null and _exists(folder, id):
		stream = load("res://assets/audio/%s/%s.wav" % [folder, id])
	if stream == null:
		return null
	var p := AudioStreamPlayer.new()
	p.stream = stream
	if p.stream is AudioStreamWAV:
		# Loop the whole file (the generated tracks are made to loop seamlessly).
		var wav: AudioStreamWAV = p.stream
		wav.loop_mode = AudioStreamWAV.LOOP_FORWARD
		wav.loop_begin = 0
		wav.loop_end = roundi(wav.get_length() * wav.mix_rate)
	p.volume_db = -60.0
	var mix_bus := _bus(folder) + " Mix"
	p.bus = mix_bus if AudioServer.get_bus_index(mix_bus) >= 0 else _bus(folder)
	p.process_mode = Node.PROCESS_MODE_ALWAYS  # keeps playing in the pause menu
	add_child(p)
	p.play(fposmod(offset, stream.get_length()))
	var fade_in := create_tween()
	_fades[p.get_instance_id()] = fade_in
	fade_in.tween_property(p, "volume_db", volume, FADE)
	return p


func _exists(folder: String, id: String) -> bool:
	return ResourceLoader.exists("res://assets/audio/%s/%s.wav" % [folder, id])


func _play(owner_node: Node, folder: String, id: String, volume: float) -> AudioStreamPlayer:
	var player := AudioStreamPlayer.new()
	player.stream = load("res://assets/audio/%s/%s.wav" % [folder, id])
	player.volume_db = volume
	player.bus = _bus(folder)
	owner_node.add_child(player)
	player.finished.connect(player.queue_free)
	player.play()
	return player


## The audio bus a kind of sound plays on (Settings sets their volumes); Master if it doesn't exist yet.
func _bus(folder: String) -> String:
	var bus: String = {"music": "Music", "ambience": "Ambience", "voice": "Voice"}.get(folder, "Effects")
	return bus if AudioServer.get_bus_index(bus) >= 0 else "Master"
