extends RefCounted
## Hero classes: base stats, basic attack and two skills each.
## kind: "arc" (melee sweep), "bolt" (projectile), "nova" (ring around the hero),
##       "pyre" (delayed blast at the cursor), "rush" (dash), "fan" (spread of projectiles), "blink" (teleport).

const CLASSES := {
	"warrior": {
		"title": "Warrior",
		"blurb": "Grave-iron and grim resolve. Strong in the press of bodies.",
		"hp": 120, "hp_per_level": 14, "mana": 40, "mana_per_level": 3, "mana_regen": 1.0,
		"dmg_min": 7, "dmg_max": 11, "armor": 12, "speed": 6.2,
		"resource": "Wrath", "mana_on_hit": 4,
		"basic": {"id": "grave_cleave", "name": "Grave Cleave", "kind": "arc", "range": 2.7, "arc": 140.0,
			"mult": 1.0, "cooldown": 0.62, "mana": 0, "color": Color(0.89, 0.71, 0.49),
			"desc": "A wide sweep that strikes every foe in front of you. Builds Wrath."},
		"skills": [
			{"id": "earthsplitter", "name": "Earthsplitter", "kind": "nova", "radius": 4.2, "mult": 1.8,
				"stun": 1.0, "cooldown": 4.0, "mana": 18, "color": Color(0.85, 0.62, 0.35),
				"desc": "Smash the ground: damages and stuns all foes around you."},
			{"id": "iron_rush", "name": "Iron Rush", "kind": "rush", "range": 8.0, "mult": 1.4,
				"cooldown": 6.0, "mana": 14, "color": Color(0.93, 0.83, 0.62),
				"desc": "Charge toward the cursor, battering everything in your path."},
		],
	},
	"pyromancer": {
		"title": "Pyromancer",
		"blurb": "Ash-sworn caster who carries a living ember in the ribs.",
		"hp": 85, "hp_per_level": 9, "mana": 90, "mana_per_level": 8, "mana_regen": 4.5,
		"dmg_min": 6, "dmg_max": 10, "armor": 4, "speed": 6.0,
		"resource": "Mana", "mana_on_hit": 0,
		"basic": {"id": "ember_bolt", "name": "Ember Bolt", "kind": "bolt", "range": 14.0, "speed": 19.0,
			"mult": 1.0, "cooldown": 0.55, "mana": 0, "color": Color(1.0, 0.55, 0.2),
			"desc": "Hurl a bolt of living ember at a foe."},
		"skills": [
			{"id": "cinder_nova", "name": "Cinder Nova", "kind": "nova", "radius": 5.0, "mult": 1.6,
				"knockback": 3.5, "cooldown": 5.0, "mana": 24, "color": Color(1.0, 0.42, 0.15),
				"desc": "A ring of fire bursts from you, hurling foes back."},
			{"id": "pyre", "name": "Pyre", "kind": "pyre", "radius": 3.0, "mult": 2.6, "burn": 0.45,
				"burn_time": 3.0, "delay": 0.55, "range": 16.0, "cooldown": 3.0, "mana": 28,
				"color": Color(1.0, 0.3, 0.08),
				"desc": "Call a pillar of flame at the cursor. The ground burns after."},
		],
	},
	"rogue": {
		"title": "Rogue",
		"blurb": "Knife-saint of the gutters. Strikes from the dark and is gone.",
		"hp": 95, "hp_per_level": 11, "mana": 50, "mana_per_level": 4, "mana_regen": 2.0,
		"dmg_min": 5, "dmg_max": 9, "armor": 7, "speed": 7.0,
		"resource": "Venom", "mana_on_hit": 3,
		"basic": {"id": "twin_cuts", "name": "Twin Cuts", "kind": "arc", "range": 2.3, "arc": 100.0,
			"mult": 0.9, "cooldown": 0.42, "mana": 0, "color": Color(0.79, 0.61, 0.95),
			"desc": "Quick paired slashes. Builds Venom."},
		"skills": [
			{"id": "knife_fan", "name": "Knife Fan", "kind": "fan", "count": 7, "spread": 60.0,
				"speed": 22.0, "range": 11.0, "mult": 0.9, "cooldown": 2.5, "mana": 16,
				"color": Color(0.75, 0.75, 0.85),
				"desc": "Throw a fan of seven knives toward the cursor."},
			{"id": "veilstep", "name": "Veilstep", "kind": "blink", "range": 9.0, "radius": 2.6,
				"mult": 1.2, "crit_window": 3.0, "cooldown": 5.0, "mana": 14,
				"color": Color(0.55, 0.35, 0.8),
				"desc": "Step through shadow to the cursor, cutting foes where you land. Your next hit is a critical strike."},
		],
	},
}


static func get_class_data(hero_class: String) -> Dictionary:
	return CLASSES.get(hero_class, CLASSES["warrior"])
