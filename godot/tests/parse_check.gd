extends Node
## Compile check: loads every GDScript file in the project and fails if one doesn't parse.
##   godot --headless --path godot res://tests/parse_check.tscn
## Exits with code 0 when every script compiles, 1 otherwise. Used by the build pipeline.


func _ready() -> void:
	var files := PackedStringArray()
	_collect("res://", files)
	var failed := PackedStringArray()
	for path in files:
		var script = load(path)
		if script == null or not (script is GDScript) or not script.can_instantiate():
			failed.append(path)
			print("  FAIL ", path)
	print("PARSE CHECK %s: %d scripts%s" % [
		"PASSED" if failed.is_empty() else "FAILED", files.size(),
		"" if failed.is_empty() else ", failed: " + ", ".join(failed),
	])
	get_tree().quit(0 if failed.is_empty() else 1)


func _collect(dir_path: String, out: PackedStringArray) -> void:
	var dir := DirAccess.open(dir_path)
	if dir == null:
		return
	for name in dir.get_directories():
		if name.begins_with(".") or name == "build" or name == "addons":
			continue
		_collect(dir_path.path_join(name), out)
	for name in dir.get_files():
		if name.ends_with(".gd"):
			out.append(dir_path.path_join(name))
