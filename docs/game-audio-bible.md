# Depths of Darkness · Game audio bible

**Act I — The Tolling of Hollowmere**  
PC · isometric 3D · production direction, 25 November 2026

## Implemented sound bank

The audit below describes the baseline before implementation. The new runtime
bank contains 139 original synthesized WAVs under `godot/assets/audio/hollowmere/`:
72 spell takes, 55 effects, five scores, two synchronized boss phase layers and
five environment beds. Speech still uses the existing voice bank. All new WAVs
are 32 kHz, 16-bit PCM, mono for point effects and stereo for music and beds.
The scores run at 72 BPM in 4/4 over eight bars. The recording briefs and
mix targets later in this document remain the reference for final production.

Rebuild with `npm run audio:hollowmere` from the repository root. The editable
[synthesis program](../scripts/audio/hollowmere-bank.mjs) uses deterministic
layers of noise, tuned resonances and envelopes. It requires no external samples
or services. Import with the project editor, then run
`godot --headless --path godot res://tests/audio_test.tscn` to validate imports,
the Effects mixer, Hask's warning duration and score transitions.

For new terrain or weather, attach `godot/scripts/world/audio_zone.gd` to an
Area3D with a CollisionShape3D and a collision mask that detects the hero.
Choose a surface and/or bed in the Inspector. Higher-priority overlapping zones
win for each field. Enable thunder on rain zones with visible storms. The town
map selects earth or cobblestone directly, and the crypt defaults to stone.

## The sound of Hollowmere

Hollowmere once told time by its bell. Give the town small, irregular sounds made by hands: a shutter caught on a latch, a boot disturbing grit, Edda setting down a bottle. In the crypt, let the architecture answer the player. A step comes back from across the room. A drop falls somewhere beyond the doorway. When Hask moves, the bell finally has a body. After his defeat, allow one ordinary drip to be the first thing the player hears again.

Use the references as listening briefs: **Diablo IV** for the scale relationship between close weapons and distant spaces, **Path of Exile 2** for identification under pack density, **Elden Ring** for the interval between a threatening gesture and contact, and **Baldur’s Gate 3** for the space left around a speaking character. Judge original recordings in gameplay against those four qualities. The recurring original musical cell for this production is D–E♭–A, with a long rest before A. Hask interrupts the cell after E♭. The town resolves it only after the story authorizes relief. Reserve the literal iron toll for authored events.

## Pipeline audit

Scope covers the game runtime, project settings, content banks, source-generation and asset handoff conventions, CI configuration and existing test assertions. The observations below come from script/scene inspection, WAV headers and decoded PCM sample peaks. Perceptual balance, voice performance, loop seams, runtime latency and device translation require listening to a PC build. All creative descriptions and mix levels below are production proposals.

| Runtime bank | Files | PCM format (all mono, 16-bit) | Duration per file | Source sample peak, dBFS |
|---|---:|---|---|---|
| Music | 4 | 22.05 kHz | Hask 40 s, other themes 64 s | −1.01 |
| Ambience | 2 | 22.05 kHz | Drips 36 s, wind 40 s | −3.10 |
| SFX | 1 | 22.05 kHz | Toll 9 s | −0.92 |
| Spells | 45 | 18 at 22.05 kHz, 27 at 44.1 kHz | 0.54–2.60 s | −1.72 to −1.41 |
| Voice | 39 | 34 at 24 kHz, 5 at 44.1 kHz | 0.34–20.48 s | −5.75 to −0.72 |

**Authoring to output.** Editable sources belong under `source-assets/Audio/`; its checked-in README points to the project’s source/export convention. `scripts/audio/act1-audio.mjs` synthesizes four music tracks, two beds, the toll and six three-take skill sets from seeds, folds loop tails, and writes directly into `godot/assets/audio/`. It does not account for all shipped audio. Record the origin of the other takes before replacing them. Render candidates to staging to keep regeneration from overwriting approved mixes. Track working sessions and exports through the project’s Git LFS workflow.

**Runtime.** `project.godot` registers ActAudio and Settings. The project feature tag is 4.3; CI pins Godot 4.7.2. ActAudio resolves WAVs by folder and ID. Spells pick a different one of three adjacent takes and may request a voice bark. Missing base spell IDs return before either sound or bark. Actors, HUD and guide own transient players. The autoload owns one current score and bed, uses 1.6 s fades, sets whole-WAV loop points at runtime and processes during pause. Boss entry changes music only, inheriting the existing ambience. Every playback node constructed there is nonpositional. The camera follows from (0, 15.5, 11), zooms and shakes. Attaching future emitters directly to a camera listener would change apparent range with zoom.

**Gain and control.** Current player gains are music −15 dB, ambience −19, voice −3, toll −6, spells −8.5 to −7. Settings creates Music, Effects, Voice and Ambience, sends them to Master, and persists 0–100 linear controls. Defaults are 80/70/85/90/70 for Master/Music/Effects/Voice/Ambience. A missing named bus falls back to Master. Barks share a 6.5–10 s cooldown, per-ID repeats wait 16–23 s, and interrupting dialogue can take the voice slot. There is no comparable overall effects allocation in ActAudio. `godot/tests/smoke_test.gd` checks area playback and WAV looping; `ui_test.gd` checks routing and music gain. Extend these assertions when changing stream types.

**Coverage.** Menu, town, crypt and Hask have score hooks. Casts and aggro have partial coverage. Damage, critical flags, loot kind/rarity, quest commits, equipment changes and HUD interactions provide firmer audio triggers than animation guesses. Dedicated banks for UI, ordinary impacts, gait/surfaces, most environmental detail and adaptive pack combat are absent from the shipped audio tree. Forest, cave, snow and storm treatments below are briefs for compatible or future content. Activate them only where level metadata supports them.

## Playback and mix contract

