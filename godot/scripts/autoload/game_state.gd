extends Node
## Game: the hero's progress (level, XP, gear, quests), derived stats and area changes.

signal stats_changed
signal xp_changed
signal leveled_up(level: int)
signal inventory_changed
signal quest_changed
signal message(text: String, color: Color)
## Story moments the world reacts to: "wells_toll" (Lamps Without Oil done), "act_complete".
signal story_event(id: String)

const Classes = preload("res://scripts/data/classes.gd")
const Items = preload("res://scripts/data/items.gd")
const Dialogue = preload("res://scripts/data/act1_dialogue.gd")

## 2 (0.5.0-beta.5): 13 gear slots; armor became chest, charm became amulet (see migrate()).
const SAVE_VERSION := 2
const MAX_LEVEL := 20
const INVENTORY_SIZE := 60
## Cooldown reduction from gear never goes past this.
const MAX_CDR := 0.4
## A critical strike deals 175% damage before crit-damage bonuses.
const BASE_CRIT_DAMAGE := 1.75
const POTION_PRICE := 25
const QUEST := "silent_bell"
## All Act I quests and their last step (see scripts/data/act1_dialogue.gd for what each step means).
const QUESTS := {"silent_bell": 3, "lamps": 3, "act_end": 2, "wardens": 3}
const WARDEN_STONES := 3

var progress: Dictionary = {}
var hero_class := "warrior"
var class_data: Dictionary = {}
var area := "town"
## The area the hero just left ("catacomb" puts them at the crypt gate in town).
var came_from := ""
var catacomb_seed := 0
var loaded := false
var _autosave_timer := 0.0


func _ready() -> void:
	get_tree().auto_accept_quit = false


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		quit_game()


func _process(delta: float) -> void:
	if not loaded:
		return
	progress["playtime"] = float(progress.get("playtime", 0.0)) + delta
	_autosave_timer += delta
	if _autosave_timer > 60.0:
		_autosave_timer = 0.0
		save()


# ------------------------------------------------------------------ load / save

func new_progress() -> Dictionary:
	return {
		"version": SAVE_VERSION, "level": 1, "xp": 0, "gold": 20, "potions": 3,
		"inventory": [], "equipped": empty_equipped(),
		"quests": {"silent_bell": 0, "lamps": 0, "act_end": 0, "wardens": 0}, "flags": {}, "depth": 1, "kills": 0, "playtime": 0.0,
	}


## Loads the hero handed over by Boot. Await it.
func load_hero() -> void:
	hero_class = str(Boot.character.get("heroClass", "warrior"))
	class_data = Classes.get_class_data(hero_class)
	var saved: Dictionary = await SaveSystem.load_progress()
	progress = new_progress()
	if not saved.is_empty():
		saved = migrate(saved, hero_class)
	for key in saved:
		progress[key] = saved[key]
	if not (progress.get("equipped") is Dictionary):
		progress["equipped"] = empty_equipped()
	if not (progress.get("inventory") is Array):
		progress["inventory"] = []
	if not (progress.get("quests") is Dictionary):
		progress["quests"] = {}
	for q in QUESTS:  # saves from before 0.5.0 only have silent_bell
		if not progress["quests"].has(q):
			progress["quests"][q] = 0
	if not (progress.get("flags") is Dictionary):
		progress["flags"] = {}
	progress["level"] = clampi(int(progress["level"]), 1, MAX_LEVEL)
	if saved.is_empty():
		# A new hero starts with a worn weapon of their class.
		progress["equipped"]["weapon"] = Items.roll_item(1, hero_class, -1.0, "weapon")
	area = "town"
	came_from = ""
	loaded = true
	stats_changed.emit()


func save() -> void:
	if not loaded:
		return
	progress["version"] = SAVE_VERSION
	progress["savedAt"] = Time.get_datetime_string_from_system(true)
	SaveSystem.save_progress(progress)


func quit_game() -> void:
	save()
	await SaveSystem.flush()
	get_tree().quit()


func is_new_hero() -> bool:
	return int(progress.get("xp", 0)) == 0 and int(progress.get("level", 1)) == 1 and quest_state() == 0


# ------------------------------------------------------------------ areas

