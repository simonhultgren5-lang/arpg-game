extends RefCounted
## Act I dialogue. See godot/story/ACTS.md for the wider story.
## Each node: speaker, text, options [{text, next ("" closes), action?, if?}].
## A node with a recorded line plays res://assets/audio/voice/<node id>.wav.
##
## Quests (Game.progress["quests"]):
##   silent_bell  0 not started, 1 accepted, 2 Hask slain (bring the clapper back), 3 done
##   lamps        Lamps Without Oil: 0 not started, 1 follow the lamps, 2 charter found, 3 done
##   act_end      0, 1 the wells toll and the undercroft stair is open, 2 Act I complete
##   wardens      The Wardens' Oath (optional): 0, 1 find the name-stones, 2 all found, 3 done
##   southwatch   The Southwatch Fire (optional, Edda): 0, 1 clear the fen, 2 relight the beacon, 3 tell Edda, 4 done
##   kin          Restless Kin (optional, Corwin): 0, 1 take grave-tokens from elites, 2 bring them back, 3 done

const NPCS := {
	"maud": {"name": "Sister Maud", "title": "Last Sister of St. Aldric's"},
	"edda": {"name": "Edda Varge", "title": "Smith"},
	"corwin": {"name": "Old Corwin", "title": "Gravedigger"},
	"lamplighter": {"name": "The Lamplighter", "title": "Who lights the lamps?"},
}

