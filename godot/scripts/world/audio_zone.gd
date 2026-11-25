extends Area3D
class_name HollowmereAudioZone
## Add a CollisionShape3D and set collision_mask to the hero's layer. Overlapping
## zones use Area3D.priority (higher wins). Leave a field blank to inherit it.

@export_enum("", "stone", "dirt", "wood", "grass", "snow") var surface: String = ""
@export_enum("", "wind", "drips", "cave", "forest", "rain") var bed: String = ""
@export var thunder_enabled := false


func _ready() -> void:
	add_to_group("audio_zones")
