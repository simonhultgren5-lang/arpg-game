extends Node3D
## A bolt, knife or arrow. Moves in a straight line, hits the first foe of the other team (or several
## when `pierce` > 0) and stops at walls. Uses the level grid instead of physics.

const Fx = preload("res://scripts/world/fx.gd")
const B = preload("res://scripts/world/build.gd")

var world: Node3D
var team := "player"  # "player" hits enemies, "enemy" hits the hero
var dir := Vector3.FORWARD
var speed := 18.0
var damage := 10.0
var crit := false
var max_dist := 14.0
var hit_radius := 0.6
var pierce := 0
## On-hit effects (world.effects_of): stun, knockback, slow, burn.
var effects := {}
var color := Color(1, 0.5, 0.2)
var style := "bolt"  # "bolt", "knife", "arrow"
var _travelled := 0.0
var _hit := {}


func setup() -> void:
	match style:
		"bolt":
			B.sphere(0.22, B.mat(color, 1.0, color, 5.0), Vector3.ZERO, self, 8)
			B.omni(color, 2.0, 4.5, Vector3.ZERO, self)
		"knife":
			var k := B.box(Vector3(0.06, 0.04, 0.5), B.mat(Color(0.8, 0.8, 0.85), 0.3, Color(0.4, 0.4, 0.5), 1.0, 0.8), Vector3.ZERO, self)
			k.name = "Blade"
		"arrow":
			B.box(Vector3(0.05, 0.05, 0.8), B.mat(Color(0.5, 0.45, 0.35), 0.8, color, 1.5), Vector3.ZERO, self)
	look_at(global_position + dir, Vector3.UP)


func _physics_process(delta: float) -> void:
	var step := speed * delta
	global_position += dir * step
	_travelled += step
	if style == "knife":
		rotate_object_local(Vector3.FORWARD, delta * 20.0)
	if _travelled > max_dist or not world.grid.walkable_at(global_position) and world.grid.get_cell(world.grid.cell_of(global_position)) == 0:
		_impact()
		return
	if team == "player":
		for e in world.enemies():
			if _hit.has(e):
				continue
			var d := Vector2(e.global_position.x - global_position.x, e.global_position.z - global_position.z).length()
			if d < hit_radius + e.radius:
				_hit[e] = true
				e.take_damage(damage, crit, dir)
				if style == "bolt":
					ActAudio.cue("ember_impact", -16.0, e, 80)
				world.apply_effects(e, dir, effects, damage, world.player)
				if pierce <= 0:
					_impact()
					return
				pierce -= 1
	else:
		var p: Node3D = world.player
		if p and not p.dead:
			var d := Vector2(p.global_position.x - global_position.x, p.global_position.z - global_position.z).length()
			if d < hit_radius + 0.4:
				p.take_damage(damage)
				_impact()


func _impact() -> void:
	if style == "bolt":
		Fx.ring(world, global_position - Vector3(0, global_position.y, 0), 1.4, color, 0.25)
	set_physics_process(false)
	queue_free()
