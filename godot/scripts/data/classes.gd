extends RefCounted
## Hero classes: base stats and eight skills each (two primaries, six others), each with four variants.
##
## kind: "arc" (melee sweep), "bolt" (projectile), "nova" (ring around the hero),
##       "pyre" (delayed blast at the cursor), "rush" (dash), "fan" (spread of projectiles), "blink" (teleport),
##       "buff" (damage up, damage taken down, speed, dodge), "whirl" (spin, hitting all around),
##       "ward" (absorbs damage), "rain" (fire falling over an area), "trap" (slowing ground that hurts),
##       "flurry" (leap between foes).
## Effects any skill may carry (world.gd effects_of): stun (s), knockback, slow (0..1, how much slower),
##   slow_time (s), burn (extra damage, as a share of the hit, dealt over 3 s), pierce, count.
## primary: costs nothing, builds the class resource on hit, and is the only kind the LMB slot takes.
## unlock: the hero level the skill is usable from. Variant i unlocks at variant_unlock(skill, i).
## A variant's `mods` are merged over the skill when the player picks it (Skills panel).

const VARIANT_LEVELS := [2, 4, 6, 9]


static func _v(id: String, name: String, desc: String, mods: Dictionary) -> Dictionary:
	return {"id": id, "name": name, "desc": desc, "mods": mods}


const CLASSES := {
	"warrior": {
		"title": "Warrior",
		"blurb": "Grave-iron and grim resolve. Strong in the press of bodies.",
		"hp": 120, "hp_per_level": 14, "mana": 40, "mana_per_level": 3, "mana_regen": 1.0,
		"dmg_min": 7, "dmg_max": 11, "armor": 12, "speed": 6.2,
		"resource": "Wrath", "mana_on_hit": 4,
	},
	"pyromancer": {
		"title": "Pyromancer",
		"blurb": "Ash-sworn caster who carries a living ember in the ribs.",
		"hp": 85, "hp_per_level": 9, "mana": 90, "mana_per_level": 8, "mana_regen": 4.5,
		"dmg_min": 6, "dmg_max": 10, "armor": 4, "speed": 6.0,
		"resource": "Mana", "mana_on_hit": 0,
	},
	"rogue": {
		"title": "Rogue",
		"blurb": "Knife-saint of the gutters. Strikes from the dark and is gone.",
		"hp": 95, "hp_per_level": 11, "mana": 50, "mana_per_level": 4, "mana_regen": 2.0,
		"dmg_min": 5, "dmg_max": 9, "armor": 7, "speed": 7.0,
		"resource": "Venom", "mana_on_hit": 3,
	},
}

const BLEED := Color(0.75, 0.12, 0.12)
const FROST := Color(0.62, 0.78, 0.95)
const ROT := Color(0.5, 0.78, 0.3)


## The eight skills of a class, in Skills-panel order: two primaries, then the rest by unlock level.
static func skills(hero_class: String) -> Array:
	match hero_class:
		"pyromancer":
			return _pyromancer()
		"rogue":
			return _rogue()
	return _warrior()


