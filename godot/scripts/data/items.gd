extends RefCounted
## Item generation. Items are plain Dictionaries so they save as JSON:
## {uid, name, slot, rarity, ilvl, stats: {damage, armor, life, mana, crit, speed}}
## Unique items also carry `unique` (an id from UNIQUES) and `power` (what it does, shown to the player).

const RARITY_NAMES := ["Worn", "Hallowed", "Cursed", "Relic", "Unique"]
const RARITY_COLORS := [
	Color(0.74, 0.70, 0.66), Color(0.50, 0.62, 0.90), Color(0.89, 0.71, 0.49), Color(0.92, 0.42, 0.18),
	Color(0.97, 0.89, 0.64),
]
const UNIQUE := 4

## Act I uniques. Each has a power that the game checks with Game.has_unique(id):
##   wardens_vigil      player.gd take_damage: a ward when a blow would leave you below a third of your life
##   lamplighters_wick  player.gd roll_damage and the hero light: +12% damage, a wider light
##   hasks_toll         player.gd _basic_attack: every fifth attack strikes all foes around you
##   saints_knuckle     world.gd _on_enemy_died: kills restore life
const UNIQUES := {
	"wardens_vigil": {
		"name": "The Warden's Vigil", "slot": "armor", "ilvl": 5, "stats": {"armor": 26, "life": 30},
		"power": "When a blow would leave you below a third of your life, the wardens' oath wards you: the next 40% of your life in damage is absorbed. Once every 45 seconds.",
		"lore": "Twelve names, cut in iron. It is heavier than it looks.",
		"source": "Reward for The Wardens' Oath",
	},
	"lamplighters_wick": {
		"name": "The Lamplighter's Wick", "slot": "charm", "ilvl": 5, "stats": {"life": 14, "mana": 12},
		"power": "You deal 12% more damage, and your light reaches further into the dark.",
		"lore": "It is still warm. Nobody has ever seen it lit.",
		"source": "Reward for Lamps Without Oil",
	},
	"hasks_toll": {
		"name": "Hask's Toll", "slot": "weapon", "ilvl": 5, "stats": {"damage": 9, "crit": 4},
		"power": "Every fifth attack tolls: a shockwave strikes every foe around you for 120% damage.",
		"lore": "The haft is warm where his hand was.",
		"source": "Hask, the Bell-Warden",
	},
	"saints_knuckle": {
		"name": "Knuckle of the Thirteenth", "slot": "charm", "ilvl": 4, "stats": {"life": 10, "crit": 3},
		"power": "Each kill restores 4% of your life.",
		"lore": "A saint's finger bone, polished by three hundred years of praying hands.",
		"source": "Elite monsters of the Sunken Crypt (rare)",
	},
}


static func make_unique(id: String) -> Dictionary:
	var u: Dictionary = UNIQUES[id]
	return {
		"uid": "unique-%s-%d" % [id, Time.get_ticks_usec()], "name": u["name"], "slot": u["slot"],
		"rarity": UNIQUE, "ilvl": u["ilvl"], "stats": (u["stats"] as Dictionary).duplicate(),
		"unique": id, "power": u["power"], "lore": u["lore"],
	}


const SLOTS := ["weapon", "armor", "charm"]
const SLOT_NAMES := {"weapon": "Weapon", "armor": "Armor", "charm": "Charm"}

const WEAPON_BASES := {
	"warrior": ["Grave-Iron Blade", "Sexton's Maul", "Lychgate Axe", "Penitent Falchion"],
	"pyromancer": ["Cinderwood Staff", "Ashen Wand", "Censer Rod", "Kindling Sceptre"],
	"rogue": ["Gutter Knife", "Widow's Dirk", "Rat-Saint Shiv", "Lantern Stiletto"],
}
const ARMOR_BASES := ["Mourning Mail", "Shroudcloth Robe", "Penitent's Hauberk", "Crypt-Leather Vest", "Bellringer's Coat"]
const CHARM_BASES := ["Bone Rosary", "Tallow Saint", "Rusted Reliquary", "Ember Locket", "Drowned Coin"]
const PREFIXES := ["Grim", "Hollow", "Tolling", "Sunken", "Ashen", "Weeping", "Moth-Eaten", "Black"]
const SUFFIXES := ["of the Vigil", "of Thirteen Bells", "of Cinders", "of the Drowned Saint", "of Dusk", "of the Lychgate"]