- **Measurement.** Audition the reference build with sliders at unity, neutral playback processing and a fixed listening gain. Each card’s **peak** is the isolated routed cue’s sample peak in dBFS at Master, at reference distance with scene reverb included. **S** means short-term LUFS across representative active 3-second windows of a continuous sound; use short-term ranges for beds and scores and peaks for brief events. Values describe rendered output, independent of source normalization and Godot fader values. Verify stock slider defaults separately. Use an external BS.1770 meter on captured stereo output. Start with −20 to −16 LUFS integrated across a scripted ten-minute mixed traversal and ≤ −1 dBTP after limiting. These are project audition targets.
- **Perspective.** Make an AudioListener3D current near the hero at chest height, oriented with the camera’s horizontal screen axes, independent of shake, zoom and actor facing. In the cards, “near” starts at unit_size 2, max_distance 12 game units; “field” starts at 4/24. Tune in the actual grid. Disable Doppler on fixed beds, UI and footsteps. Check lateral readability at all zoom settings. Keep low frequencies centered. World tails can live on detached emitters until decay or scene unload. [Godot positional playback](https://docs.godotengine.org/en/4.3/classes/class_audiostreamplayer3d.html)
- **Bus design.** Preserve saved slider parents. Route UI, Foley, Weapons, Impacts, Threat and Rewards into Effects. Route beds and weather into Ambience; route music stems into Music and dialogue/barks into Voice. In the bus layout put each destination to the left of its children. Use dry close sources plus separately controlled wet returns routed to the same slider parent. Begin with room decay 0.45 s, stone 1.2 s, cave 2.1 s, high-pass wet returns at 180 Hz. Mark exterior, room and cave volumes; crossfade wet contribution at doorways. Keep warnings and dialogue fronts dry. [Godot audio buses](https://docs.godotengine.org/en/4.3/tutorials/audio/audio_buses.html)
- **Priority.** Threat onset and critical dialogue outrank player attacks, then verified contact/reward, then enemy debris, steps and environmental detail. Start with 32 pooled effect voices, including 4 reserved for warnings/player harm, 2 for rewards and 2 for player contacts. Cap ordinary enemy impacts at 6, local incidental emitters at 4. Keep score, beds and voice outside this pool and profile their additional cost. Steal the quietest distant voice in the lowest eligible class with a 15 ms fade. Give each attack an ID so one area hit produces one accent and several quiet contact bodies. Reuse existing no-adjacent-repeat behavior; shuffle larger sets and preserve attack pitch for informational motifs.
- **Snapshots.** Dialogue brings music down 3 dB and busy detail down 4 dB over 100 ms, releasing over 450 ms. Boss warnings duck competing music percussion and impacts 3–5 dB over 30 ms and release 250 ms after contact. Implement child-bus gain offsets or dedicated compressors. Sum overlapping state requests by choosing the deepest requested cut per bus, with user slider gain applied independently. Pause freezes world one-shots and schedulers, leaves menu feedback active and retains the existing music/bed continuity. After travel, cancel delayed world events by scene generation ID.
- **Delivery.** Archive dry 48 kHz/24-bit WAV and session, individual layers and wet reference. Deliver short runtime mono WAVs for point sources, stereo for score and beds; audition Ogg Vorbis for long streams and verify loop points on the imported resource. Change the WAV-only resolver and WAV-specific tests before switching formats. Supply exact loop frames, BPM, meter, entry/exit bars, gain trim, priority, restart policy, rights and source notes in the asset register. Example ID: `foley/step_stone_walk_l_03`. Use lowercase family/action/material/variation; keep gameplay skill and dialogue IDs as aliases. Capture transients with edit handles, remove DC and clicks, trim onset intentionally. Do not upsample legacy files as a substitute for new high-bandwidth sources.
- **Generation.** The prompt on each card commissions an original isolated source or performance. For every request append the card’s duration, format and perspective, request clean head/tail handles and separate stems, and retain tool/version, terms, prompt, take and human edits. For loops supply clean boundary handles and verify them in engine. A sound editor selects takes, removes artifacts, and matches them to animation before approval.

## Cue sheets

Each card scopes a recordable unit. Variation counts are starting orders for the first production pass. Frequencies describe where the identifying information should survive. EQ cuts and duck depths are starting moves to audition in context.

### 01 · Main Menu

**Current purpose.** main_menu.gd calls play_area("title"), starting a 64 s theme and clearing the bed.

**Direction and emotional target.** Make the title feel like a chapel door left open. Give the first actionable button a quiet bar in which to speak.

**Layers and Foley order.** Commission a 6 s threshold, 96 s loop and 2 s exit. Bowed iron sustains under felted bass strings; a single bench creak lends human scale. Record hinge and pew separately.

**Frequency and effects chain.** High-pass room at 55 Hz → tame iron around 2.8 kHz → dark 1.6 s chamber on the bowed layer. Keep bowed harmonics audible near 700 Hz.

**Mix, level and perspective.** Stereo near-center strings with wide room, −29 to −25 S. Trim the entrance so a fresh boot at default volume feels gentle.

**Godot implementation.** Extend title state with one intro per cold launch. Loop during settings navigation. Cancel entrance and release into town on scene commit.

**Generation prompt.** “Record an empty hillside chapel at dusk, bowed iron barely waking above a felted string drone, lone wooden bench shifting, a long patient opening, separate entry and loop. ”

### 02 · UI Clicks

**Current purpose.** Menu and HUD controls signal focus and activation visually; no dedicated click bank was found.

**Direction and emotional target.** A control should feel operated by a fingertip. Focus brushes, accept catches, back releases, denial meets a padded stop.

**Layers and Foley order.** Record four each of fingernail on leather, small clasp catch, spring release and padded wood block. Trim focus to 35 ms and accept to 70–110 ms.

**Frequency and effects chain.** High-pass 220 Hz → emphasize 1–2 kHz catch → soften 4–6 kHz with a dynamic cut. Dry endings.

**Mix, level and perspective.** Center 2D, peaks −27 focus, −20 accept, −22 deny. Suppress focus on the same frame as activation.

**Godot implementation.** Connect BaseButton.pressed and focus_entered once per control. Debounce focus 70 ms across mouse/controller; emit denial from the rejected action.

**Generation prompt.** “Tiny leather-bound book clasp under a fingertip, four dry gestures, brush, catch, release, padded refusal, no room or pitched chime.”

### 03 · Inventory

**Current purpose.** Item cells, moves and salvage convey pack changes; inventory_changed also drives redraws.

**Direction and emotional target.** Make the pack intimate enough to distinguish picking something up, placing it and permanently salvaging it.

**Layers and Foley order.** Three cloth lifts, four pouch settles, three thread-and-metal salvage snaps. Lead with material, add hand contact 20 ms later; settle within 220 ms.

**Frequency and effects chain.** High-pass 100 Hz → tame 350 Hz boxiness → transient-shape the latch. Short dry cloth tail.

**Mix, level and perspective.** 2D close center, −24 to −19 peak. Salvage may reach −17. Suppress generic clicks on handled drag/drop.

**Godot implementation.** Hook successful move_item and salvage mutations, plus drag start in item_cell. Returning to the origin plays a soft return. Loading inventory is silent.

**Generation prompt.** “Close microphone inside a worn canvas satchel, lift a wrapped metal object, settle it into felt, separate short thread-breaking salvage gesture.”

### 04 · Equipment

**Current purpose.** equip_to and unequip update worn slots; the change has no dedicated material cue.

**Direction and emotional target.** The weight should arrive when gear seats. A failed slot change should sound plainly different.

**Layers and Foley order.** Four sets each for plate, leather and trinket. Strap pull → seat at 70 ms → short rattle. Unequip reverses the gesture with a slack strap and no lock.

**Frequency and effects chain.** High-pass 75 Hz → trim 250 Hz on plate → damp 3.5 kHz spikes → short wooden-room reflection.

**Mix, level and perspective.** Centered UI, −18 to −15 peak. Turn secondary jingles 8 dB below the seat.

**Godot implementation.** Emit once on successful equip_to/unequip return, classify by slot and material metadata with cloth fallback. One swap yields one seat.

**Generation prompt.** “A padded gorget settling against a leather stand, strap tension and a single heavy buckle catch; repeat as cloth harness and small amulet.”

### 05 · Vendor

**Current purpose.** Edda has recorded dialogue; buy_potion validates gold and carrying capacity.

**Direction and emotional target.** Make a successful draught sale sound like an exchange between people. Let a failed purchase stop at an empty hand.

**Layers and Foley order.** Four coin-on-wood takes, three corked vial lifts and two empty purse pats. Coin lands first, glass answers after 90 ms.

**Frequency and effects chain.** High-pass 150 Hz → de-ring glass above 4 kHz → 90 ms counter reflection. Preserve coin definition near 1.4 kHz.

**Mix, level and perspective.** Center 2D −20 to −17 peak; under speech trim 4 dB. Denial peak −23.

**Godot implementation.** Emit purchase after gold debit and potion grant in run_action. Use one rejection gesture for insufficient funds/full stock capacity and retain the reason on screen.

**Generation prompt.** “A bronze coin counted onto a scarred apothecary counter and one corked bottle lifted; separate empty-purse pat, dry discrete takes.”

### 06 · Quest Accept

**Current purpose.** Dialogue actions commit The Silent Bell, Lamps Without Oil and the Wardens’ Oath. Some lines have voice.

**Direction and emotional target.** Convey a promise. Two quiet notes rise a semitone and leave the phrase hanging.

**Layers and Foley order.** Layer vellum fold, softened seal press and D–E♭ stopped viol; 0.8 s main take plus speech-light alternate without the upper bow.

**Frequency and effects chain.** High-pass page at 220 Hz → round the seal attack → low-pass a 0.5 s room return at 3 kHz.

**Mix, level and perspective.** Centered seal, narrow stereo viol; −19 to −16 peak. If a line starts, keep seal on commit and postpone tonal answer to its first gap.

**Godot implementation.** Emit on 0→1 for each accepted quest ID. Guard load/restore and repeated dialogue clicks. Stinger uses Rewards under Effects.

**Generation prompt.** “An oath quietly undertaken, folded vellum and worn seal pressed by hand, two muted viola notes one semitone apart, final breath of silence.”

### 07 · Quest Complete

**Current purpose.** Quest turn-ins alter state, grant rewards and sometimes fire story events or the Act ending.

**Direction and emotional target.** Earned relief. Answer the vow with A played on open strings, then give the room back to the speaker.

**Layers and Foley order.** Seal lift → warm viol fifth → one low struck wood accent. Author 1.6 s side and 2.8 s main resolves plus a dry seal-only overlap edit.

**Frequency and effects chain.** High-pass music layer 85 Hz → dip 1.8 kHz under voice → diffuse 1.2 s tail. No large drum.

**Mix, level and perspective.** Narrow stereo, −16 to −13 peak. Act-ending toll takes foreground; use seal-only edit when both coincide.

**Godot implementation.** Emit once per committed completion, including optional quest paths. Coalesce XP/gold/reward feedback from the same transaction. Hand story toll precedence to world/HUD.

**Generation prompt.** “Release a wax seal in a quiet chapel, low open strings answering a two-note vow, one wooden knock, weary relief with a finite decay.”

### 08 · Character Movement

**Current purpose.** Player locomotion, rush and dash move the hero; select skills already have cast mixes.

**Direction and emotional target.** Hear the person carrying the equipment. Cloth leads a light pivot; weight catches up on a hard stop.

**Layers and Foley order.** Six cloth twists, four harness checks, three skids per weight class. Record a shoulder cape and buckled satchel worn together; separate sprint and dodge layers.

**Frequency and effects chain.** High-pass cloth 180 Hz → reduce harness 2.5 kHz → soften cloth transients. Leave 120–250 Hz to steps.

**Mix, level and perspective.** Near 3D, −29 to −23 peak, heavy stop −20. Keep cloth 6 dB under the sole and omit every other rustle at speed.

**Godot implementation.** Use grounded acceleration, stop and dash edges from player.gd. Scale by actual distance/velocity; stop loops on death, pause and teleport. Suppress dash Foley already printed into a skill.

**Generation prompt.** “Short twisting cloak, shoulder strap lagging behind a sudden stop, three weight classes recorded close in a dead room, discrete gestures.”

### 09 · Footsteps

**Current purpose.** Movement traverses a 3D grid; no surface-selected footfall bank was found.

**Direction and emotional target.** Hear ground texture by the second footfall. Keep a constant boot identity across terrain and retain a left/right gait.

**Layers and Foley order.** Per surface record heel, sole compression and release, 4 left + 4 right for walk and run (80 composites total). Stone: leather slap + loose grit. Dirt: packed-earth thud + granular scuff. Wood: heel knock + flexing board. Grass: muted sole + blade swish. Snow: short crust break + compressed powder. Add hard-stop scrapes separately.

**Frequency and effects chain.** High-pass 55 Hz → trim mud 220–350 Hz → surface EQ: stone grit 2–4 kHz, dirt body 180–450 Hz, wood knock 350–900 Hz, grass 2–5 kHz, snow crunch 800 Hz–3 kHz. Room send follows location.

**Mix, level and perspective.** Near 3D, −23 to −18 peak walk, run up to −15. Wood carries a little farther; lower grass scuff under speech. NPC feet 5 dB below hero.

**Godot implementation.** Animation contact if available; otherwise accumulate grounded travel distance, alternate feet, reset on teleport. Resolve surface from downward ray collider metadata or level_grid cell tag with stone fallback. Cross a seam and verify one sound per plant.

**Generation prompt.** “One worn boot walking and running left then right over flagstone, packed dirt, planked wood, tufted grass and crusted snow; isolated heel-to-toe takes, natural small differences.”

### 10 · Sword Attacks

**Current purpose.** Grave Cleave and Twin Cuts use skill-ID takes. Gear includes sword and falchion icons; contact has no separate material bank.

**Direction and emotional target.** A blade’s edge should read through speed. Air passes on a miss; only a successful strike arrests it.

**Layers and Foley order.** Six short and four heavy swishes using suede straps and thin flexible props; add grip creak and a damped metal strip. Deliver swing and edge-stop separately.

**Frequency and effects chain.** High-pass swing 150 Hz → shape 1.5–3 kHz air → de-ring strip near 5 kHz → environment send on contact only.

**Mix, level and perspective.** Near hero swing −18 to −14 peak. Field contact at enemy −14 to −11. Cap simultaneous bright scrapes at two.

**Godot implementation.** Select weapon family from explicit metadata or known icon. Play swing on attack release, impact on take_damage. Trim printed impacts from old casts before layering. Preserve hit timing at high attack speed.

**Generation prompt.** “A narrow fast arc through air, soft leather grip twist, fine metal singing only at its stop; light and heavy versions, separate air and contact.”

### 11 · Axe Attacks

**Current purpose.** Lychgate Axe exists in warrior items. Playback currently selects the skill ID, so gear has no independent swing voice.

**Direction and emotional target.** Make the head feel late relative to the hand. Give a miss a falling air pitch and a hit a short, weighted stop.

**Layers and Foley order.** Record handle torque with wrapped wood, broad canvas passing the mic, and sandbag against a thick wood block. Four light and four heavy swings with separate stops.

**Frequency and effects chain.** High-pass 45 Hz → emphasize 95–160 Hz strike and 650 Hz handle → saturate body lightly → short room. Shorten lows below 100 Hz to 120 ms.

**Mix, level and perspective.** Near swing −18 to −14 peak, field hit −13 to −10. Alternate the midrange knocks in packs; grant bass to nearest heavy contact.

**Godot implementation.** Map axe icon to axe family in primary attack. Contact uses the enemy material response once. Keep airborne whoosh timing independent of damage confirmation.

**Generation prompt.** “Broad weighted canvas sweep followed by wrapped timber flexing in the hand, blunt grainy stop on packed canvas, dry separated components, four intensities.”

### 12 · Magic Attacks

**Current purpose.** ActAudio plays three takes for each of 15 mapped skills and calls optional bark. Several base IDs have no clip.

**Direction and emotional target.** Each school needs a legible verb: fire opens like a breath, wards close inward, shadow slips sideways. Separate cast intent from where danger lands.

**Layers and Foley order.** For each skill build 3 release takes, an optional flight/sustain loop and 3 impact or expiry takes. Record grit on paper, stressed silk, ceramic ticks and breath through cloth. Use timed grains for fire, reversed silk for shadow, rubbed ceramic for ward.

**Frequency and effects chain.** High-pass charge 140 Hz → band-shape school identity (fire 500–1600 Hz, shadow 0.8–2 kHz, ward 1.5–3 kHz) → soften top → send only tail to room.

**Mix, level and perspective.** Near cast −18 to −14 peak, impact −14 to −10. Field flight travels with projectile; collapse fan casts to one release. Reserve low pulse for area impacts.

**Godot implementation.** Dispatch cast at accepted action, flight on projectile, burst on verified hit/zone tick, expiry once on despawn. For sustained zones cap repeated accents at 4/s. See the skill ledger below.

**Generation prompt.** “Dry magic source study, ember grit blooming outward, shadow drawn sideways through silk, protective ceramic ringing inward; separate onset, sustained middle and release, no voice.”

### 13 · Critical Hits

**Current purpose.** enemy.take_damage receives crit and shows impact FX and damage text. No independent critical accent was found.

**Direction and emotional target.** Make exceptional contact readable in a crowd. A momentary gap followed by a doubled hard tick signals precision.

**Layers and Foley order.** Five ceramic tick pairs (18–28 ms spacing), muted drumskin pulse and a 100 ms silver overtone. Keep a mid-only alternative for small speakers.

**Frequency and effects chain.** High-pass accent 100 Hz → parallel saturate drum → isolate 1.2–2.4 kHz doublet → damp above 5 kHz.

**Mix, level and perspective.** Field at target plus a quiet centered owner accent, combined −12 to −9 peak. Dip the ordinary contact 2 dB. One critical accent per attack or 120 ms cluster.

**Godot implementation.** Use confirmed crit flag with attack ID and target position. A chain or area crit chooses the nearest significant target; reserve a distinct player-hurt signal.

**Generation prompt.** “Pair of sharp porcelain taps with a tightly damped drum underneath, precision and sudden clarity, five irregular natural performances, isolated.”

### 14 · Enemy Hits

**Current purpose.** Damage flashes, knockback and numbers identify landed hits. Aggro voice may also speak on first contact.

**Direction and emotional target.** Tell the player what resisted the blow: hollow cloth gives, an archer frame clacks, a crawler shell skitters, Hask’s plate answers.

**Layers and Foley order.** Four light and four heavy responses per family. Record layered linen against a pad, dry wooden dowels, nutshells on slate and a muted iron tray. Print separate first contact and 150 ms debris.

**Frequency and effects chain.** High-pass 65 Hz → shape body 180–500 Hz → leave 1–2 kHz edge by family → stone room send at low level.

**Mix, level and perspective.** Field mono at target, −16 to −12 peak. Closest confirmed hit stays full; distant simultaneous contacts lose debris and 4–8 dB.

**Godot implementation.** Emit after dead guard and accepted damage. Select kind/armor and reaction size; damage over time gets a quiet tick with per-target cooldown. Lethal hit yields tail to death cue.

**Generation prompt.** “Four contact materials under a padded mallet, compressed linen, loose wooden frame, hard shell and muted plate, short distinct dry attacks.”

### 15 · Enemy Deaths

**Current purpose.** _die removes actors from combat and emits died before the death animation and removal. No dedicated death bank surfaced.

**Direction and emotional target.** Close the encounter with a recognizable loss of tension. A hollow folds; an archer comes apart in two small stages.

**Layers and Foley order.** Three releases per enemy family: cloth settling, dowel joints loosening, shell rolling to rest. Add a short performed exhale only where the animation supports it.

**Frequency and effects chain.** High-pass 85 Hz → contour 300–900 Hz fall → low-pass debris with distance → local room. Shorten excess rattles to 600 ms.

**Mix, level and perspective.** Field at corpse, −18 to −13 peak. Allow one full release per 180 ms cluster; neighbors supply small falls. Keep quest VO clear.

**Godot implementation.** Use died once per actor. Give tails to world-owned pooled emitters, align floor settle to animation contact, suppress regular death bank for bosses.

**Generation prompt.** “Collapse of a linen-wrapped wooden puppet, segmented wood frame and small shell cluster, three separate material families, brief floor settle and quiet.”

### 16 · Boss Attacks

**Current purpose.** Hask starts a 1.2 s radius-seven toll warning; damage resolves at expiry. Cooldown falls from 7 to 5 s when enraged. A 9 s toll can overlap the next warning.

**Direction and emotional target.** The player should know when to move before seeing the ring. A dry catch announces commitment; pressure grows to a clean release.

**Layers and Foley order.** Record three iron latch catches plus bowed rim rising for exactly 1.2 s. Separate short clapper impact, air pulse and room decay. Create melee drag, summoning chest knock and enrage vent as independent signatures.

**Frequency and effects chain.** High-pass warning 180 Hz → emphasize 900 Hz–2 kHz latch → keep rising partial steady; impact 70–130 Hz → soft saturation → 0.8 s dark return.

**Mix, level and perspective.** Field at Hask, centered safety layer at −18 peak when distant. Combined warning −14 to −11 peak, release −10 to −7. Duck percussion; never steal active warning.

**Godot implementation.** Start on _toll_pending assignment, release on expiry even if player escapes. Cancel pending release on boss death, freeze on pause. Add one chest knock below half health and vent below quarter; suppress ordinary aggro overlap.

**Generation prompt.** “Iron latch taking weight, a bowed iron rim under measured tension for 1.2 seconds, separate decisive clapper stroke and air pulse; readable dry midrange onset.”

### 17 · Boss Deaths

**Current purpose.** world._on_enemy_died restores crypt music after Hask. The story also uses tolls at the wells and Act end.

**Direction and emotional target.** Let the Warden’s held tension fall out of the room. His last audible movement should be smaller than his warning.

**Layers and Foley order.** Heavy harness buckle gives, bell shell lands on a folded blanket, clapper rolls to one dry stop. Author 3.2 s sequence, 1 s short edit, independent crypt reflection.

**Frequency and effects chain.** High-pass 38 Hz → compress body only 2:1 → automate iron upper partials downward → filter reverb until the clapper stops.

**Mix, level and perspective.** World-anchored body plus stereo room, −10 to −7 peak. Withdraw drums immediately. Bring drips back after the clapper and delay the crypt phrase to its gap.

**Godot implementation.** Intercept boss defeat once before regular death/reward arbitration. Crossfade via a death transition state, cancel pending attacks and release loot notification afterward. Skip safely on relocation.

**Generation prompt.** “A massive suspended bell settling into padded earth, worn harness unfastening, one small loose clapper rolling to a stop in a stone vault; final and unhurried.”

### 18 · Loot Drops

**Current purpose.** world._drop creates gold, potion or item; loot.gd labels and auto-collects at close range. No dedicated landing cue.

**Direction and emotional target.** Point to the object and convey its material. Pickup should answer the landing gesture without repeating it.

**Layers and Foley order.** Four coin scatters, four stoppered bottle taps, four cloth/metal landings. Record onto slate and earth; capture separate short pouch catches for collection.

**Frequency and effects chain.** High-pass 130 Hz → control glass/coin 3–5 kHz → shape 500 Hz gear body → local early reflections.

**Mix, level and perspective.** Field mono landing −22 to −17 peak; pickup near center −23. Merge gold within 150 ms; keep one material identity per cluster.

**Godot implementation.** Dispatch after _drop creates an object at final position and once on successful collection. Honor full pack and potion capacity; never replay from the bob animation.

**Generation prompt.** “Three modest objects landing separately on flagstone, handful of worn coins, corked bottle, folded equipment; soft pouch collection answers, isolated.”

### 19 · Legendary Loot

**Current purpose.** Item ranks are Worn, Hallowed, Cursed, Relic and Unique. Visual beams start at Cursed. Relic rank can also label quest items.

**Direction and emotional target.** Make the rarest find identifiable from another part of the room. Reserve the third ascending partial for a Unique.

**Layers and Foley order.** Relic: fingertip on struck bronze plus two glass harmonics. Unique: extend to a third harmonic, with a dry velvet landing underneath. Three performances per rank, 0.7/1.4 s.

**Frequency and effects chain.** High-pass 180 Hz → tune partials around 700 Hz, 1.05 and 1.4 kHz → de-ring above 4 kHz → 0.8 s stereo bloom.

**Mix, level and perspective.** Field landing, narrow 2D recognition layer, combined −16 to −12 peak. Keep one signature per rank per cluster; defer during a boss warning.

**Godot implementation.** Map requested “legendary” to ordinary Relic and Unique items, exclude quest slot. Use committed spawn for ground loot; direct grants get one UI variant. Keep label/beam as parallel information.

**Generation prompt.** “Quiet velvet landing leading to a bronze and glass harmonic answering in two notes, alternate exceptional three-note resolution, restrained, no coins or fanfare.”

### 20 · Ambient Environment

**Current purpose.** ActAudio switches one nonpositional wind or drip loop by area. Persistent bed is the continuity layer.

**Direction and emotional target.** Build depth with three distances: air around the listener, an identifiable object nearby and a far event that invites attention.

**Layers and Foley order.** Two 90 s neutral airs, four local emitters per zone and eight isolated distant details. Record 60 s room tone at each Foley location; hold intentional gaps of 8–25 s between details.

**Frequency and effects chain.** High-pass air 65 Hz → pull 250 Hz buildup → roll off distant detail above 3 kHz → shared zone reflection.

**Mix, level and perspective.** Diffuse stereo bed −38 to −33 S, local detail −28 to −22 peak. Limit simultaneous prominent details to two.

**Godot implementation.** Use one zone controller per loaded world, stable random seed per visit, tagged emitter anchors and crossfades at portals. Retain bed continuity through combat.

**Generation prompt.** “Nearly still medieval landscape air at three distances, empty center, separate quiet background and occasional far timber strain, long steady stereo bed.”

### 21 · Dungeon Ambience

**Current purpose.** Sunken Crypt pairs its score with a 36 s drips loop; boss entry inherits it.

**Direction and emotional target.** The crypt should feel built and measured. Repeat reflections at masonry distances; place water off the traversal line.

**Layers and Foley order.** 90 s damp room bed, six mono drips, three grate vibrations and two distant sluice turns. Record water into shallow ceramic, then stone; record metal grate rub separately.

**Frequency and effects chain.** High-pass water 170 Hz → notch whistle near 2.6 kHz → 25 ms early reflection and 1.2 s damp chamber.

**Mix, level and perspective.** Stereo floor −36 to −32 S; field drips −25 to −20 peak. Keep entrance distinguishable from boss room with a drier foreground.

**Godot implementation.** Tag crypt room volumes and spawn points; keep one emitter behind a grate, alternate dry/wet doors by portal proximity. Reduce active drips during warning.

**Generation prompt.** “Damp squared masonry chamber, shallow uneven water drops against stone and ceramic, restrained iron grate vibration, distant drain, separate dry spots and diffuse air.”

### 22 · Cave Ambience

**Current purpose.** No separate cave bank or area branch. This palette extends underground spaces that level design marks as natural rock.

**Direction and emotional target.** Make the ceiling feel uneven and the next passage unknowable. Allow isolated drops to reveal chamber size.

**Layers and Foley order.** Two cavern air loops, six irregular drops into deep water, three gravel slips. Record pebbles on slate and near-water transients; create distant answers separately.

**Frequency and effects chain.** High-pass 50 Hz → cut 200–300 Hz rumble → 55–90 ms predelay into 2.1 s diffuse tail; damp above 3 kHz.

**Mix, level and perspective.** Bed −38 to −33 S; individual point reflections −27 to −21 peak. One long tail per chamber.

**Godot implementation.** Register natural-rock zone only on tagged cells. Place a 3D point at the visible fissure, blend return at cave mouth and limit reflection count.

**Generation prompt.** “Still natural limestone cavern, slow subterranean air, one pebble slipping into deep water, irregular asymmetric reflections, long quiet intervals.”

### 23 · Town Ambience

**Current purpose.** Hollowmere currently shares a single wind bed under its theme; NPC conversations have voice assets.

**Direction and emotional target.** Offer shelter without a bustling crowd. A person can be heard maintaining the place just outside view.

**Layers and Foley order.** Two lane-air beds, shutters, hand broom, cart axle, cloth canopy and distant hearth. Record three performances of each practical; leave pauses where NPCs stand.

**Frequency and effects chain.** High-pass bed 80 Hz → carve 1–3 kHz around speech → small exterior wall slap on cart/shutter only.

**Mix, level and perspective.** Bed −35 to −30 S; local details −26 to −20 peak. Keep center open near Edda, Maud and Corwin.

**Godot implementation.** Place emitters on matching town props and reduce local event rate during open_dialogue. Suppress distant activity in story states where inhabitants have gone quiet.

**Generation prompt.** “Sparse inhabited hamlet under grey skies, soft broom on grit, one shutter latched, cart axle turning far down the lane, separate pockets of quiet human activity.”

### 24 · Forest Ambience

**Current purpose.** No forest track or dedicated area branch was found. Use where a future wooded exterior has visible canopy.

**Direction and emotional target.** Suggest something moving beyond sight without imitating threat telegraphs. Let canopy height and understory have different rhythms.

**Layers and Foley order.** Two long canopy beds, four leaf-litter runs, six branch flexes, two far bird families. Record leaves and bent wicker separately; space calls 25–70 s apart.

**Frequency and effects chain.** High-pass 90 Hz → tame leaf hash at 5–8 kHz → roll far calls above 3.5 kHz. Keep trunk detail dry.

**Mix, level and perspective.** Stereo canopy −37 to −32 S; undergrowth field −27 to −21 peak. Avoid rhythmic doublets that resemble critical hits.

**Godot implementation.** Select canopy density from zone tags; anchor brush at ground level, birds farther out. Fade wildlife under combat and resume after a randomized quiet interval.

**Generation prompt.** “Overcast old deciduous wood, canopy moving slowly above close dry understory, isolated branch flex and a distant bird, sparse nonrhythmic layers.”

### 25 · Weather Effects

**Current purpose.** Town wind provides exposure; no weather-state audio controller was found.

**Direction and emotional target.** Communicate the front arriving before it rains. A loose object moves first, leaves turn, then water begins.

**Layers and Foley order.** Two 12–20 s transitions in each direction, soaked cloth release, eave rattle and foliage turn. Weather combines the wind/rain/thunder families below; record these transition details separately.

**Frequency and effects chain.** High-pass practicals 100 Hz → smooth 2.5 kHz rattle → exterior early reflection. Automate exposure and density separately.

**Mix, level and perspective.** Weather sum −33 to −27 S at full exposure; under shelter subtract 5–9 dB and soften highs. Protect the warning band at the storm peak.

**Godot implementation.** Add a seeded weather-state controller with intensity, shelter and scene ID. Crossfade clear/rising/storm/easing over 8–20 s, persist state through pause, cancel delayed events on travel.

**Generation prompt.** “A storm front entering a quiet settlement, single loose eave, turning foliage, heavy cloth responding to the first gust; isolated transitional gestures.”

### 26 · Rain

**Current purpose.** No precipitation loop was found. Rain should convey exposure and identify cover.

**Direction and emotional target.** Make entering shelter audible in one step. Roof patter gains texture while direct ground hiss falls away.

**Layers and Foley order.** Three matched 90 s intensities, four eave trickles, six spot drops. Record fine spray on slate, drops on canvas and mud at close range; deliver near and distant perspectives.

**Frequency and effects chain.** High-pass bed 110 Hz → dynamic cut 3–6 kHz → low-pass exterior bed near 2 kHz under roof, preserve roof ticks around 1 kHz.

**Mix, level and perspective.** Stereo diffuse bed −36 to −29 S, nearest eave −25 peak. Avoid stacking three full beds at midpoint.

**Godot implementation.** Use equal-power intensity crossfades, shelter blend from tagged roof volumes, mono eaves in 3D. Keep cast_rain spell on Weapons, independent of weather.

**Generation prompt.** “Steady fine rain on a stone lane, three matched intensities, separate canvas-roof interior patter and drips off an eave, even stereo field, no thunder.”

### 27 · Thunder

**Current purpose.** No atmospheric thunder family was found. Hask already owns the prominent metal warning.

**Direction and emotional target.** Give weather distance and scale, with a rounded onset so it reads differently from a boss attack.

**Layers and Foley order.** Three near rolls, four middle, three far. Record slowed canvas, rolling cart and drum rumble as designed layers; print crack and decay separately, 3–9 s.

**Frequency and effects chain.** High-pass 30 Hz → center below 110 Hz → compress tail gently → steepen high roll-off with distance. Include 180–350 Hz body for laptop speakers.

**Mix, level and perspective.** Wide distant return around a mono bearing, −18 to −12 peak far/near. Duck 5 dB or delay decorative onset while Hask warns.

**Godot implementation.** Schedule after lightning by authored distance/343 s per metre where world scale is metres. Clamp for scene scale, freeze timer on pause, cancel on travel, cap one near roll.

**Generation prompt.** “Long distant storm roll moving beyond a hillside, rounded canvas-like onset and low wooden resonance, three depths, clean decay, separate close crack.”

### 28 · Wind

**Current purpose.** wind.wav is a 40 s mono town loop. It currently serves as the entire outdoor bed.

**Direction and emotional target.** Give air a direction by letting it play the environment. Reserve whistling for a visible aperture.

**Layers and Foley order.** Two 80 s broadband beds, four broad gusts, three shutter gaps and three rope strains. Record moving fabric and air across a narrow bottle neck as controllable spot sources.

**Frequency and effects chain.** High-pass 55 Hz → notch stable whistle peaks near 2 kHz → smooth gust attack 300 ms → mostly dry exterior.

**Mix, level and perspective.** Stereo bed −38 to −32 S; field whistle −27 to −22 peak. Limit tonal whistles to one and lower beneath conversation.

**Godot implementation.** Share weather wind scalar with foliage and hanging props. Pan only attached local whistles; crossfade the diffuse bed across town exits.

**Generation prompt.** “Low unpitched wind across an exposed lane, separate leeward lull, cloth tug, occasional soft tone through a shutter gap, long seamless beds and isolated gusts.”

### 29 · Music

**Current purpose.** Four synthesized mono tracks support title, Hollowmere, crypt and Hask. Each level switch uses the same fade.

**Direction and emotional target.** Unify the act through a recognizable interval and a shared room. Keep the most eloquent melody for the return home.

**Layers and Foley order.** Commission room/drone, low strings, motif and pulse stems; record bowed metal, viol and skin drum with the same room pair. Deliver full stereo reference, stems, loop frames and transition edits.

**Frequency and effects chain.** High-pass non-bass stems 80 Hz → reserve 150–350 Hz for viol body → automate dips around 1–3 kHz under dialogue → short common room. Center bass below 100 Hz.

**Mix, level and perspective.** Stereo Music bus −28 to −21 S by state. Keep motif audible on a mono laptop; gain-match transitions before adding intensity.

**Godot implementation.** Retain play_area as entry API. Add a music director with area, danger and narrative override. Start aligned stems together and change gains on bar boundaries; use music transport plan below.

**Generation prompt.** “Original dark chamber score palette, felted low strings, breath across an iron rim and hand-muted drum sharing one small room, open space between phrases, isolated synchronous stems.”

### 30 · Combat Music

**Current purpose.** Pack aggro can request voice; ordinary combat has no dedicated music state.

**Direction and emotional target.** Increase urgency by shortening rhythmic gaps, keeping the screen’s attack rhythm in front.

**Layers and Foley order.** At 72 BPM, 4/4, write 16-bar synchronized low pulse, scraped string ostinato and sparse upper tremolo. Record three cloth-damped drum articulations. Supply 1-bar entry/exit fills.

**Frequency and effects chain.** High-pass ostinato 100 Hz → transient-soften drum → carve 1.2–2 kHz for hit confirmation. Automate bass density for crowds.

**Mix, level and perspective.** Stereo −25 to −21 S. Percussion ducks 3 dB on major warnings. Cap full-intensity duration when only one distant enemy remains.

**Godot implementation.** Start pulse when a nearby engaged enemy presents danger; add ostinato on sustained pressure. Hold 6 s after last threat, exit next bar. Boss engagement overrides immediately.

**Generation prompt.** “72 BPM four-beat chamber combat loop, low hand-muted percussion, scraped string ostinato, tense measured motion, no melodic climax, phase-aligned sixteen-bar stems.”

### 31 · Boss Music

**Current purpose.** bell_warden.wav begins at boss_engaged and returns to the crypt on kill.

**Direction and emotional target.** Make phase changes audible through subtraction and register. The bell cue must remain identifiable on top of the score.

**Layers and Foley order.** 72 BPM, 4/4, 16 bars each. Phase 1 low-string tread, phase 2 answering bowed metal below the warning register, phase 3 thinner high string tremor over half-time drum. Record damped drum and scrape; supply kill cut and 2-bar aftermath.

**Frequency and effects chain.** High-pass metal 160 Hz → notch the warning’s measured strongest partial → soften drum peaks → automate room return off at defeat.

**Mix, level and perspective.** Wide strings, narrow bass, −24 to −20 S. Thin midrange ahead of every toll; death clapper occupies the center alone.

**Godot implementation.** Enter at boss_engaged. Latch summon and enrage edges below 50% and 25%; bring layers on next bar. A killing hit cancels pending changes, cuts drums in 80 ms and yields to death sequence.

**Generation prompt.** “Measured 72 BPM procession for a bell warden, isolated low tread, bowed metal answer and high anxious tremor, half-time drum, clean phase loops and unresolved aftermath.”

### 32 · Exploration Music

**Current purpose.** hollowmere.wav and sunken_crypt.wav loop for their areas; neither currently leaves scheduled rests between statements.

**Direction and emotional target.** Let curiosity pull the player forward. Town phrases may finish; crypt phrases stop just before their answer.

**Layers and Foley order.** Town: felted viol, open fifth, soft room. Crypt: detuned low pair, bowed harmonic and exposed rests. Commission two 32-bar pieces at 72 BPM, three sparse phrase alternatives each; record bow noise and finger release.

**Frequency and effects chain.** High-pass room 80 Hz → reduce 220 Hz buildup → mild high shelf reduction on crypt → longer decay on phrase ends only.

**Mix, level and perspective.** Stereo −30 to −25 S. Leave 12–24 s of occasional motif silence with bed still active. Dialogue trims motif before bass.

**Godot implementation.** Choose area via play_area, rotate phrase alternatives on transport boundaries. Maintain underlying phase on combat entry/exit and restore exploration after death transition.

**Generation prompt.** “Two related slow exploration cues at 72 BPM, humble felted viol in a sheltered lane and an unanswered bowed harmonic underground, spacious phrasing, loopable beds and isolated phrases.”

## Skill recording ledger

The current class catalog has 24 base IDs. **Existing** means three shipped cast files share the ID. **New** means the base WAV is absent. Keep these IDs stable across loadouts; variants inherit the base release and request a modifier only when their visible behavior changes. Deliver a miss-safe release for every offensive action and a separate response where contact is possible.

| Warrior | Bank | Signature and event split |
|---|---|---|
| grave_cleave | Existing | Wrapped grip, broad edge pass; choose sword/axe/maul texture from equipped family, assign stop to target. |
| shield_bash | New | Strap draw into padded shield face; reserve the sharp rim knock for impact. |
| earthsplitter | Existing | Short sole plant, heavy ground body, stone answering outward; nearest fissure owns bass. |
| iron_rush | Existing | Harness yanks forward, low air rush under travel, one cut on stop. |
| grave_leap | New | Weight leaving soil, brief air gap, destination footfall and radius impact share a body. |
| grave_roar | Existing | Chest resonance with a rough cloth flutter; give buff activation one dry stamp. |
| sextons_whirl | Existing | Loop one broad revolution; vary blade pass once per turn, release loop on interruption. |
| iron_hide | New | Three overlapping scale plates closing inward; soft loosening tick at expiry. |
| **Pyromancer** | | |
| ember_bolt | Existing | Grain ignition at hand; thin jet follows bolt; single coal snap on impact. |
| cinder_spray | New | One breath splitting into granular jets; nearest target takes the brightest spit. |
| cinder_nova | Existing | Suck air inward, low ring opens at caster, diffuse shower fades at perimeter. |
| pyre | Existing | Dry match-like onset at target, contained flame loop, collapse at zone expiry. |
| ember_step | New | Short draw of breath at origin, crackle at destination; keep stereo direction clear. |
| ashen_ward | Existing | Ash sweeping inward against ceramic; loop under threshold of speech, crumble on expiry. |
| cinder_rain | Existing | One canopy hiss, stagger impacts spatially and allocate only one low body per cluster. |
| flame_wave | New | Broad low cloth rush and flame-front hiss; split launch from passing front. |
| **Rogue** | | |
| twin_cuts | Existing | Two narrow swishes with different lengths; each confirmed cut can take a material tick. |
| barbed_throw | New | Leather finger-slip, light flight whistle, single barb-seat tick on contact. |
| knife_fan | Existing | One fan-open release with offset blade edges; cull redundant flight voices. |
| veilstep | Existing | Reverse silk at origin, tiny hem snap at arrival, no continuous jet. |
| smoke_veil | New | Dense cloth puff, air decays inward, faint breath marks end of cover. |
| bone_caltrops | Existing | Several dry dowels scatter on placement; isolated crunch on trigger. |
| death_flurry | Existing | One opening inhale, short pass at each destination, resolve on final target only. |
| rot_cloud | New | Low porous puff with irregular bubbling sustain; quiet ticks on repeated damage. |

## Other shipped interactions and story audio

| Event and owner | Production order and playback |
|---|---|
| Dialogue, guide and barks · HUD, field_guide, ActAudio | Index all 39 voice files by speaker, line ID, exact text, context and rights. Record Maud close and steady, Corwin with longer pauses, Edda conversationally over her counter. Preserve exact script and record neutral, urgent and quiet alts only where the line supports them. Capture room tone, edit breaths, high-pass 65–95 Hz by voice, de-ess gently, compress 2:1, aim for −21 to −17 S on longer lines and −10 to −6 peak. Dialogue/guide remains centered and interruptible on close; ordinary aggro barks can use a 3D emitter within Voice. Retain one intelligible foreground speaker and captions. Missing lines retain text and interaction timing. |
| Enemy offensive tells · enemy.gd | Hollow draws cloth back for its 0.45 s windup; crawler gives a short shell scrape at 0.28 s; archer string draws over 0.55 s, then releases at launch; Hask’s ordinary swing uses a chain drag over 0.65 s. Deliver three dry onset/release pairs per family. Center identity near 0.8–2 kHz, field peaks −17 to −12. Cancel a windup if stunned or dead. Separate an arrow passing the listener from an arrow hitting the player. |
| Hero hurt, defeat, return · player/world | From confirmed damage emit cloth compression plus one low body at −15 to −12 peak, with a reserved center tick audible on laptops. Throttle small repeated damage. On lethal state use one falling exhale and muted buckle at −13 peak, withdraw combat pulse and stop pending player casts. On respawn reset emitters before bringing back town air. |
| Potion, blocked input, progression · player/HUD/world | Successful drink gets cork, brief liquid and breath at −20 to −17 peak. Empty, locked, cooldown and insufficient resource share a soft padded denial, rate-limited to one per deliberate input burst. Keep reason text. On level-up play one rising bowed-string harmonic after the banner; suppress under main quest reward stinger. |
| Wells, plinth, undercroft and gates · world/HUD | Split the shared toll into a distant submerged answer for wells (filtered at 1.8 kHz), a dry clapper-free chord on Act completion and the close Hask threat. A name-stone is a short palm-muted chink; three stones seating on the plinth resolve as one chord. A locked gate gives chain tension; a successful passage gives latch plus crossfaded air. Grave digging gets two soil scrapes and a lead-box tap only on “dug”. Aim −22 to −16 peak for props, −14 to −10 for story punctuation. Anchor props to world; give the paused completion cue an always-processing owner. |
| Launcher film · launcher/index.html, launcher.js | Electron’s backdrop loops muted and explicit film viewing enables sound, controls and English captions. It uses HTML video outside the Godot mixer. Print a separate stereo film mix from dialogue, score and effects stems; start at −18 LUFS integrated and ≤ −1 dBTP, verify encoded playback and caption timing. Preserve silent backdrop on Escape, film end and return from the game. |

## Integration sequence

1. **Technical sound designer and engineer — foundation.** Author a bus layout and a typed cue catalog. A cue record holds ID, weighted takes, routing, priority, cooldown scope, max instances, loop range and spatial profile. Emit a gameplay event with a stable action ID, world position, owner, material and intensity. Route UI through pooled AudioStreamPlayer, world audio through pooled AudioStreamPlayer3D. Load scene banks before play. Missing material falls back to family/default, missing cue logs once in development and leaves gameplay responsive. Clear loops explicitly on owner removal; completed one-shots return their slot. Keep current ActAudio callers working while migrating category by category.
2. **Composer and engineer — transport.** Start phase-aligned stems from one synchronized resource or composite stream and fade layer gains while transport continues. At 72 BPM in 4/4, a bar lasts 3.333 s, 16 bars 53.333 s; export from exact sample boundaries in the DAW. Follow playback position plus elapsed time since the last mix for marker decisions, account for output latency when matching display, and reseed timing after a seek or loop. Cross incompatible tempos with a composed bridge. Allow urgent threat and death sounds on the gameplay frame. Store and cancel outstanding fades when a new transition supersedes the old one, including boss→death→town in quick succession. [Godot audio synchronization](https://docs.godotengine.org/en/4.3/tutorials/audio/sync_with_audio.html)
3. **Foley, design and gameplay — playable slice.** First deliver UI accept/deny, stone gait, sword/axe swing, one miss, four enemy contacts, one crit, Hask windup/release/death and a prototype combat stem. Review a dry 60-second run from gate to boss with music off. Repeat with full mix, then freeze the gain reference before producing variations. Expand to 24 skills, remaining surfaces, quests and item families. Commission weather and future biomes against level briefs.
4. **Recording handoff.** Each approved row needs an owner, event ID, source/session, runtime file, channel layout, take count, trigger and cancel condition, route, target level, loop metadata, rights and build revision. Example: `boss/hask/toll_prepare_01`, mono WAV, Threat → Effects, 1.2 s, dry latch plus bow, 3 takes, start on armed toll, cancel on death, max 1 per Hask, −14 to −11 peak, Hask rig/iron session. Editor submits dry source and in-context capture; implementer signs trigger and cleanup; director signs the audible result.
5. **PC accessibility and mix presets.** Preserve existing sliders, zero mute and persistence. Pair telegraphs with their visual ring, high-rarity sounds with labels and beams, and dialogue with text. Offer captions for offscreen threats with direction where meaningful. For a proposed night mix start by reducing deep lows 3 dB, narrowing loudest-to-quietest combat contrast by ~4 dB and retaining dry warning transients. Compare against the standard mix at matched dialogue level.

## Release acceptance session

| Run | Acceptance evidence to collect |
|---|---|
| Boot → title → settings → town → crypt → boss → defeat → return, including rapid changes | Capture state/stream IDs and output. One settled music state and one intended bed after each transition. No abandoned fades, orphan loops, clipped tails or silent area after a missing stream. Slider mute is effective across child buses and wet returns after reload. |
| Ten identical quick attacks, one miss, one crit, lethal area hit and interrupted cast | Log action/target IDs against waveforms. No contact on a miss, no duplicate owner accents, no adjacent repeated variant where alternatives exist. Contact onset within one rendered frame of confirmed hit plus measured device latency. |
| Hask at full, half and quarter health, with adds, rain simulation and loot | Record a warning/impact pair aligned with the visible 1.2 s ring. Killing Hask mid-windup cancels release. In a randomized ten-warning playtest, target at least nine correctly identified before impact, including on laptop speakers; separately test recognition with music muted and audio muted. |
| Five surfaces × two speeds, terrain seam, blocked path, teleport, camera zoom and shake | Collect onset logs and stereo capture. Alternating contacts track grounded travel; stopped character produces no steps. Listener position holds with zoom. Testers identify at least four of five unlabeled surfaces at matched gain. |
| Ten-minute traversal and three-minute dense fight on minimum target PC | Capture full mix and stems. Measure integrated LUFS and true peak against project targets; log active voices, steals by priority, memory, audio CPU and stream stalls. Zero audible dropouts or stolen threat onsets. Compare headphones, stereo speakers and mono laptop at matched perceived dialogue. |
| Menu spam, pack full, vendor short on gold, optional quest, boss reward cluster, pause, save/load and game relaunch | No purchase, equip or quest success on rejection or restore. Check reward ordering by ear. No world attack advances during pause. Verify saved settings, captions, launcher mute transitions and fallback when VO is absent. |
| Asset and loop review | Audition all takes through the exported build. Listen across three wraps of every bed and stem, including a full bar transition and mono fold-down. No seam, phase loss of critical cues, click on voice stealing or unresolved rights entry. Archive approved captures with build ID, preset, device and reviewer. |

**Sign-off boundary.** The audit establishes shipped content and code behavior visible in source. The recording ledger, gain values, budgets and acceptance thresholds are production decisions. Final mix approval requires in-engine listening, captured meters and playtest evidence on the target PC.
