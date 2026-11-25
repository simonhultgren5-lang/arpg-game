extends RefCounted
## Item generation. Items are plain Dictionaries so they save as JSON:
## {uid, name, slot (an item kind, see KINDS), rarity, ilvl, icon,
##  stats: {damage, armor, life, mana, crit, speed, crit_dmg, attack_speed, cdr, regen}}
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
		"name": "The Warden's Vigil", "slot": "chest", "icon": "mail", "ilvl": 5, "stats": {"armor": 26, "life": 30},
		"power": "When a blow would leave you below a third of your life, the wardens' oath wards you: the next 40% of your life in damage is absorbed. Once every 45 seconds.",
		"lore": "Twelve names, cut in iron. It is heavier than it looks.",
		"source": "Reward for The Wardens' Oath",
	},
	"lamplighters_wick": {
		"name": "The Lamplighter's Wick", "slot": "amulet", "icon": "locket", "ilvl": 5, "stats": {"life": 14, "mana": 12},
		"power": "You deal 12% more damage, and your light reaches further into the dark.",
		"lore": "It is still warm. Nobody has ever seen it lit.",
		"source": "Reward for Lamps Without Oil",
	},
	"hasks_toll": {
		"name": "Hask's Toll", "slot": "weapon", "icon": "maul", "ilvl": 5, "stats": {"damage": 9, "crit": 4},
		"power": "Every fifth attack tolls: a shockwave strikes every foe around you for 120% damage.",
		"lore": "The haft is warm where his hand was.",
		"source": "Hask, the Bell-Warden",
	},
	"saints_knuckle": {
		"name": "Knuckle of the Thirteenth", "slot": "ring", "icon": "ring_signet", "ilvl": 4, "stats": {"life": 10, "crit": 3},
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
		"unique": id, "power": u["power"], "lore": u["lore"], "icon": u["icon"],
	}


## The 13 places a hero wears gear, in paper-doll order. An item's `slot` is its kind (KINDS):
## both ring slots take a "ring".
const SLOTS := ["head", "shoulders", "amulet", "chest", "wrists", "hands", "belt", "legs", "feet",
	"ring_1", "ring_2", "weapon", "offhand"]
const KINDS := ["head", "shoulders", "amulet", "chest", "wrists", "hands", "belt", "legs", "feet",
	"ring", "weapon", "offhand"]
const SLOT_NAMES := {
	"head": "Head", "shoulders": "Shoulders", "amulet": "Amulet", "chest": "Chest", "wrists": "Wrists",
	"hands": "Hands", "belt": "Belt", "legs": "Legs", "feet": "Feet", "ring": "Ring", "ring_1": "Ring",
	"ring_2": "Ring", "weapon": "Weapon", "offhand": "Off-hand",
}

