extends RefCounted
## The item tooltip: name in its rarity colour, kind and item level, stats, a unique's power and lore, and
## how it compares with what the hero wears in that slot (green better, red worse).

const Items = preload("res://scripts/data/items.gd")
const UiTheme = preload("res://scripts/ui/ui_theme.gd")

## Stats in the order a tooltip lists them.
const ORDER := ["damage", "armor", "life", "mana", "crit", "crit_dmg", "attack_speed", "cdr", "speed", "regen"]


## A tooltip panel for `item`. `worn` is what it would replace ({} for nothing); `hint` is a last line.
static func build(item: Dictionary, worn: Dictionary, hint := "") -> Control:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiTheme.frame("tooltip", 16.0))
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	v.custom_minimum_size = Vector2(330, 0)
	panel.add_child(v)
	var rarity := int(item.get("rarity", 0))
	var col := UiTheme.rarity_color(rarity)
	var name := UiTheme.label(str(item.get("name", "?")), 21, col)
	name.autowrap_mode = TextServer.AUTOWRAP_WORD
	v.add_child(name)
	var kind := str(item.get("slot", ""))
	var sub := "Quest item" if kind == "quest" else "%s %s  ·  item level %d" % [
		Items.RARITY_NAMES[rarity], Items.SLOT_NAMES.get(kind, "Item"), int(item.get("ilvl", 1))]
	v.add_child(UiTheme.label(sub, 14, UiTheme.MUTED))
	v.add_child(_rule())
	var stats: Dictionary = item.get("stats", {})
	for key in _ordered(stats):
		v.add_child(UiTheme.label(Items.stat_line(key, int(stats[key])), 16, Color(0.95, 0.92, 0.85)))
	if item.has("power"):
		v.add_child(_rule())
		var p := UiTheme.label(str(item["power"]), 15, UiTheme.rarity_color(Items.UNIQUE))
		p.autowrap_mode = TextServer.AUTOWRAP_WORD
		v.add_child(p)
	if item.has("lore"):
		var l := UiTheme.label(str(item["lore"]), 14, Color(0.7, 0.62, 0.52))
		l.autowrap_mode = TextServer.AUTOWRAP_WORD
		v.add_child(l)
	if kind != "quest" and not worn.is_empty() and worn != item:
		v.add_child(_rule())
		v.add_child(UiTheme.label("Compared with %s:" % str(worn.get("name", "what you wear")), 14, UiTheme.MUTED))
		var d: Dictionary = Items.compare(item, worn)
		var any := false
		for key in _ordered(d):
			if int(d[key]) == 0:
				continue
			any = true
			v.add_child(UiTheme.label(Items.stat_line(key, int(d[key])), 15, UiTheme.GOOD if int(d[key]) > 0 else UiTheme.BAD))
		if not any:
			v.add_child(UiTheme.label("No difference.", 15, UiTheme.MUTED))
	elif kind != "quest" and worn.is_empty() and hint != "" and not hint.begins_with("Worn"):
		v.add_child(UiTheme.label("Nothing worn there.", 14, UiTheme.GOOD))
	if hint != "":
		v.add_child(_rule())
		var h := UiTheme.label(hint, 13, UiTheme.GOLD_DIM.lightened(0.25))
		h.autowrap_mode = TextServer.AUTOWRAP_WORD
		v.add_child(h)
	return panel


static func _ordered(stats: Dictionary) -> Array:
	var keys := []
	for k in ORDER:
		if stats.has(k):
			keys.append(k)
	for k in stats:
		if not keys.has(k):
			keys.append(k)
	return keys


static func _rule() -> Control:
	var r := ColorRect.new()
	r.color = Color(0.61, 0.42, 0.27, 0.45)
	r.custom_minimum_size = Vector2(0, 1)
	return r
