extends RefCounted
## Passive skills: eight per class, worn in three slots that open at SLOT_LEVELS.
## `effect` maps a stat to a bonus that Game.passive_bonus() adds up:
##   damage (share more damage), life (share more life), armor (share more armor), crit (chance, 0..1),
##   crit_dmg (added to the crit multiplier), cdr (share shorter cooldowns, within the cap),
##   gain (share more resource on hit), cost (share cheaper skills), speed (share faster movement),
##   kill_heal (share of life back on a kill), resource_regen (share faster resource regeneration).

const SLOT_LEVELS := [3, 6, 10]

const PASSIVES := {
	"warrior": [
		{"id": "unbroken", "name": "Unbroken", "desc": "15% more life.", "effect": {"life": 0.15}},
		{"id": "grave_iron_skin", "name": "Grave-Iron Skin", "desc": "25% more armor.", "effect": {"armor": 0.25}},
		{"id": "wrath_of_the_buried", "name": "Wrath of the Buried", "desc": "Your primary skills build 50% more Wrath.", "effect": {"gain": 0.5}},
		{"id": "sextons_rhythm", "name": "Sexton's Rhythm", "desc": "Your skills are ready 10% sooner.", "effect": {"cdr": 0.1}},
		{"id": "executioner", "name": "Executioner", "desc": "Critical strikes deal 40% more damage.", "effect": {"crit_dmg": 0.4}},
		{"id": "ruthless", "name": "Ruthless", "desc": "5% more critical strike chance.", "effect": {"crit": 0.05}},
		{"id": "bloodied_oath", "name": "Bloodied Oath", "desc": "Each kill restores 3% of your life.", "effect": {"kill_heal": 0.03}},
		{"id": "iron_march", "name": "Iron March", "desc": "You move 8% faster.", "effect": {"speed": 0.08}},
	],
	"pyromancer": [
		{"id": "living_ember", "name": "Living Ember", "desc": "You deal 12% more damage.", "effect": {"damage": 0.12}},
		{"id": "ash_lungs", "name": "Ash Lungs", "desc": "Your mana returns 40% faster.", "effect": {"resource_regen": 0.4}},
		{"id": "kindled_mind", "name": "Kindled Mind", "desc": "Your skills cost 20% less mana.", "effect": {"cost": 0.2}},
		{"id": "wildfire", "name": "Wildfire", "desc": "6% more critical strike chance.", "effect": {"crit": 0.06}},
		{"id": "searing_focus", "name": "Searing Focus", "desc": "Critical strikes deal 35% more damage.", "effect": {"crit_dmg": 0.35}},
		{"id": "quickened_ash", "name": "Quickened Ash", "desc": "Your skills are ready 12% sooner.", "effect": {"cdr": 0.12}},
		{"id": "smouldering_hide", "name": "Smouldering Hide", "desc": "30% more armor.", "effect": {"armor": 0.3}},
		{"id": "pyre_born", "name": "Pyre-Born", "desc": "Each kill restores 2% of your life.", "effect": {"kill_heal": 0.02}},
	],
	"rogue": [
		{"id": "gutter_instinct", "name": "Gutter Instinct", "desc": "7% more critical strike chance.", "effect": {"crit": 0.07}},
		{"id": "knife_saints_edge", "name": "Knife-Saint's Edge", "desc": "Critical strikes deal 45% more damage.", "effect": {"crit_dmg": 0.45}},
		{"id": "venom_blood", "name": "Venom Blood", "desc": "Your primary skills build 50% more Venom.", "effect": {"gain": 0.5}},
		{"id": "light_feet", "name": "Light Feet", "desc": "You move 12% faster.", "effect": {"speed": 0.12}},
		{"id": "shadow_patience", "name": "Shadow Patience", "desc": "Your skills are ready 10% sooner.", "effect": {"cdr": 0.1}},
		{"id": "leech", "name": "Leech", "desc": "Each kill restores 3% of your life.", "effect": {"kill_heal": 0.03}},
		{"id": "scarred", "name": "Scarred", "desc": "12% more life.", "effect": {"life": 0.12}},
		{"id": "poisoner", "name": "Poisoner", "desc": "You deal 10% more damage.", "effect": {"damage": 0.1}},
	],
}


static func for_class(hero_class: String) -> Array:
	return PASSIVES.get(hero_class, PASSIVES["warrior"])


static func find(hero_class: String, id: String) -> Dictionary:
	for p in for_class(hero_class):
		if p["id"] == id:
			return p
	return {}


## Every passive id of every class (the asset test checks each has an icon).
static func all_ids() -> Array:
	var out := []
	for cls in PASSIVES:
		for p in PASSIVES[cls]:
			out.append(p["id"])
	return out