const NODES := {
	# ------------------------------------------------------------ Sister Maud
	"maud_0": {
		"speaker": "maud",
		"text": "Another one walks out of the fog. You have the look of someone who should have kept walking.\n\nListen. Do you hear it? No? Wait for midnight. The bell of St. Aldric's will toll thirteen times, as it has every night since the Feast of Ashes.",
		"options": [
			{"text": "A bell that tolls. Why does that frighten you?", "next": "maud_0b"},
			{"text": "I have no business with your bells.", "next": "maud_0x"},
		],
	},
	"maud_0b": {
		"speaker": "maud",
		"text": "Because we cut the rope, child. Then we took the bell down and broke it with hammers, and sank the pieces in the mere.\n\nIt tolls still. From beneath the chapel. And every night it tolls, the dead of Hollowmere get up a little straighter in their graves.",
		"options": [
			{"text": "What lies beneath the chapel?", "next": "maud_0c"},
		],
	},
	"maud_0c": {
		"speaker": "maud",
		"text": "The Sunken Crypt. Our wardens were buried there for three hundred years. The last of them, Warden Hask, went into the earth holding the old bell's clapper, as penance for a sin no one will name.\n\nI think he is ringing it. Go down through the mausoleum gate by the graveyard. Find what tolls. Silence it.",
		"options": [
			{"text": "I will go down. [Accept: The Silent Bell]", "next": "maud_accept", "action": "accept_quest"},
			{"text": "Not yet.", "next": ""},
		],
	},
	"maud_0x": {
		"speaker": "maud",
		"text": "No one has business here any more. And yet here you stand. The road behind you is fog, and the fog does not give back what it takes. Come back when you are ready to listen.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"maud_accept": {
		"speaker": "maud",
		"text": "Take this key. It opens the chain on the mausoleum gate, east of here past the graves.\n\nCorwin dug most of those graves; he may know what waits below. Edda has draughts of grave-moss if you have coin. And pray, if you still remember how.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"maud_1": {
		"speaker": "maud",
		"text": "The gate is east, past the graves. Hask is below, I am sure of it. Bring me the clapper, and we may yet sleep through one night.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"maud_2": {
		"speaker": "maud",
		"text": "You are alive. And you have it... the clapper. Give it here.\n\nIt is warm. It should not be warm. Hold still, child, it is... whispering. Names. Thirteen names.",
		"options": [{"text": "Whose names?", "next": "maud_2b"}],
	},
	"maud_2b": {
		"speaker": "maud",
		"text": "The thirteen saints of the Ossuary, who were walled up beneath Hollowmere when the town was young. Hask was not ringing to wake the town. He was ringing to wake them.\n\nAnd something below him was ringing back.",
		"options": [{"text": "Then it is not over. [Complete: The Silent Bell]", "next": "maud_2c", "action": "complete_quest"}],
	},
	"maud_2c": {
		"speaker": "maud",
		"text": "No. It is only quieter. Take this for your trouble; St. Aldric's has no use for gold now.\n\nRest while you can. The catacombs go deeper than any map, and I fear the next toll will come from much further down.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	# ------------------------------------------------------------ Edda the smith
	"edda_0": {
		"speaker": "edda",
		"text": "Forge is cold. Nothing to burn but coffin wood, and that smokes wrong. If you want steel, find it on the dead; they've no more use for it.\n\nI brew grave-moss draughts now. Bitter, but they close wounds. Twenty-five gold.",
		"options": [
			{"text": "Buy a grave-moss draught (25 gold)", "next": "edda_buy", "action": "buy_potion", "if": "gold_25"},
			{"text": "The beacon out in the fen has gone dark.", "next": "edda_s0", "if": "southwatch_offer"},
			{"text": "About the Southwatch beacon...", "next": "edda_s1", "if": "southwatch_progress"},
			{"text": "The beacon still burns.", "next": "edda_s4", "if": "southwatch_done"},
			{"text": "What happened to this town?", "next": "edda_lore"},
			{"text": "[Leave]", "next": ""},
		],
	},
	# ------------------------------------------------------------ The Southwatch Fire (optional)
	"edda_s0": {
		"speaker": "edda",
		"text": "Noticed that, did you. Old Haskett keeps that beacon. Kept it. He came for nails every second morning, and I haven't seen him in three.

The fen road runs past my brother's grave. I'm not asking you to find Haskett. I'm asking you to put down what came up out of that water, and light the fire again so the road can see.",
		"options": [
			{"text": "I'll clear the fen and light the beacon.", "next": "", "action": "accept_southwatch"},
			{"text": "Not now.", "next": ""},
		],
	},
	"edda_s1": {
		"speaker": "edda",
		"text": "The fen's south of the wall, past the pilgrim road. The beacon stands on the rise by the river bend. Don't drink the water.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"edda_s3": {
		"speaker": "edda",
		"text": "Saw it from the wall. First light on that rise in three nights.

Here. I put an edge on this with the last of the good coal. It's the best thing I've made since the bell started. Don't bring it back bent.",
		"options": [{"text": "Thank you, Edda. [Receive the reward]", "next": "", "action": "complete_southwatch"}],
	},
	"edda_s4": {
		"speaker": "edda",
		"text": "It still burns. Someone's been feeding it, and it isn't me. I've stopped asking who.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"edda_buy": {
		"speaker": "edda",
		"text": "Drink it fast. Don't smell it first.",
		"options": [
			{"text": "Buy another (25 gold)", "next": "edda_buy", "action": "buy_potion", "if": "gold_25"},
			{"text": "[Leave]", "next": ""},
		],
	},
	"edda_lore": {
		"speaker": "edda",
		"text": "Same as every town. People died and we buried them. Difference is, ours don't stay put.\n\nMy brother came back three nights after we buried him. Stood outside my window till dawn. Didn't knock. Just stood.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	# ------------------------------------------------------------ Old Corwin
	"corwin_0": {
		"speaker": "corwin",
		"text": "Mind the soft earth, stranger. Some of these graves are... newer than they look. Dug 'em myself, then dug 'em again when they came up empty.",
		"options": [
			{"text": "Tell me about the crypt.", "next": "corwin_crypt"},
			{"text": "What happened to the wardens' names?", "next": "corwin_w0", "if": "wardens_offer"},
			{"text": "You look troubled, Corwin.", "next": "corwin_k0", "if": "kin_offer"},
			{"text": "About the grave-tokens...", "next": "corwin_k1", "if": "kin_progress"},
			{"text": "[Leave]", "next": ""},
		],
	},
	"corwin_crypt": {
		"speaker": "corwin",
		"text": "The Sunken Crypt. Floods every spring, never drains. The wardens are down there in their armor, standing up, the way they wanted.\n\nHask was the big one. They had to bury him in the bell-pit, he wouldn't fit a coffin. If you're going down, take my lantern-charm. It kept the dark off me for forty years.",
		"options": [
			{"text": "I'll take it. Thank you. [Receive: Gravedigger's Lantern]", "next": "corwin_gift", "action": "corwin_gift", "if": "no_corwin_gift"},
			{"text": "[Leave]", "next": ""},
		],
	},
	"corwin_gift": {
		"speaker": "corwin",
		"text": "Don't thank me. Bring it back if you can. And if you see Hask... tell him the hole's still open for him.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"corwin_after": {
		"speaker": "corwin",
		"text": "Bell's quiet. Graves are quiet. I don't trust it. Quiet's just the dark holding its breath.",
		"options": [
			{"text": "What happened to the wardens' names?", "next": "corwin_w0", "if": "wardens_offer"},
			{"text": "You look troubled, Corwin.", "next": "corwin_k0", "if": "kin_offer"},
			{"text": "About the grave-tokens...", "next": "corwin_k1", "if": "kin_progress"},
			{"text": "[Leave]", "next": ""},
		],
	},
	# ------------------------------------------------------------ The Wardens' Oath (optional)
	"corwin_w0": {
		"speaker": "corwin",
		"text": "Twelve wardens down there, buried standing, each with his name cut in a stone over his head. Then the flood came and pried the stones loose, and the water took them deeper.\n\nA warden with no name doesn't lie down. That's the oath they swore: to stand watch until they're called by name. Nobody's called them in a hundred years.",
		"options": [
			{"text": "I'll find the stones. [Accept: The Wardens' Oath]", "next": "corwin_w0b", "action": "accept_wardens"},
			{"text": "The dead can keep their watch.", "next": ""},
		],
	},
	"corwin_w0b": {
		"speaker": "corwin",
		"text": "Three stones the flood carried furthest, I'd wager. You'll know them: they're cold even down there, and they hum. Set them back on the plinth by the mausoleum door and say the names out loud. Then step back.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"corwin_w1": {
		"speaker": "corwin",
		"text": "Still down there, are they? Look where the water pooled. The flood always leaves its stealing where it stops.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"corwin_w2": {
		"speaker": "corwin",
		"text": "You've got them. I can hear them humming from here. The plinth's by the mausoleum door, east of the graves. Go on, before they change their minds.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"corwin_w3": {
		"speaker": "corwin",
		"text": "They're quiet now. Proper quiet, not the waiting kind. That vigil-plate suits you. Hask wore one like it, before. Don't wear it the way he did.",
		"options": [{"text": "You look troubled, Corwin.", "next": "corwin_k0", "if": "kin_offer"},
			{"text": "About the grave-tokens...", "next": "corwin_k1", "if": "kin_progress"},
			{"text": "[Leave]", "next": ""}],
	},
	# ------------------------------------------------------------ Restless Kin (optional)
	"corwin_k0": {
		"speaker": "corwin",
		"text": "Troubled. Hah. Every soul I put in the ground, I gave a token. Lead coin with their name on, pressed into the hand. So they'd know who they were, if they woke up confused.

The bad ones, the big ones walking about, they still have them. I want them back. Can't say a name over a grave if the name's walking around in the fen.",
		"options": [
			{"text": "I'll bring you their tokens.", "next": "", "action": "accept_kin"},
			{"text": "Not now.", "next": ""},
		],
	},
	"corwin_k1": {
		"speaker": "corwin",
		"text": "Only the strong ones keep hold of them. The rest let go a long time ago. Look for the ones that stand taller than the others, in the fen or down in the crypt.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"corwin_k2": {
		"speaker": "corwin",
		"text": "Give them here. Aldous Penn. Mary Thorne. The Vickery boy, he was always wandering off.

This was in my box for forty years. Belonged to the first gravedigger. Wear it, and they'll know you did right by them.",
		"options": [{"text": "Rest well, all of them. [Receive the reward]", "next": "corwin_k3", "action": "complete_kin"}],
	},
	"corwin_k3": {
		"speaker": "corwin",
		"text": "I'll say their names tonight. Loud, so the others hear.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	# ------------------------------------------------------------ The Lamplighter (speaks only in questions)
	"lamp_0": {
		"speaker": "lamplighter",
		"text": "Did you hear the bell stop? Did you think the quiet meant it was over?\n\nWho lights the lamps, do you suppose, when no one in Hollowmere has oil left to burn?",
		"options": [
			{"text": "Who are you?", "next": "lamp_0b"},
			{"text": "[Leave]", "next": ""},
		],
	},
	"lamp_0b": {
		"speaker": "lamplighter",
		"text": "Who were you, before the road brought you here? Do you remember? Does anyone who walks out of the fog?\n\nWould you follow my lamps, if they led to a grave nobody marked?",
		"options": [
			{"text": "Show me. [Accept: Lamps Without Oil]", "next": "lamp_accept", "action": "accept_lamps"},
			{"text": "Not tonight.", "next": ""},
		],
	},
	"lamp_accept": {
		"speaker": "lamplighter",
		"text": "Do you see them lighting, one by one, toward the graves? Will you dig where the last one burns?",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"lamp_1": {
		"speaker": "lamplighter",
		"text": "Why are you still here, when the lamps are already lit?",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"lamp_2": {
		"speaker": "lamplighter",
		"text": "Can you read it? Can you read the names? Can Sister Maud, do you think, without her hands shaking?",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"lamp_3": {
		"speaker": "lamplighter",
		"text": "Do you hear the wells? Did you think bells were the only things that could toll?\n\nWhen you go down, will you leave a lamp burning for the next one?",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	# ------------------------------------------------------------ Lamps Without Oil and the act's end (Maud)
	"maud_l0": {
		"speaker": "maud",
		"text": "The nights are silent. I hate them more than the tolling. Silence means something is listening.\n\nAnd there is a child in the square with a lamp. I have lived in Hollowmere all my life, and I do not remember that child. Ask it what it wants. I can't bring myself to.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"maud_l1": {
		"speaker": "maud",
		"text": "The lamps on the graveyard path are burning. Nobody filled them. Follow them if you must. Dig if you must. Just bring back whatever you find, and don't read it aloud on the way.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"maud_l2": {
		"speaker": "maud",
		"text": "A charter? From an unmarked grave? Give it here.\n\n'Thirteen who walked out of the fog, given to the stone beneath the town, that the Maw be held shut. Let their prayers be the Seal, and let no one name them.' And then thirteen names. The founders' hands. The founders' seals.",
		"options": [{"text": "The saints weren't volunteers.", "next": "maud_l2b"}],
	},
	"maud_l2b": {
		"speaker": "maud",
		"text": "No. They were strangers. Like you. The founders waited for the fog to bring them someone, and walled them up praying, and called it holy.\n\nThree hundred years of tolling bells, and none of us asked who was under the stone.",
		"options": [{"text": "And now the Seal is failing. [Complete: Lamps Without Oil]", "next": "maud_l2c", "action": "complete_lamps"}],
	},
	"maud_l2c": {
		"speaker": "maud",
		"text": "Listen. Do you hear that? Not the bell. The wells. Every well in Hollowmere is tolling, from far below the water.\n\nThere is a stair under the chapel altar, sealed since the founding. I swore I would never open it. I'm opening it now. Go down, child. Find the Ossuary of the Thirteen before whatever is ringing finds us.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"maud_e1": {
		"speaker": "maud",
		"text": "The undercroft stair is open, behind the chapel door. It goes deeper than the crypt, deeper than the bell-pit. I will pray at the top of it. It is all I know how to do any more.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"maud_e2": {
		"speaker": "maud",
		"text": "You came back up. Good. The wells are still tolling. Whatever you saw down there, the stair goes further. When you're ready, it will still be waiting.\n\n(Act II, The Ossuary of the Thirteen, is coming.)",
		"options": [{"text": "[Leave]", "next": ""}],
	},
}


## Which node an NPC opens with, given the quest states and flags.
static func entry(npc_id: String, quests: Dictionary, flags: Dictionary) -> String:
	var bell := int(quests.get("silent_bell", 0))
	var lamps := int(quests.get("lamps", 0))
	var act_end := int(quests.get("act_end", 0))
	var wardens := int(quests.get("wardens", 0))
	var southwatch := int(quests.get("southwatch", 0))
	var kin := int(quests.get("kin", 0))
	match npc_id:
		"maud":
			if bell < 3:
				return "maud_%d" % clampi(bell, 0, 2)
			if act_end >= 2:
				return "maud_e2"
			if act_end == 1:
				return "maud_e1"
			match lamps:
				1: return "maud_l1"
				2: return "maud_l2"
			return "maud_l0"
		"edda":
			if southwatch == 3:
				return "edda_s3"
			return "edda_0"
		"corwin":
			if kin == 2:
				return "corwin_k2"
			match wardens:
				1: return "corwin_w1"
				2: return "corwin_w2"
				3: return "corwin_w3"
			if bell >= 3:
				return "corwin_after"
			return "corwin_0"
		"lamplighter":
			if lamps >= 3:
				return "lamp_3"
			return "lamp_%d" % clampi(lamps, 0, 2)
	return ""