static func _warrior() -> Array:
	return [
		{"id": "grave_cleave", "name": "Grave Cleave", "kind": "arc", "primary": true, "range": 2.7, "arc": 140.0,
			"mult": 1.0, "cooldown": 0.62, "mana": 0, "color": Color(0.89, 0.71, 0.49),
			"desc": "A wide sweep that strikes every foe in front of you. Builds Wrath.",
			"variants": [
				_v("cleave_rending", "Rending Sweep", "The sweep widens to a half circle, a little lighter per foe.", {"arc": 180.0, "mult": 0.9}),
				_v("cleave_heavy", "Heavy Cleave", "Slower, crushing blows: 35% more damage.", {"cooldown": 0.82, "mult": 1.35}),
				_v("cleave_wrathful", "Wrathful Edge", "Every foe struck gives 60% more Wrath.", {"gain": 1.6}),
				_v("cleave_bleeding", "Bleeding Edge", "Foes struck bleed for 40% more over three seconds.", {"burn": 0.4, "color": BLEED}),
			]},
		{"id": "shield_bash", "name": "Shield Bash", "kind": "arc", "primary": true, "range": 2.2, "arc": 60.0,
			"mult": 1.45, "stun": 0.35, "cooldown": 0.9, "mana": 0, "color": Color(0.72, 0.74, 0.8),
			"desc": "Drive your shield into one foe: a hard, narrow blow that staggers. Builds Wrath.",
			"variants": [
				_v("bash_concussion", "Concussion", "The bash stuns for a full second.", {"stun": 1.0}),
				_v("bash_shoulder", "Shoulder Check", "Foes are thrown back.", {"knockback": 3.0}),
				_v("bash_rhythm", "Iron Rhythm", "Faster bashes that still hit hard.", {"cooldown": 0.7, "mult": 1.3}),
				_v("bash_spiked", "Spiked Boss", "The shield's spike leaves foes bleeding.", {"burn": 0.45, "color": BLEED}),
			]},
		{"id": "earthsplitter", "name": "Earthsplitter", "kind": "nova", "radius": 4.2, "mult": 1.8,
			"stun": 1.0, "cooldown": 4.0, "mana": 18, "color": Color(0.85, 0.62, 0.35),
			"desc": "Smash the ground: damages and stuns all foes around you.",
			"variants": [
				_v("split_chill", "Grave Chill", "The cold of the grave rises: foes are slowed by half for 3 seconds.", {"slow": 0.5, "slow_time": 3.0, "color": FROST}),
				_v("split_tremor", "Long Tremor", "Foes stay stunned for 2 seconds.", {"stun": 2.0}),
				_v("split_fissure", "Fissure", "The ground splits and burns them for 60% more.", {"burn": 0.6, "color": Color(0.95, 0.45, 0.15)}),
				_v("split_wide", "Wide Quake", "A far wider quake, a little weaker.", {"radius": 6.0, "mult": 1.5}),
			]},
		{"id": "iron_rush", "name": "Iron Rush", "kind": "rush", "range": 8.0, "mult": 1.4,
			"cooldown": 6.0, "mana": 14, "color": Color(0.93, 0.83, 0.62),
			"desc": "Charge toward the cursor, battering everything in your path.",
			"variants": [
				_v("rush_trample", "Trampling Rush", "Everything in your path takes much more.", {"mult": 2.0}),
				_v("rush_long", "Long Charge", "Charge half as far again.", {"range": 12.0}),
				_v("rush_stun", "Stunning Rush", "Foes you hit are stunned.", {"stun": 1.2}),
				_v("rush_quick", "Quick Rush", "Cheaper and ready sooner.", {"cooldown": 3.5, "mana": 10}),
			]},
		{"id": "grave_leap", "name": "Grave Leap", "kind": "blink", "range": 9.0, "radius": 3.2, "mult": 1.6,
			"stun": 0.6, "crit_window": 0.0, "cooldown": 7.0, "mana": 16, "unlock": 2, "color": Color(0.8, 0.66, 0.45),
			"desc": "Leap to the cursor and land with a slam that staggers everything nearby.",
			"variants": [
				_v("leap_crater", "Crater", "A much wider landing.", {"radius": 4.5}),
				_v("leap_hammer", "Hammer Landing", "Land with your whole weight: 50% more damage.", {"mult": 2.4}),
				_v("leap_ghost", "Ghost Leap", "Leap far more often.", {"cooldown": 4.0}),
				_v("leap_chill", "Chilling Landing", "Foes you land among are slowed by half.", {"slow": 0.5, "slow_time": 3.0, "color": FROST}),
			]},
		{"id": "grave_roar", "name": "Grave Roar", "kind": "buff", "duration": 6.0, "damage": 0.35,
			"guard": 0.25, "cooldown": 12.0, "mana": 20, "unlock": 3, "color": Color(0.95, 0.55, 0.25),
			"desc": "A roar that would wake the buried: for 6 seconds you deal 35% more damage and take 25% less.",
			"variants": [
				_v("roar_fury", "Battle Fury", "You deal 55% more damage instead.", {"damage": 0.55}),
				_v("roar_iron", "Iron Will", "You take 45% less damage instead.", {"guard": 0.45}),
				_v("roar_long", "Long Roar", "It lasts 10 seconds.", {"duration": 10.0}),
				_v("roar_terror", "Terrifying Roar", "Foes around you are stunned by the sound.", {"radius": 4.0, "mult": 0.5, "stun": 1.0}),
			]},
		{"id": "sextons_whirl", "name": "Sexton's Whirl", "kind": "whirl", "duration": 1.5, "radius": 2.8,
			"mult": 0.55, "tick": 0.25, "cooldown": 8.0, "mana": 26, "unlock": 5, "color": Color(0.93, 0.83, 0.62),
			"desc": "Spin with your blade out for 1.5 seconds, striking every foe around you again and again. You can move while you spin.",
			"variants": [
				_v("whirl_long", "Long Whirl", "Spin for 2.5 seconds.", {"duration": 2.5}),
				_v("whirl_wide", "Wide Whirl", "A longer reach as you spin.", {"radius": 3.8}),
				_v("whirl_bleeding", "Bleeding Whirl", "Every cut makes them bleed.", {"burn": 0.3, "color": BLEED}),
				_v("whirl_cheap", "Practised Whirl", "Costs far less Wrath.", {"mana": 14}),
			]},
		{"id": "iron_hide", "name": "Iron Hide", "kind": "ward", "duration": 6.0, "absorb": 0.5,
			"cooldown": 16.0, "mana": 20, "unlock": 6, "color": Color(0.7, 0.72, 0.78),
			"desc": "Harden like grave-iron: absorb damage equal to half your life for 6 seconds.",
			"variants": [
				_v("hide_thick", "Thick Hide", "Absorb three quarters of your life.", {"absorb": 0.75}),
				_v("hide_long", "Long Hide", "It lasts 12 seconds.", {"duration": 12.0}),
				_v("hide_quick", "Quick Hide", "Ready far sooner.", {"cooldown": 9.0}),
				_v("hide_spiked", "Spiked Hide", "Iron spikes burst out, hurting and hurling back foes around you.", {"radius": 3.0, "mult": 1.0, "knockback": 2.5}),
			]},
	]