func enter_area(area_id: String) -> void:
	came_from = area
	area = area_id
	if area_id == "catacomb":
		catacomb_seed = randi()
		progress["depth"] = max(int(progress.get("depth", 1)), 2)
	save()
	get_tree().change_scene_to_file("res://scenes/world.tscn")


func area_title() -> String:
	return "Hollowmere" if area == "town" else "The Sunken Crypt"


func monster_level() -> int:
	return clampi(1 + int(progress["level"]) / 2, 1, 6)


static func empty_equipped() -> Dictionary:
	var eq := {}
	for slot in Items.SLOTS:
		eq[slot] = null
	return eq


## Brings a saved progress dictionary up to SAVE_VERSION. Pure: returns a new dictionary.
## Version 1 had three slots (weapon, armor, charm) and a 24-item pack.
static func migrate(saved: Dictionary, hero_class := "warrior") -> Dictionary:
	var p := saved.duplicate(true)
	var old_eq: Dictionary = p.get("equipped", {}) if p.get("equipped") is Dictionary else {}
	var bag: Array = p.get("inventory", []) if p.get("inventory") is Array else []
	var eq := empty_equipped()
	for item in bag:
		if item is Dictionary:
			_migrate_item(item, hero_class)
	for slot in old_eq:
		var item = old_eq[slot]
		if not (item is Dictionary):
			continue
		_migrate_item(item, hero_class)
		var kind: String = item["slot"]
		var to := "ring_1" if kind == "ring" else kind
		if eq.has(to) and eq[to] == null:
			eq[to] = item
		else:
			bag.append(item)
	p["equipped"] = eq
	p["inventory"] = bag
	p["version"] = SAVE_VERSION
	return p


static func _migrate_item(item: Dictionary, hero_class: String) -> void:
	match item.get("slot", ""):
		"armor":
			item["slot"] = "chest"
		"charm":
			item["slot"] = "amulet"
	if item.has("unique") and Items.UNIQUES.has(item["unique"]):
		var u: Dictionary = Items.UNIQUES[item["unique"]]
		item["slot"] = u["slot"]
		item["icon"] = u["icon"]
	if str(item.get("icon", "")) == "" and item.get("slot") != "quest":
		item["icon"] = Items.guess_icon(item, hero_class)


# ------------------------------------------------------------------ stats

func level() -> int:
	return int(progress.get("level", 1))


func xp_to_next() -> int:
	return int(60.0 * pow(level(), 1.6))


func gear_stat(key: String) -> int:
	var total := 0
	var eq: Dictionary = progress["equipped"]
	for slot in eq:
		var item = eq[slot]
		if item is Dictionary:
			total += int(item.get("stats", {}).get(key, 0))
	return total


func max_hp() -> float:
	var lv := level() - 1
	return float(class_data["hp"]) + class_data["hp_per_level"] * lv + gear_stat("life")


func max_mana() -> float:
	return float(class_data["mana"]) + class_data["mana_per_level"] * (level() - 1) + gear_stat("mana")


func armor() -> float:
	return float(class_data["armor"]) + level() * 1.5 + gear_stat("armor")


func damage_range() -> Vector2:
	var bonus := gear_stat("damage") + (level() - 1) * 1.2
	var mult := 1.0 + (level() - 1) * 0.04
	return Vector2((class_data["dmg_min"] + bonus) * mult, (class_data["dmg_max"] + bonus) * mult)


func crit_chance() -> float:
	return 0.05 + gear_stat("crit") / 100.0


## Damage multiplier of a critical strike.
func crit_damage() -> float:
	return BASE_CRIT_DAMAGE + gear_stat("crit_dmg") / 100.0


## Multiplier on attack rate (divide attack cooldowns by it).
func attack_speed() -> float:
	return 1.0 + gear_stat("attack_speed") / 100.0


## Multiplier on skill cooldowns; never below 1 - MAX_CDR.
func cooldown_mult() -> float:
	return maxf(1.0 - MAX_CDR, 1.0 - gear_stat("cdr") / 100.0)


## Life per second from gear (on top of the hero's own slow recovery).
func life_regen() -> float:
	return float(gear_stat("regen"))


func move_speed() -> float:
	return float(class_data["speed"]) * (1.0 + gear_stat("speed") / 100.0)


## Damage taken after armor.
func mitigate(amount: float) -> float:
	var a := armor()
	return amount * 100.0 / (100.0 + a * 2.0)


