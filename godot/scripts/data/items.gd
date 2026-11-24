extends RefCounted
## Item generation. Items are plain Dictionaries so they save as JSON:
## {uid, name, slot, rarity, ilvl, stats: {damage, armor, life, mana, crit, speed}}

const RARITY_NAMES := ["Worn", "Hallowed", "Cursed", "Relic"]
const RARITY_COLORS := [
	Color(0.74, 0.70, 0.66), Color(0.50, 0.62, 0.90), Color(0.89, 0.71, 0.49), Color(0.92, 0.42, 0.18),
]
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
	return 4 + int(item.get("ilvl", 1)) * 3 * (1 + int(item.get("rarity", 0)))
