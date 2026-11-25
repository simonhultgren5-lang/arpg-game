extends Node3D
## Something the hero can click or press E next to: an NPC, the crypt gate, the stairs up, a portal,
## and the quest objects of Act I (the unmarked grave, the wardens' plinth, name-stones, the undercroft stair).

## "npc", "gate", "stairs", "portal", "grave", "plinth", "stone" or "undercroft"
var kind := "npc"
## When set, the thing only shows (and can only be used) while this returns true.
var shown_when: Callable
var npc_id := ""
var display_name := ""
## How close the hero must stand to use it.
var radius := 2.4
## Optional "!" label shown when the NPC has something new to say.
var marker: Label3D = null
var marker_height := 2.7
var _t := 0.0


func _ready() -> void:
	add_to_group("interactables")


## Whether the hero can see and use it right now.
func available() -> bool:
	return visible and is_inside_tree()


func _process(delta: float) -> void:
	_t += delta
	if shown_when.is_valid():
		visible = bool(shown_when.call())
	if marker:
		marker.visible = kind == "npc" and Game.npc_has_news(npc_id)
		marker.position.y = marker_height + sin(_t * 3.0) * 0.08