static func _pyromancer() -> Array:
	return [
		{"id": "ember_bolt", "name": "Ember Bolt", "kind": "bolt", "primary": true, "range": 14.0, "speed": 19.0,
			"mult": 1.0, "cooldown": 0.55, "mana": 0, "color": Color(1.0, 0.55, 0.2),
			"desc": "Hurl a bolt of living ember at a foe.",
			"variants": [
				_v("bolt_searing", "Searing Bolt", "Foes hit burn for 45% more.", {"burn": 0.45}),
				_v("bolt_piercing", "Piercing Ember", "The bolt passes through two foes.", {"pierce": 2}),
				_v("bolt_twin", "Twin Embers", "Two bolts, each a little weaker.", {"count": 2, "spread": 14.0, "mult": 0.75}),
				_v("bolt_swift", "Swift Ember", "Faster bolts, thrown faster.", {"speed": 30.0, "cooldown": 0.42}),
			]},
		{"id": "cinder_spray", "name": "Cinder Spray", "kind": "fan", "primary": true, "count": 5, "spread": 50.0,
			"speed": 16.0, "range": 6.0, "mult": 0.55, "cooldown": 0.6, "mana": 0, "color": Color(1.0, 0.65, 0.25),
			"desc": "Spray a short fan of cinders in front of you.",
			"variants": [
				_v("spray_wide", "Wide Spray", "A wider fan of seven cinders.", {"spread": 90.0, "count": 7}),
				_v("spray_long", "Long Spray", "The cinders fly much further.", {"range": 10.0}),
				_v("spray_scorch", "Scorching Spray", "Foes hit burn for 35% more.", {"burn": 0.35}),
				_v("spray_dense", "Dense Spray", "Eight cinders in a tight fan.", {"count": 8, "spread": 40.0, "mult": 0.45}),
			]},
		{"id": "cinder_nova", "name": "Cinder Nova", "kind": "nova", "radius": 5.0, "mult": 1.6,
			"knockback": 3.5, "cooldown": 5.0, "mana": 24, "color": Color(1.0, 0.42, 0.15),
			"desc": "A ring of fire bursts from you, hurling foes back.",
			"variants": [
				_v("nova_smother", "Smothering Nova", "Thick smoke slows foes by half.", {"slow": 0.5, "slow_time": 3.0, "color": Color(0.6, 0.5, 0.45)}),
				_v("nova_great", "Great Nova", "A much larger ring.", {"radius": 7.0}),
				_v("nova_hurl", "Hurling Nova", "Foes are thrown far back.", {"knockback": 6.0}),
				_v("nova_quick", "Quick Nova", "Ready sooner.", {"cooldown": 3.0}),
			]},
		{"id": "pyre", "name": "Pyre", "kind": "pyre", "radius": 3.0, "mult": 2.6, "burn": 0.45,
			"burn_time": 3.0, "delay": 0.55, "range": 16.0, "cooldown": 3.0, "mana": 28,
			"color": Color(1.0, 0.3, 0.08),
			"desc": "Call a pillar of flame at the cursor. The ground burns after.",
			"variants": [
				_v("pyre_wide", "Wide Pyre", "A broader pillar.", {"radius": 4.2}),
				_v("pyre_quick", "Quick Pyre", "The flame falls almost at once.", {"delay": 0.25}),
				_v("pyre_lasting", "Lasting Pyre", "The ground burns for 6 seconds.", {"burn_time": 6.0}),
				_v("pyre_white", "White Pyre", "A white-hot pillar: far more damage, more mana.", {"mult": 3.6, "mana": 36, "color": Color(1.0, 0.9, 0.7)}),
			]},
		{"id": "ember_step", "name": "Ember Step", "kind": "blink", "range": 9.0, "radius": 2.6, "mult": 1.0,
			"burn": 0.6, "crit_window": 0.0, "cooldown": 6.0, "mana": 18, "unlock": 2, "color": Color(1.0, 0.5, 0.15),
			"desc": "Step through fire to the cursor; foes where you land catch alight.",
			"variants": [
				_v("step_far", "Far Step", "Step much further.", {"range": 13.0}),
				_v("step_searing", "Searing Step", "They burn for far longer.", {"burn": 1.0}),
				_v("step_quick", "Quick Step", "Step far more often.", {"cooldown": 3.5}),
				_v("step_ash", "Ash Step", "Choking ash slows them by half.", {"slow": 0.5, "slow_time": 3.0}),
			]},
		{"id": "ashen_ward", "name": "Ashen Ward", "kind": "ward", "duration": 8.0, "absorb": 0.35,
			"cooldown": 14.0, "mana": 30, "unlock": 3, "color": Color(0.85, 0.6, 0.4),
			"desc": "Wrap yourself in hot ash that absorbs damage equal to 35% of your life for 8 seconds.",
			"variants": [
				_v("ward_thick", "Thick Ash", "Absorbs 55% of your life.", {"absorb": 0.55}),
				_v("ward_long", "Long Ward", "It lasts 14 seconds.", {"duration": 14.0}),
				_v("ward_burning", "Burning Ward", "The ash flares out, burning foes around you.", {"radius": 3.0, "mult": 1.0, "burn": 0.3}),
				_v("ward_quick", "Quick Ward", "Ready far sooner.", {"cooldown": 8.0}),
			]},
		{"id": "cinder_rain", "name": "Cinder Rain", "kind": "rain", "radius": 4.5, "count": 8, "impact": 1.6,
			"mult": 1.0, "duration": 1.6, "range": 16.0, "cooldown": 10.0, "mana": 40, "unlock": 5,
			"color": Color(1.0, 0.4, 0.12),
			"desc": "Burning cinders rain down around the cursor, each one bursting on the foes below.",
			"variants": [
				_v("rain_downpour", "Downpour", "Fourteen cinders fall.", {"count": 14}),
				_v("rain_heavy", "Heavy Cinders", "Bigger, harder cinders.", {"impact": 2.2, "mult": 1.3}),
				_v("rain_wide", "Wide Rain", "They fall over a much wider area.", {"radius": 6.5}),
				_v("rain_swift", "Swift Rain", "They all fall in under a second.", {"duration": 0.9}),
			]},
		{"id": "flame_wave", "name": "Flame Wave", "kind": "fan", "count": 5, "spread": 40.0, "speed": 11.0,
			"range": 12.0, "mult": 1.2, "pierce": 9, "cooldown": 7.0, "mana": 30, "unlock": 6, "color": Color(1.0, 0.35, 0.1),
			"desc": "Send out a slow wave of flame that passes through every foe in its way.",
			"variants": [
				_v("wave_wide", "Wide Wave", "A wider wave.", {"spread": 80.0, "count": 7}),
				_v("wave_searing", "Searing Wave", "Foes it passes burn for 50% more.", {"burn": 0.5}),
				_v("wave_long", "Long Wave", "The wave rolls much further.", {"range": 18.0}),
				_v("wave_swift", "Swift Wave", "A faster wave, ready sooner.", {"speed": 18.0, "cooldown": 5.0}),
			]},
	]