## Bases: [name, icon]. The icon is assets/textures/icons/items/<icon>.png (scripts/assets/blender/icons).
const CLASS_BASES := {
	"weapon": {
		"warrior": [["Grave-Iron Blade", "sword"], ["Sexton's Maul", "maul"], ["Lychgate Axe", "axe"], ["Penitent Falchion", "falchion"]],
		"pyromancer": [["Cinderwood Staff", "staff"], ["Ashen Wand", "wand"], ["Censer Rod", "censer"], ["Kindling Sceptre", "sceptre"]],
		"rogue": [["Gutter Knife", "knife"], ["Widow's Dirk", "dirk"], ["Rat-Saint Shiv", "shiv"], ["Lantern Stiletto", "stiletto"]],
	},
	"offhand": {
		"warrior": [["Lychgate Kite", "shield"], ["Sexton's Buckler", "buckler"]],
		"pyromancer": [["Ash-Bound Tome", "tome"], ["Ember Orb", "orb"]],
		"rogue": [["Parrying Dirk", "parry_dagger"], ["Hook-Knife", "hook_knife"]],
	},
}
const BASES := {
	"head": [["Sexton's Hood", "hood"], ["Grave-Iron Helm", "helm"], ["Bellringer's Cap", "cap"]],
	"shoulders": [["Mourning Pauldrons", "pauldrons"], ["Ash Mantle", "mantle"]],
	"chest": [["Mourning Mail", "mail"], ["Shroudcloth Robe", "robe"], ["Crypt-Leather Vest", "vest"], ["Bellringer's Coat", "coat"]],
	"wrists": [["Iron Vambraces", "vambraces"], ["Penitent's Wraps", "wraps"]],
	"hands": [["Gravedigger's Gloves", "gloves"], ["Iron Gauntlets", "gauntlets"]],
	"belt": [["Sexton's Belt", "belt"], ["Rope of Penance", "rope_belt"]],
	"legs": [["Mourning Greaves", "greaves"], ["Crypt-Leather Breeches", "breeches"]],
	"feet": [["Grave-Walker Boots", "boots"], ["Iron Sabatons", "sabatons"]],
	"amulet": [["Bone Rosary", "rosary"], ["Ember Locket", "locket"], ["Tallow Saint", "tallow_saint"]],
	"ring": [["Drowned Coin", "ring_coin"], ["Iron Band", "ring_band"], ["Bone Signet", "ring_signet"]],
}
const PREFIXES := ["Grim", "Hollow", "Tolling", "Sunken", "Ashen", "Weeping", "Moth-Eaten", "Black"]
const SUFFIXES := ["of the Vigil", "of Thirteen Bells", "of Cinders", "of the Drowned Saint", "of Dusk", "of the Lychgate"]
const AFFIXES := ["life", "mana", "crit", "speed", "damage", "armor", "crit_dmg", "attack_speed", "cdr", "regen"]


## The kind of item a gear slot takes: "ring_1" and "ring_2" take rings, every other slot its own name.
static func slot_kind(slot: String) -> String:
	return "ring" if slot.begins_with("ring") else slot


## The bases an item of `kind` can roll for a hero of `hero_class`: [[name, icon], ...].
static func bases(kind: String, hero_class: String) -> Array:
	if CLASS_BASES.has(kind):
		return CLASS_BASES[kind].get(hero_class, CLASS_BASES[kind]["warrior"])
	return BASES.get(kind, [])


## Every item icon id (the asset test checks each one has a PNG).
static func all_icons() -> Array:
	var out := {}
	for kind in CLASS_BASES:
		for cls in CLASS_BASES[kind]:
			for b in CLASS_BASES[kind][cls]:
				out[b[1]] = true
	for kind in BASES:
		for b in BASES[kind]:
			out[b[1]] = true
	for id in UNIQUES:
		out[UNIQUES[id]["icon"]] = true
	return out.keys()


## The icon of an item made before icons existed: from its base name, else the first base of its kind.
static func guess_icon(item: Dictionary, hero_class := "warrior") -> String:
	var kind: String = item.get("slot", "")
	var name: String = item.get("name", "")
	var all := bases(kind, hero_class).duplicate()
	if CLASS_BASES.has(kind):
		for cls in CLASS_BASES[kind]:
			all.append_array(CLASS_BASES[kind][cls])
	for b in all:
		if name.contains(b[0]):
			return b[1]
	return all[0][1] if not all.is_empty() else "rosary"


static func _base_stats(kind: String, hero_class: String, ilvl: int, rng: RandomNumberGenerator) -> Dictionary:
	match kind:
		"weapon":
			return {"damage": 2 + int(ilvl * 1.3) + rng.randi_range(0, 2 + ilvl)}
		"offhand":
			if hero_class == "pyromancer":
				return {"mana": 4 + int(ilvl * 1.5) + rng.randi_range(0, 4)}
			return {"armor": 3 + int(ilvl * 1.2) + rng.randi_range(0, 2 + ilvl)}
		"chest":
			return {"armor": 4 + ilvl * 2 + rng.randi_range(0, 3 + ilvl)}
		"head", "legs":
			return {"armor": 3 + int(ilvl * 1.4) + rng.randi_range(0, 2 + ilvl / 2)}
		"amulet":
			return {"life": 6 + ilvl * 3 + rng.randi_range(0, 6)}
		"ring":
			if rng.randf() < 0.5:
				return {"life": 4 + ilvl * 2 + rng.randi_range(0, 4)}
			return {"crit": 1 + rng.randi_range(0, 2)}
	return {"armor": 2 + ilvl + rng.randi_range(0, 2)}


