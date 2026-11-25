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
	if not _exists("spells", id):
		return
	# Pick one of the other two recorded mixes so adjacent casts sound different.
	var take := (int(_last_take.get(id, _rng.randi_range(0, 2))) + _rng.randi_range(1, 2)) % 3
	_last_take[id] = take
	var clip := id if take == 0 else "%s_%d" % [id, take + 1]
	if not _exists("spells", clip):
		clip = id
	_play(owner_node, "spells", clip, _rng.randf_range(-8.5, -7.0))
	voice(owner_node, id)


## A single deep bell toll (Hask's toll, the wells, the end of the act).
func toll(owner_node: Node) -> void:
	if _exists("sfx", "toll"):
		_play(owner_node, "sfx", "toll", -6.0)


# ------------------------------------------------------------------ music and ambience

## Music and ambience for an area: "town", "crypt", "boss" or "title". Crossfades from what plays now.
func play_area(area: String) -> void:
	match area:
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


func _crossfade(old: AudioStreamPlayer, folder: String, id: String, volume: float) -> AudioStreamPlayer:
	if is_instance_valid(old):
		var out := create_tween()
		out.tween_property(old, "volume_db", -60.0, FADE)
		out.tween_callback(old.queue_free)
	if id == "" or not _exists(folder, id):
		return null
	var p := AudioStreamPlayer.new()
	p.stream = load("res://assets/audio/%s/%s.wav" % [folder, id])
	if p.stream is AudioStreamWAV:
		# Loop the whole file (the generated tracks are made to loop seamlessly).
		var wav: AudioStreamWAV = p.stream
		wav.loop_mode = AudioStreamWAV.LOOP_FORWARD
		wav.loop_begin = 0
		wav.loop_end = wav.data.size() / (2 if wav.format == AudioStreamWAV.FORMAT_16_BITS else 1) / (2 if wav.stereo else 1)
	p.volume_db = -60.0
	p.process_mode = Node.PROCESS_MODE_ALWAYS  # keeps playing in the pause menu
	add_child(p)
	p.play()
	var fade_in := create_tween()
	fade_in.tween_property(p, "volume_db", volume, FADE)
	return p


func _exists(folder: String, id: String) -> bool:
	return ResourceLoader.exists("res://assets/audio/%s/%s.wav" % [folder, id])


func _play(owner_node: Node, folder: String, id: String, volume: float) -> AudioStreamPlayer:
	var player := AudioStreamPlayer.new()
	player.stream = load("res://assets/audio/%s/%s.wav" % [folder, id])
	player.volume_db = volume
	owner_node.add_child(player)
	player.finished.connect(player.queue_free)
	player.play()
	return player