static func _rogue() -> Array:
	return [
		{"id": "twin_cuts", "name": "Twin Cuts", "kind": "arc", "primary": true, "range": 2.3, "arc": 100.0,
			"mult": 0.9, "cooldown": 0.42, "mana": 0, "color": Color(0.79, 0.61, 0.95),
			"desc": "Quick paired slashes. Builds Venom.",
			"variants": [
				_v("cuts_wide", "Wide Cuts", "The slashes sweep wider.", {"arc": 150.0}),
				_v("cuts_venom", "Venomous Cuts", "Foes cut are poisoned for 35% more.", {"burn": 0.35, "color": ROT}),
				_v("cuts_flurry", "Flurry Cuts", "Faster, lighter cuts.", {"cooldown": 0.34, "mult": 0.8}),
				_v("cuts_cripple", "Crippling Cuts", "Foes cut are slowed by 60%.", {"slow": 0.6, "slow_time": 1.5}),
			]},
		{"id": "barbed_throw", "name": "Barbed Throw", "kind": "bolt", "style": "knife", "primary": true,
			"range": 12.0, "speed": 24.0, "mult": 0.9, "pierce": 2, "cooldown": 0.5, "mana": 0,
			"color": Color(0.82, 0.8, 0.88),
			"desc": "Throw a barbed knife that passes through two foes. Builds Venom.",
			"variants": [
				_v("barb_hooked", "Hooked Barbs", "Foes hit are slowed by half.", {"slow": 0.5, "slow_time": 2.0}),
				_v("barb_poison", "Poisoned Barbs", "Foes hit are poisoned for 40% more.", {"burn": 0.4, "color": ROT}),
				_v("barb_twin", "Twin Throw", "Two knives at once.", {"count": 2, "spread": 14.0, "mult": 0.7}),
				_v("barb_long", "Long Throw", "Further, through four foes.", {"range": 18.0, "pierce": 4}),
			]},
		{"id": "knife_fan", "name": "Knife Fan", "kind": "fan", "count": 7, "spread": 60.0,
			"speed": 22.0, "range": 11.0, "mult": 0.9, "cooldown": 2.5, "mana": 16,
			"color": Color(0.75, 0.75, 0.85),
			"desc": "Throw a fan of seven knives toward the cursor.",
			"variants": [
				_v("fan_circle", "Full Circle", "Twelve knives in every direction.", {"spread": 330.0, "count": 12}),
				_v("fan_barbed", "Barbed Fan", "Each knife passes through a foe.", {"pierce": 1}),
				_v("fan_poison", "Poison Fan", "Every knife is poisoned.", {"burn": 0.3, "color": ROT}),
				_v("fan_quick", "Quick Fan", "Ready sooner.", {"cooldown": 1.5}),
			]},
		{"id": "veilstep", "name": "Veilstep", "kind": "blink", "range": 9.0, "radius": 2.6,
			"mult": 1.2, "crit_window": 3.0, "cooldown": 5.0, "mana": 14,
			"color": Color(0.55, 0.35, 0.8),
			"desc": "Step through shadow to the cursor, cutting foes where you land. Your next hit is a critical strike.",
			"variants": [
				_v("veil_long", "Long Step", "Step much further.", {"range": 13.0}),
				_v("veil_deep", "Deep Shadow", "Your next hit stays critical for 6 seconds.", {"crit_window": 6.0}),
				_v("veil_cutting", "Cutting Step", "Cut wider and harder where you land.", {"mult": 2.0, "radius": 3.4}),
				_v("veil_quick", "Quick Step", "Ready far sooner.", {"cooldown": 3.0}),
			]},
		{"id": "smoke_veil", "name": "Smoke Veil", "kind": "buff", "duration": 5.0, "damage": 0.0, "guard": 0.0,
			"dodge": 0.4, "speed_bonus": 0.35, "cooldown": 12.0, "mana": 16, "unlock": 2, "color": Color(0.55, 0.55, 0.62),
			"desc": "Vanish into smoke for 5 seconds: 40% of blows miss you and you move 35% faster.",
			"variants": [
				_v("smoke_thick", "Thick Smoke", "60% of blows miss you.", {"dodge": 0.6}),
				_v("smoke_fleet", "Fleet Veil", "You move 60% faster.", {"speed_bonus": 0.6}),
				_v("smoke_long", "Long Veil", "It lasts 8 seconds.", {"duration": 8.0}),
				_v("smoke_choking", "Choking Smoke", "The smoke chokes foes around you, slowing them.", {"radius": 3.5, "mult": 0.4, "slow": 0.5, "slow_time": 3.0}),
			]},
		{"id": "bone_caltrops", "name": "Bone Caltrops", "kind": "trap", "radius": 3.2, "duration": 5.0,
			"slow": 0.5, "mult": 0.3, "range": 12.0, "cooldown": 9.0, "mana": 18, "unlock": 3,
			"color": Color(0.85, 0.8, 0.7),
			"desc": "Scatter sharpened knuckle-bones at the cursor: for 5 seconds, foes in them are slowed by half and bleed.",
			"variants": [
				_v("caltrops_wide", "Wide Spread", "Cover a much wider patch.", {"radius": 4.5}),
				_v("caltrops_barbed", "Barbed Bones", "They cut far deeper.", {"mult": 0.55}),
				_v("caltrops_long", "Long Trap", "They last 9 seconds.", {"duration": 9.0}),
				_v("caltrops_binding", "Binding Bones", "Foes in them are slowed by 80%.", {"slow": 0.8}),
			]},
		{"id": "death_flurry", "name": "Death Flurry", "kind": "flurry", "targets": 5, "range": 8.0, "mult": 1.3,
			"cooldown": 10.0, "mana": 28, "unlock": 5, "color": Color(0.6, 0.4, 0.85),
			"desc": "Vanish and strike up to five foes near you, one after another, before you are seen.",
			"variants": [
				_v("flurry_endless", "Endless Flurry", "Strike up to eight foes.", {"targets": 8}),
				_v("flurry_deadly", "Deadly Flurry", "Every strike hits far harder.", {"mult": 1.8}),
				_v("flurry_reach", "Far Reach", "Find foes much further away.", {"range": 12.0}),
				_v("flurry_quick", "Quick Flurry", "Ready far sooner.", {"cooldown": 6.0}),
			]},
		{"id": "rot_cloud", "name": "Rot Cloud", "kind": "trap", "radius": 3.6, "duration": 6.0, "slow": 0.2,
			"mult": 0.45, "range": 12.0, "cooldown": 10.0, "mana": 22, "unlock": 6, "color": ROT,
			"desc": "Break a vial of grave-rot at the cursor: a cloud that poisons and slows foes for 6 seconds.",
			"variants": [
				_v("rot_spread", "Spreading Rot", "A much wider cloud.", {"radius": 5.0}),
				_v("rot_thick", "Thick Rot", "The poison bites far deeper.", {"mult": 0.7}),
				_v("rot_linger", "Lingering Rot", "It lasts 10 seconds.", {"duration": 10.0}),
				_v("rot_numbing", "Numbing Rot", "Foes in it are slowed by 55%.", {"slow": 0.55}),
			]},
	]


