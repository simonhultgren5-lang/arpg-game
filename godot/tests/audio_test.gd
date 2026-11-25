extends Node
## Instrument the real mixer with the Dummy driver on CI.
const Classes = preload("res://scripts/data/classes.gd")
var failures := 0


func check(ok: bool, label: String) -> void:
	if not ok:
		failures += 1
		push_error("FAIL audio: " + label)


func _ready() -> void:
	for hero in ["warrior", "rogue", "pyromancer"]:
		for skill in Classes.skills(hero):
			for suffix in ["", "_2", "_3"]:
				var stream := ActAudio._stream("spells", str(skill.id) + suffix) as AudioStreamWAV
				check(stream != null and stream.get_length() > 0.04, str(skill.id) + suffix)
	for id in ["title", "hollowmere", "sunken_crypt", "combat", "bell_warden"]:
		var score := ActAudio._stream("music", id) as AudioStreamWAV
		check(score != null and score.stereo, id)
	for id in ["wind", "drips", "cave", "forest", "rain"]:
		var bed := ActAudio._stream("ambience", id) as AudioStreamWAV
		check(bed != null and bed.stereo, id)
	var bus := AudioServer.get_bus_index("Effects")
	var tap := AudioEffectCapture.new()
	tap.buffer_length = 1.0
	AudioServer.add_bus_effect(bus, tap)
	ActAudio.cue("quest_accept", -12.0)
	await get_tree().create_timer(0.6).timeout
	var frames := tap.get_buffer(tap.get_frames_available())
	var peak := 0.0
	for frame in frames:
		peak = maxf(peak, maxf(absf(frame.x), absf(frame.y)))
	print("Effects capture: %d stereo frames, %.1f dBFS sample peak" % [frames.size(), linear_to_db(peak)])
	check(peak > 0.001 and peak < 1.0, "cue reaches Effects mixer")
	AudioServer.remove_bus_effect(bus, AudioServer.get_bus_effect_count(bus) - 1)
	var source := Node3D.new()
	add_child(source)
	var warning := ActAudio.cue("boss_prepare", -8.0, source)
	check(warning != null and absf(warning.stream.get_length() - 1.2) < 0.015, "Hask warning duration")
	ActAudio.play_area("crypt")
	ActAudio.combat(true)
	check(ActAudio.music_id() == "combat", "pack enters combat score")
	ActAudio.play_area("boss")
	ActAudio.boss_phase(false)
	ActAudio.boss_phase(true)
	check(ActAudio._boss_layer != null and ActAudio._boss_layer.playing, "enrage layer plays")
	ActAudio.combat(false)
	check(ActAudio.music_id() == "bell_warden", "boss takes precedence")
	ActAudio.play_area("crypt")
	await get_tree().create_timer(1.85).timeout
	var beds_and_scores := 0
	for child in ActAudio.get_children():
		if child is AudioStreamPlayer and child.bus in ["Music Mix", "Ambience Mix"]:
			beds_and_scores += 1
	check(beds_and_scores == 2, "superseded fades release old players")
	ActAudio._set_music("")
	ActAudio._set_ambience("")
	await get_tree().create_timer(1.9).timeout
	print("AUDIO TEST PASSED" if failures == 0 else "AUDIO TEST FAILED")
	get_tree().quit(0 if failures == 0 else 1)