# ------------------------------------------------------------------ xp

func add_xp(amount: int) -> void:
	if level() >= MAX_LEVEL:
		return
	# Feature flag game.xp_multiplier (set on the server with admin.mjs), e.g. 2 for a double-XP weekend.
	amount = int(round(amount * clampf(float(Boot.flag("game.xp_multiplier", 1.0)), 0.0, 10.0)))
	progress["xp"] = int(progress["xp"]) + amount
	while level() < MAX_LEVEL and int(progress["xp"]) >= xp_to_next():
		progress["xp"] = int(progress["xp"]) - xp_to_next()
		progress["level"] = level() + 1
		leveled_up.emit(level())
		stats_changed.emit()
		save()
	xp_changed.emit()


func add_gold(amount: int) -> void:
	progress["gold"] = int(progress["gold"]) + amount
	stats_changed.emit()


func add_potion(n := 1) -> void:
	progress["potions"] = mini(int(progress["potions"]) + n, 9)
	stats_changed.emit()


# ------------------------------------------------------------------ inventory

func inventory() -> Array:
	return progress["inventory"]


func add_item(item: Dictionary) -> bool:
	if inventory().size() >= INVENTORY_SIZE:
		message.emit("Your pack is full.", Color(0.9, 0.4, 0.3))
		return false
	inventory().append(item)
	inventory_changed.emit()
	return true


func equip(index: int) -> void:
	equip_to(index)


## Wears bag item `index` in `slot` (empty: the slot its kind goes in; a ring takes the free ring slot,
## else ring_1). Whatever was there goes back into the bag in its place. False if it doesn't fit.
func equip_to(index: int, slot := "") -> bool:
	if index < 0 or index >= inventory().size():
		return false
	var item: Dictionary = inventory()[index]
	var kind: String = item.get("slot", "")
	if kind == "" or kind == "quest" or not kind in Items.KINDS:
		return false
	var eq: Dictionary = progress["equipped"]
	if slot == "":
		slot = kind
		if kind == "ring":
			slot = "ring_1" if eq.get("ring_1") == null or eq.get("ring_2") != null else "ring_2"
	if Items.slot_kind(slot) != kind or not eq.has(slot):
		return false
	var old = eq.get(slot)
	inventory().remove_at(index)
	if old is Dictionary:
		inventory().insert(index, old)
	eq[slot] = item
	inventory_changed.emit()
	stats_changed.emit()
	return true


## Takes off what `slot` holds into the bag. False if the slot is empty or the bag is full.
func unequip(slot: String) -> bool:
	var item = progress["equipped"].get(slot)
	if not (item is Dictionary):
		return false
	if inventory().size() >= INVENTORY_SIZE:
		message.emit("Your pack is full.", Color(0.9, 0.4, 0.3))
		return false
	progress["equipped"][slot] = null
	inventory().append(item)
	inventory_changed.emit()
	stats_changed.emit()
	return true


## Moves a bag item: onto another item swaps the two, past the end moves it last.
func move_item(from: int, to: int) -> void:
	var bag := inventory()
	if from < 0 or from >= bag.size() or from == to:
		return
	if to >= bag.size():
		bag.append(bag.pop_at(from))
	else:
		var t = bag[to]
		bag[to] = bag[from]
		bag[from] = t
	inventory_changed.emit()


func salvage(index: int) -> void:
	if index < 0 or index >= inventory().size():
		return
	var item: Dictionary = inventory()[index]
	if item.get("slot") == "quest":
		return
	var gold := Items.value(item)
	inventory().remove_at(index)
	add_gold(gold)
	message.emit("Salvaged %s for %d gold." % [item.get("name", "item"), gold], Color(0.89, 0.71, 0.49))
	inventory_changed.emit()


func roll_loot(ilvl: int, bias := 0.0, slot := "") -> Dictionary:
	return Items.roll_item(ilvl, hero_class, bias, slot)


# ------------------------------------------------------------------ quests & dialogue

func quest_state() -> int:
	return quest(QUEST)


func set_quest_state(st: int) -> void:
	set_quest(QUEST, st)


func quest(id: String) -> int:
	return int(progress["quests"].get(id, 0))


func set_quest(id: String, st: int) -> void:
	progress["quests"][id] = clampi(st, 0, int(QUESTS.get(id, 3)))
	quest_changed.emit()
	save()