static func roll_item(ilvl: int, hero_class: String, rarity_bias := 0.0, force_slot := "") -> Dictionary:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	var slot: String = force_slot if force_slot != "" else SLOTS[rng.randi() % SLOTS.size()]
	var roll := rng.randf() + rarity_bias
	var rarity := 0
	if roll > 1.02:
		rarity = 3
	elif roll > 0.86:
		rarity = 2
	elif roll > 0.55:
		rarity = 1
	var base := ""
	var stats := {}
	match slot:
		"weapon":
			var bases: Array = WEAPON_BASES.get(hero_class, WEAPON_BASES["warrior"])
			base = bases[rng.randi() % bases.size()]
			stats["damage"] = 2 + int(ilvl * 1.3) + rng.randi_range(0, 2 + ilvl)
		"armor":
			base = ARMOR_BASES[rng.randi() % ARMOR_BASES.size()]
			stats["armor"] = 4 + ilvl * 2 + rng.randi_range(0, 3 + ilvl)
		_:
			base = CHARM_BASES[rng.randi() % CHARM_BASES.size()]
			stats["life"] = 6 + ilvl * 3 + rng.randi_range(0, 6)
	var extra := ["life", "mana", "crit", "speed", "damage", "armor"]
	for i in rarity:
		var key: String = extra[rng.randi() % extra.size()]
		var amount := 0
		match key:
			"life": amount = 5 + ilvl * 2 + rng.randi_range(0, 6)
			"mana": amount = 4 + ilvl + rng.randi_range(0, 5)
			"crit": amount = 2 + rng.randi_range(0, 3)
			"speed": amount = 3 + rng.randi_range(0, 4)
			"damage": amount = 1 + int(ilvl * 0.8) + rng.randi_range(0, 2)
			"armor": amount = 3 + ilvl + rng.randi_range(0, 4)
		stats[key] = int(stats.get(key, 0)) + amount
	var item_name: String = base
	if rarity >= 1:
		item_name = PREFIXES[rng.randi() % PREFIXES.size()] + " " + base
	if rarity >= 2:
		item_name += " " + SUFFIXES[rng.randi() % SUFFIXES.size()]
	return {
		"uid": "%d-%d" % [Time.get_ticks_usec(), rng.randi() % 100000],
		"name": item_name, "slot": slot, "rarity": rarity, "ilvl": ilvl, "stats": stats,
	}


static func describe(item: Dictionary) -> String:
	var lines := PackedStringArray()
	lines.append("%s  ·  %s %s  ·  item level %d" % [
		item.get("name", "?"), RARITY_NAMES[int(item.get("rarity", 0))],
		SLOT_NAMES.get(item.get("slot", ""), "Item"), int(item.get("ilvl", 1))])
	var stats: Dictionary = item.get("stats", {})
	for key in stats:
		lines.append(stat_line(key, int(stats[key])))
	if item.has("power"):
		lines.append("\n" + str(item["power"]))
	if item.has("lore"):
		lines.append(str(item["lore"]))
	return "\n".join(lines)


static func stat_line(key: String, v: int) -> String:
	match key:
		"damage": return "+%d damage" % v
		"armor": return "+%d armor" % v
		"life": return "+%d life" % v
		"mana": return "+%d mana" % v
		"crit": return "+%d%% critical strike chance" % v
		"speed": return "+%d%% movement speed" % v
	return "+%d %s" % [v, key]


static func value(item: Dictionary) -> int:
	return 4 + int(item.get("ilvl", 1)) * 3 * (1 + mini(int(item.get("rarity", 0)), 3)) + (60 if item.has("unique") else 0)
