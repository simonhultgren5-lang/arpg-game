extends Node
## Game: the hero's progress (level, XP, gear, quests), derived stats and area changes.

signal stats_changed
signal xp_changed
signal leveled_up(level: int)
signal inventory_changed
signal quest_changed
signal message(text: String, color: Color)

const Classes = preload("res://scripts/data/classes.gd")
const Items = preload("res://scripts/data/items.gd")
const Dialogue = preload("res://scripts/data/act1_dialogue.gd")

const SAVE_VERSION := 1
const MAX_LEVEL := 20
const INVENTORY_SIZE := 24
const POTION_PRICE := 25
const QUEST := "silent_bell"

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
		"inventory": [], "equipped": {"weapon": null, "armor": null, "charm": null},
		"quests": {QUEST: 0}, "flags": {}, "depth": 1, "kills": 0, "playtime": 0.0,
	}


## Loads the hero handed over by Boot. Await it.
func load_hero() -> void:
	hero_class = str(Boot.character.get("heroClass", "warrior"))
	class_data = Classes.get_class_data(hero_class)
	var saved: Dictionary = await SaveSystem.load_progress()
	progress = new_progress()
	for key in saved:
		progress[key] = saved[key]
	if not (progress.get("equipped") is Dictionary):
		progress["equipped"] = {"weapon": null, "armor": null, "charm": null}
	if not (progress.get("inventory") is Array):
		progress["inventory"] = []
	if not (progress.get("quests") is Dictionary):
		progress["quests"] = {QUEST: 0}
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
	if index < 0 or index >= inventory().size():
		return
	var item: Dictionary = inventory()[index]
	var slot: String = item.get("slot", "")
	if slot == "" or slot == "quest":
		return
	var old = progress["equipped"].get(slot)
	inventory().remove_at(index)
	if old is Dictionary:
		inventory().insert(index, old)
	progress["equipped"][slot] = item
	inventory_changed.emit()
	stats_changed.emit()


func unequip(slot: String) -> void:
	var item = progress["equipped"].get(slot)
	if not (item is Dictionary):
		return
	if inventory().size() >= INVENTORY_SIZE:
		message.emit("Your pack is full.", Color(0.9, 0.4, 0.3))
		return
	progress["equipped"][slot] = null
	inventory().append(item)
	inventory_changed.emit()
	stats_changed.emit()


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
	return int(progress["quests"].get(QUEST, 0))


func set_quest_state(s: int) -> void:
	progress["quests"][QUEST] = s
	quest_changed.emit()
	save()


func flags() -> Dictionary:
	return progress["flags"]


func quest_text() -> String:
	match quest_state():
		0: return "Speak with Sister Maud at the chapel."
		1: return "Descend through the mausoleum gate and silence the toll beneath St. Aldric's."
		2: return "Bring the Black Clapper to Sister Maud."
		_: return "The bell is silent. (End of the Act I slice.)"


func dialogue_entry(npc_id: String) -> String:
	return Dialogue.entry(npc_id, quest_state(), flags())


func dialogue_node(id: String) -> Dictionary:
	return Dialogue.NODES.get(id, {})


func npc_info(npc_id: String) -> Dictionary:
	return Dialogue.NPCS.get(npc_id, {"name": npc_id, "title": ""})


func npc_has_news(npc_id: String) -> bool:
	if npc_id == "maud":
		return quest_state() == 0 or quest_state() == 2
	if npc_id == "corwin":
		return quest_state() >= 1 and not flags().get("corwin_gift", false)
	return false


func check_condition(cond: String) -> bool:
	match cond:
		"", "none": return true
		"gold_25": return int(progress["gold"]) >= POTION_PRICE
		"no_corwin_gift": return not flags().get("corwin_gift", false)
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
		"corwin_gift":
			if not flags().get("corwin_gift", false):
				flags()["corwin_gift"] = true
				add_item({
					"uid": "corwin-lantern", "name": "Gravedigger's Lantern", "slot": "charm", "rarity": 1,
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


func _remove_quest_item(uid: String) -> void:
	for i in range(inventory().size() - 1, -1, -1):
		if inventory()[i].get("uid") == uid:
			inventory().remove_at(i)
	inventory_changed.emit()