func flags() -> Dictionary:
	return progress["flags"]


func warden_stones() -> int:
	return int(flags().get("warden_stones", 0))


## The main quest shown in the quest log: [title, text].
func main_quest() -> Array:
	if quest("silent_bell") < 3:
		return ["The Silent Bell", quest_text()]
	if quest("act_end") >= 2:
		return ["Act I Complete", "The bells of Hollowmere are silent, and the wells toll. The Ossuary of the Thirteen waits below. (Act II is coming.)"]
	if quest("act_end") == 1:
		return ["The Wells Toll", "Go down the undercroft stair behind the chapel door."]
	match quest("lamps"):
		0: return ["Lamps Without Oil", "A child with a lamp waits in Hollowmere's square. Speak with them."]
		1: return ["Lamps Without Oil", "Follow the lamps through the graveyard and dig where the last one burns."]
		2: return ["Lamps Without Oil", "Bring the Founders' Charter to Sister Maud."]
	return ["Lamps Without Oil", "Speak with Sister Maud."]


## The optional quest in progress, if any: [title, text] or [].
func side_quest() -> Array:
	match quest("wardens"):
		1: return ["The Wardens' Oath", "Find the wardens' name-stones in the Sunken Crypt (%d/%d)." % [warden_stones(), WARDEN_STONES]]
		2: return ["The Wardens' Oath", "Set the name-stones on the plinth by the mausoleum door."]
	return []


func quest_text() -> String:
	match quest("silent_bell"):
		0: return "Speak with Sister Maud at the chapel."
		1: return "Descend through the mausoleum gate and silence the toll beneath St. Aldric's."
		2: return "Bring the Black Clapper to Sister Maud."
	return main_quest()[1]


func dialogue_entry(npc_id: String) -> String:
	return Dialogue.entry(npc_id, progress["quests"], flags())


func dialogue_node(id: String) -> Dictionary:
	return Dialogue.NODES.get(id, {})


func npc_info(npc_id: String) -> Dictionary:
	return Dialogue.NPCS.get(npc_id, {"name": npc_id, "title": ""})


func npc_has_news(npc_id: String) -> bool:
	match npc_id:
		"maud":
			return quest("silent_bell") in [0, 2] or quest("lamps") == 2
		"corwin":
			if quest("silent_bell") >= 1 and not flags().get("corwin_gift", false):
				return true
			return check_condition("wardens_offer")
		"lamplighter":
			return quest("silent_bell") >= 3 and quest("lamps") == 0
	return false


## The Lamplighter only appears once the bell is silent.
func lamplighter_present() -> bool:
	return quest("silent_bell") >= 3


func check_condition(cond: String) -> bool:
	match cond:
		"", "none": return true
		"gold_25": return int(progress["gold"]) >= POTION_PRICE
		"no_corwin_gift": return not flags().get("corwin_gift", false)
		"wardens_offer": return quest("silent_bell") >= 1 and quest("wardens") == 0
	return true


func run_action(action: String) -> void:
	match action:
		"accept_quest":
			if quest_state() == 0:
				set_quest_state(1)
				message.emit("Quest accepted: The Silent Bell", Color(0.89, 0.71, 0.49))
		"complete_quest":
			if quest_state() == 2:
				_remove_quest_item("black_clapper")
				set_quest_state(3)
				add_gold(150)
				add_xp(150)
				add_item(roll_loot(monster_level() + 2, 0.5))
				message.emit("Quest complete: The Silent Bell (+150 gold, +150 XP)", Color(0.89, 0.71, 0.49))
		"buy_potion":
			if int(progress["gold"]) >= POTION_PRICE and int(progress["potions"]) < 9:
				progress["gold"] = int(progress["gold"]) - POTION_PRICE
				add_potion(1)
				message.emit("Bought a grave-moss draught.", Color(0.85, 0.4, 0.4))
			elif int(progress["potions"]) >= 9:
				message.emit("You cannot carry more draughts.", Color(0.9, 0.4, 0.3))
		"accept_lamps":
			if quest("lamps") == 0:
				set_quest("lamps", 1)
				message.emit("Quest accepted: Lamps Without Oil", Color(0.89, 0.71, 0.49))
		"complete_lamps":
			if quest("lamps") == 2:
				_remove_quest_item("founders_charter")
				set_quest("lamps", 3)
				add_xp(200)
				add_gold(80)
				add_item(Items.make_unique("lamplighters_wick"))
				message.emit("Quest complete: Lamps Without Oil (+200 XP). Received: The Lamplighter's Wick", Color(0.97, 0.89, 0.64))
				set_quest("act_end", 1)
				story_event.emit("wells_toll")
		"accept_wardens":
			if quest("wardens") == 0:
				set_quest("wardens", 1)
				message.emit("Quest accepted: The Wardens' Oath (optional)", Color(0.89, 0.71, 0.49))
		"corwin_gift":
			if not flags().get("corwin_gift", false):
				flags()["corwin_gift"] = true
				add_item({
					"uid": "corwin-lantern", "name": "Gravedigger's Lantern", "slot": "amulet", "icon": "locket", "rarity": 1,
					"ilvl": 2, "stats": {"life": 12, "armor": 4},
					"lore": "Forty years of graves, and it never once went out.",
				})
				message.emit("Received: Gravedigger's Lantern", Color(0.5, 0.62, 0.9))
				save()