static func _affix(key: String, ilvl: int, rng: RandomNumberGenerator) -> int:
	match key:
		"life": return 5 + ilvl * 2 + rng.randi_range(0, 6)
		"mana": return 4 + ilvl + rng.randi_range(0, 5)
		"crit": return 2 + rng.randi_range(0, 3)
		"speed": return 3 + rng.randi_range(0, 4)
		"damage": return 1 + int(ilvl * 0.8) + rng.randi_range(0, 2)
		"armor": return 3 + ilvl + rng.randi_range(0, 4)
		"crit_dmg": return 8 + ilvl + rng.randi_range(0, 10)
		"attack_speed": return 3 + rng.randi_range(0, 4)
		"cdr": return 3 + rng.randi_range(0, 4)
		"regen": return 1 + ilvl / 3 + rng.randi_range(0, 1)
	return 1


## A random item. `force_slot` is an item kind (KINDS); empty picks one at random.
static func roll_item(ilvl: int, hero_class: String, rarity_bias := 0.0, force_slot := "") -> Dictionary:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	var kind: String = force_slot if force_slot != "" else KINDS[rng.randi() % KINDS.size()]
	kind = slot_kind(kind)
	var roll := rng.randf() + rarity_bias
	var rarity := 0
	if roll > 1.02:
		rarity = 3
	elif roll > 0.86:
		rarity = 2
	elif roll > 0.55:
		rarity = 1
	var choices := bases(kind, hero_class)
	var base: Array = choices[rng.randi() % choices.size()]
	var stats := _base_stats(kind, hero_class, ilvl, rng)
	for i in rarity:
		var key: String = AFFIXES[rng.randi() % AFFIXES.size()]
		stats[key] = int(stats.get(key, 0)) + _affix(key, ilvl, rng)
	var item_name: String = base[0]
	if rarity >= 1:
		item_name = PREFIXES[rng.randi() % PREFIXES.size()] + " " + item_name
	if rarity >= 2:
		item_name += " " + SUFFIXES[rng.randi() % SUFFIXES.size()]
	return {
		"uid": "%d-%d" % [Time.get_ticks_usec(), rng.randi() % 100000],
		"name": item_name, "slot": kind, "rarity": rarity, "ilvl": ilvl, "stats": stats, "icon": base[1],
	}


## Stat differences between two items (a minus b), for the tooltip's comparison. `b` may be empty.
static func compare(a: Dictionary, b: Dictionary) -> Dictionary:
	var out := {}
	var sa: Dictionary = a.get("stats", {})
	var sb: Dictionary = b.get("stats", {}) if b else {}
	for k in sa:
		out[k] = int(sa[k]) - int(sb.get(k, 0))
	for k in sb:
		if not sa.has(k):
			out[k] = -int(sb[k])
	return out


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
	var sign := "+" if v >= 0 else "-"
	var a := absi(v)
	match key:
		"damage": return "%s%d damage" % [sign, a]
		"armor": return "%s%d armor" % [sign, a]
		"life": return "%s%d life" % [sign, a]
		"mana": return "%s%d resource" % [sign, a]
		"crit": return "%s%d%% critical strike chance" % [sign, a]
		"speed": return "%s%d%% movement speed" % [sign, a]
		"crit_dmg": return "%s%d%% critical strike damage" % [sign, a]
		"attack_speed": return "%s%d%% attack speed" % [sign, a]
		"cdr": return "%s%d%% cooldown reduction" % [sign, a]
		"regen": return "%s%d life per second" % [sign, a]
	return "%s%d %s" % [sign, a, key]


static func value(item: Dictionary) -> int:
	return 4 + int(item.get("ilvl", 1)) * 3 * (1 + mini(int(item.get("rarity", 0)), 3)) + (60 if item.has("unique") else 0)