## The on-hit effects a skill carries: stun, knockback, slow, slow_time, burn (world.apply_effects).
static func effects_of(sk: Dictionary) -> Dictionary:
	var out := {}
	for k in ["stun", "knockback", "slow", "slow_time", "burn"]:
		if sk.has(k):
			out[k] = sk[k]
	return out


static func get_class_data(hero_class: String) -> Dictionary:
	var d: Dictionary = CLASSES.get(hero_class, CLASSES["warrior"]).duplicate()
	var list := skills(hero_class if CLASSES.has(hero_class) else "warrior")
	d["skills"] = list
	d["basic"] = list[0]
	return d


## One skill by id, or {} if the class has no such skill.
static func skill(hero_class: String, id: String) -> Dictionary:
	for s in skills(hero_class):
		if s["id"] == id:
			return s
	return {}


## The hero level variant `i` of `sk` becomes usable at.
static func variant_unlock(sk: Dictionary, i: int) -> int:
	return maxi(int(sk.get("unlock", 1)) + 1, VARIANT_LEVELS[clampi(i, 0, 3)])


## The skill as it casts: the base with the chosen variant's mods merged in when the hero's level allows it.
## Sets "variant" to the variant id that applied ("" for none).
static func resolved(hero_class: String, id: String, variant_id: String, hero_level: int) -> Dictionary:
	var base := skill(hero_class, id)
	if base.is_empty():
		return {}
	var out := base.duplicate()
	out["variant"] = ""
	var vs: Array = base["variants"]
	for i in vs.size():
		if vs[i]["id"] == variant_id and hero_level >= variant_unlock(base, i):
			for k in vs[i]["mods"]:
				out[k] = vs[i]["mods"][k]
			out["variant"] = variant_id
	return out