func on_boss_slain() -> void:
	if quest_state() == 1:
		add_item({
			"uid": "black_clapper", "name": "The Black Clapper", "slot": "quest", "rarity": 3, "ilvl": 3,
			"stats": {}, "lore": "Iron, warm as a hand. It hums when no one is listening.",
		})
		set_quest_state(2)
		message.emit("You pried the Black Clapper from Hask's chest.", Color(0.92, 0.42, 0.18))


## Lamps Without Oil, step 1: dig the unmarked grave. Returns what happened, for the world to show.
func dig_grave() -> String:
	match quest("lamps"):
		1:
			add_item({
				"uid": "founders_charter", "name": "The Founders' Charter", "slot": "quest", "rarity": 3, "ilvl": 3,
				"stats": {}, "lore": "Vellum gone black at the edges. Thirteen names, and thirteen seals beneath them.",
			})
			set_quest("lamps", 2)
			message.emit("Under the soil, a lead box. Inside: the Founders' Charter.", Color(0.92, 0.42, 0.18))
			return "dug"
		0:
			message.emit("An unmarked grave. The earth hasn't been turned in a very long time.", Color(0.8, 0.75, 0.7))
	return ""


## The Wardens' Oath: a name-stone picked up in the crypt.
func take_warden_stone() -> void:
	if quest("wardens") != 1:
		return
	flags()["warden_stones"] = mini(warden_stones() + 1, WARDEN_STONES)
	if warden_stones() >= WARDEN_STONES:
		set_quest("wardens", 2)
		message.emit("All three name-stones. Return them to the mausoleum.", Color(0.89, 0.71, 0.49))
	else:
		message.emit("A warden's name-stone (%d/%d). It hums in your hand." % [warden_stones(), WARDEN_STONES], Color(0.75, 0.8, 0.9))
		quest_changed.emit()
		save()


## The Wardens' Oath: set the stones on the plinth by the mausoleum.
func place_warden_stones() -> bool:
	if quest("wardens") != 2:
		return false
	set_quest("wardens", 3)
	add_xp(200)
	add_gold(120)
	add_item(Items.make_unique("wardens_vigil"))
	message.emit("Quest complete: The Wardens' Oath (+200 XP). Received: The Warden's Vigil", Color(0.97, 0.89, 0.64))
	return true


## The end of Act I: the hero goes down the undercroft stair.
func descend_undercroft() -> bool:
	if quest("act_end") != 1:
		return false
	set_quest("act_end", 2)
	add_xp(300)
	story_event.emit("act_complete")
	return true


func has_unique(id: String) -> bool:
	for slot in progress["equipped"]:
		var item = progress["equipped"][slot]
		if item is Dictionary and item.get("unique", "") == id:
			return true
	return false


## Whether this hero has ever found a unique (some drop only once for sure).
func found_unique(id: String) -> bool:
	return flags().get("found_" + id, false)


func mark_unique_found(id: String) -> void:
	flags()["found_" + id] = true


func _remove_quest_item(uid: String) -> void:
	for i in range(inventory().size() - 1, -1, -1):
		if inventory()[i].get("uid") == uid:
			inventory().remove_at(i)
	inventory_changed.emit()
