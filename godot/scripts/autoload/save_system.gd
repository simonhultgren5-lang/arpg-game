extends Node
## SaveSystem: loads and saves the hero's progress as one JSON blob.
##
## Offline: user://saves/<character id>.json
## Online:  GET/PUT <serverUrl>/api/characters/<id>/save with "Authorization: Bearer <token>".
##          The server only keeps string values under keys starting with "dod", so the blob is sent as
##          {"data": {"dod3d": "<progress JSON>"}, "meta": {"heroLevel": n, "depth": n}}.
##          A local copy is kept as user://saves/online-<id>.json in case the server is unreachable.

signal status_changed(text: String)

const SAVE_KEY := "dod3d"
const SAVE_DIR := "user://saves"

var last_status := ""
var _pending := 0


func _local_path() -> String:
	var id := str(Boot.character.get("id", "unknown")).validate_filename()
	if Boot.is_online():
		id = "online-" + id
	return "%s/%s.json" % [SAVE_DIR, id]


## Returns the saved progress, or an empty Dictionary for a new hero.
func load_progress() -> Dictionary:
	var local := _read_local()
	if not Boot.is_online():
		return local
	var url := "%s/api/characters/%s/save" % [Boot.server_url, str(Boot.character["id"]).uri_encode()]
	var res: Array = await _request(url, HTTPClient.METHOD_GET, "")
	if res[0] != OK:
		_status("Server unreachable: playing from the local copy.")
		return local
	var code: int = res[1]
	if code != 200:
		_status("Server refused the save (%d): playing from the local copy." % code)
		return local
	var body = JSON.parse_string(res[2])
	if not (body is Dictionary):
		return local
	var save = body.get("save")
	if save == null:
		return {}  # a brand-new character on the server
	if save is Dictionary and save.get("data") is Dictionary:
		var blob = save["data"].get(SAVE_KEY)
		if blob is String:
			var parsed = JSON.parse_string(blob)
			if parsed is Dictionary:
				return parsed
	# The character exists but has no 3D progress yet (for example a hero from the 2D game).
	return {}


func save_progress(progress: Dictionary) -> void:
	var text := JSON.stringify(progress)
	_write_local(text)
	if not Boot.is_online():
		return
	var url := "%s/api/characters/%s/save" % [Boot.server_url, str(Boot.character["id"]).uri_encode()]
	var payload := {
		"data": {SAVE_KEY: text},
		"meta": {"heroLevel": int(progress.get("level", 1)), "depth": int(progress.get("depth", 1))},
	}
	_pending += 1
	var res: Array = await _request(url, HTTPClient.METHOD_PUT, JSON.stringify(payload))
	_pending -= 1
	if res[0] != OK or int(res[1]) != 200:
		_status("Cloud save failed: progress is kept locally.")
	else:
		_status("")


## Waits (up to timeout seconds) until online saves have finished. Used before quitting.
func flush(timeout := 4.0) -> void:
	var waited := 0.0
	while _pending > 0 and waited < timeout:
		await get_tree().create_timer(0.1).timeout
		waited += 0.1


func _read_local() -> Dictionary:
	var path := _local_path()
	if not FileAccess.file_exists(path):
		return {}
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(path))
	return parsed if parsed is Dictionary else {}


func _write_local(text: String) -> void:
	DirAccess.make_dir_recursive_absolute(SAVE_DIR)
	var path := _local_path()
	var tmp := path + ".tmp"
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		push_warning("Could not write save file %s" % tmp)
		return
	f.store_string(text)
	f.close()
	DirAccess.rename_absolute(tmp, path)


## Returns [error, http code, body text].
func _request(url: String, method: int, body: String) -> Array:
	var http := HTTPRequest.new()
	http.timeout = 8.0
	add_child(http)
	var headers := PackedStringArray([
		"Authorization: Bearer " + Boot.token,
		"Content-Type: application/json",
		"Accept: application/json",
	])
	var err := http.request(url, headers, method, body)
	if err != OK:
		http.queue_free()
		return [err, 0, ""]
	var res: Array = await http.request_completed
	http.queue_free()
	var result: int = res[0]
	if result != HTTPRequest.RESULT_SUCCESS:
		return [FAILED, 0, ""]
	var bytes: PackedByteArray = res[3]
	return [OK, int(res[1]), bytes.get_string_from_utf8()]


func _status(text: String) -> void:
	last_status = text
	status_changed.emit(text)
