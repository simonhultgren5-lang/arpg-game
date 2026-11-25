# Depths of Darkness: Art Bible

This document is the visual rulebook for the game: what it should look like, why, and how a small team gets there with Godot 4, Blender, Tripo AI and Claude. The bar is the polish of a modern top-down action RPG. The look is our own: gothic, hand-made, lit by fire.

- **How to make an asset** (scripts, commands, budgets): see [assets.md](assets.md).
- **This document** says what an asset must look like, and how to check it before it ships.

> Owner: art direction. Change a rule by pull request, with a before/after screenshot. The game's code holds most of the numbers quoted here (lighting, fog, palette), so the code and this document must move together.

## Contents

1. [Visual pillars](#1-visual-pillars)
2. [The camera, and why it rules everything](#2-the-camera-and-why-it-rules-everything)
3. [Environment themes](#3-environment-themes)
4. [Architecture rules](#4-architecture-rules)
5. [Character design language](#5-character-design-language)
6. [Creature design language](#6-creature-design-language)
7. [Material standards](#7-material-standards)
8. [Texture standards](#8-texture-standards)
9. [Lighting rules](#9-lighting-rules)
10. [Atmospheric effects](#10-atmospheric-effects)
11. [VFX standards](#11-vfx-standards)
12. [Colour scripts](#12-colour-scripts)
13. [Interface art](#13-interface-art)
14. [Asset production pipeline](#14-asset-production-pipeline)
15. [Optimization strategy](#15-optimization-strategy)
16. [Quality checklist](#16-quality-checklist)
17. [Originality and AI-generated content](#17-originality-and-ai-generated-content)

---

## 1. Visual pillars

Every asset, light and effect must serve at least one pillar and break none of them.

| Pillar | What it means | What breaks it |
| --- | --- | --- |
| **1. Firelight in the dark** | The world is mostly shadow. Warm light (torches, braziers, embers, lanterns) is precious and tells the player where life and danger are. | Flat ambient light; every corner lit; cool light everywhere. |
| **2. Worn by centuries** | Nothing is new. Stone is chipped, metal is pitted, cloth is frayed, and every surface has a history: soot above torches, damp at the base of walls, wax under candles. | Clean bevels, uniform tiling, mint-condition props. |
| **3. Readable at a glance** | From the game camera, a player must tell in under a second what is a hero, a monster, a hazard, loot or a wall. Silhouette and value come before detail. | Noise at gameplay scale, monsters that blend into floors, effects that hide telegraphs. |
| **4. Grounded gothic** | Architecture and gear look built by people who meant to use them: heavy, practical, devout. The horror comes from things gone wrong in that real world. | Spikes for their own sake, floating ornaments, armour you couldn't move in. |
| **5. One hand, many makers** | Script-built, hand-modelled and AI-assisted assets must look like one artist made them. Same palette, same wear, same lighting response. | A "generated" look: soft mushy forms, mismatched texel density, baked-in lighting. |

**The test:** take a screenshot with the HUD off and turn it greyscale. You should still read the hero, the threats and the way forward.

---

## 2. The camera, and why it rules everything

The game is played from a high three-quarter view (`godot/scripts/world/camera_rig.gd`, 40° field of view). The player sees the **tops** of things and the **floor** more than anything else. Design for that view, not for a turntable.

- **Floors carry the scene.** At least 60% of the screen is floor. Floors get the best textures, the most variation and the subtlest breakup.
- **Tops and shoulders matter more than faces.** Heroes read by their helm, shoulders, cloak and weapon. Faces are a few pixels high; don't spend detail there.
- **Silhouettes from above.** Check every character and creature from the game angle as well as from the side. A monster that reads only from the side is a failure.
- **Height is a tell.** Tall things (pillars, gravestones, lamp posts) block sight lines and must not hide the hero. Walls between the camera and the hero are cut away by the wall shader (`godot/shaders/wall.gdshader`). Keep tall props off the camera side of paths.
- **Scale cheats are allowed.** Heroes and weapons may be about 10% chunkier than real proportions so they read. Props keep real-world scale so the world feels solid.

---

## 3. Environment themes

Each region has a mood, a material set, a light source and a colour script (section 12). New regions are added here before anyone builds them.

### Act I: The Tolling of Hollowmere

| Region | Mood | Key materials | Key light | Signature shapes |
| --- | --- | --- | --- | --- |
| **Hollowmere (town)** | A frightened town at night. Shuttered windows, mud, fog off the marsh. | Cobble, earth, timber, plaster, roof slate | Cold moonlight over warm lantern pools | Leaning timber houses, lamp posts, the chapel spire, the graveyard |
| **St. Aldric's graveyard** | Grief and something wrong underneath. | Earth, gravestone, moss | Moon, a few candles | Round, cross and slab stones, all slightly leaning |
| **The Sunken Crypt** | Old, wet and holy, turned bad. | Flagstone, ashlar stone wall, bone, iron | Torches and candles only; no moon | Pillars, sarcophagi, flooded chambers, alcoves of bones |
| **The Bell-Warden's pit** | The heart of the curse. Heat and noise. | Stone, bronze, iron chain | The bell's ember glow from below | The great bell, the clapper, chains into darkness |

### Themes planned for later acts

These are directions, not commitments. Each needs a mood board and a colour script before production.

- **Drowned marsh:** reed beds, sunken causeways, bog light. Green-black water, sick yellow light.
- **Ash monastery:** burned cloisters, falling ash, glowing cracks. Grey-white ash against ember red.
- **Bone ossuary depths:** walls of skulls, candle forests. Ivory and gold candlelight.
- **Frozen barrow:** iron-hard frost, cairns, aurora. Blue-black ice with one warm hearth per area.

### Rules for every theme

- **One dominant material family per region**, plus at most two accents. Hollowmere is timber and cobble with slate. The Crypt is stone with bone and iron.
- **One warm and one cool light source per region**, never more than two light "temperatures" fighting.
- **A landmark visible from most of the area** (the chapel spire, the great bell) so players never feel lost.
- **Story in the props.** Every room tells one small story through set dressing: an overturned cart, a dug-up grave, a ring of candles around a stain.

---

## 4. Architecture rules

- **Gothic and practical.** Pointed arches, ribbed vaults, buttresses, heavy lintels. Every arch has a keystone, and every wall is thick enough to hold up what's on it.
- **Big shapes first.** A wall section is built from large stones and few openings. Detail clusters at doors, corners and the base of walls, never evenly spread.
- **Grid.** Levels are built on a 1 m grid (`godot/scripts/world/level_grid.gd`). Wall modules are 2 m or 4 m wide and 3 m high, and doors are 2 m wide. Props may break the grid; architecture may not.
- **Wear follows physics.**
  - **Damp** collects at the base of walls and in corners.
  - **Soot** goes above torches and braziers.
  - **Moss** grows on the shaded side.
  - **Cracks** run from corners and openings.
  - **Footpaths** wear the middle of floors smooth.
- **Silhouette at the top.** The camera sees wall tops. Give them a cap course, broken crenellation or rubble, never a flat cut.
- **Ruin by subtraction.** A ruined building is a whole building with pieces missing and fallen at its base, not a different design.
- **Interior proportions** are about 1.3× real scale so the camera and combat fit, while doors and steps stay human-sized so the scale reads.

---

## 5. Character design language

Heroes are the player's identity. They must read as **their class from above, in silhouette, at 120 pixels tall**.

| Class | Silhouette | Shape language | Materials | Signature colour |
| --- | --- | --- | --- | --- |
| **Warrior** | Broad, square and heavy, with a big shield and a helm crest | Rectangles and wedges | Plate steel, chain, tabard cloth | The player's armour colour on the tabard and cloak |
| **Pyromancer** | Tall and narrow, with a hood and a long staff that glows at the top | Triangles and flowing lines | Robe cloth, leather, bronze, ember | Ember orange in the staff, the hands and the robe trim |
| **Rogue** | Low, lean and asymmetric, with a hood, a mask and two short blades | Sharp diagonals | Leathers, wraps, dark steel | Violet accents in buckles and blade edges |

### Rules

- **Three reads, in this order:** silhouette (class), value (the hero pops against the floor), colour (the player's armour colour). Every hero model must pass all three in `res://tests/act1_lineup.tscn`.
- **The player's colour** goes on `tint_*` materials only (tabard, cloak, robe, hood). Never on skin, metal or effects. See `godot/scripts/models/asset_models.gd`.
- **Gear changes the hero.** Later, worn items swap meshes on the hero. Design every armour piece to attach to the shared humanoid skeleton (`scripts/assets/blender/humanoid.py`) and its bones.
- **Weapons are 15% oversized** and have a clear, readable head: a blade tip, a maul head, an orb.
- **No skin-tight fantasy armour.** Plate has gaps for movement, cloth has weight, leather has stitching.
- **Townsfolk** are muted (browns, greys, undyed wool) so heroes and threats stand out. Only quest-givers carry a single accent colour.

---

## 6. Creature design language

Monsters are **things that were once normal, made wrong**. The horror is in the familiar made strange.

| Family | Idea | Silhouette | Tell |
| --- | --- | --- | --- |
| **Hollow** (the risen dead) | Villagers who didn't stay buried | Hunched and leaning forward, with long arms | A shuffling gait and pale grave-cloth |
| **Bone Archer** | Old wardens, still on duty | Upright and thin, with a bow taller than its body | Bone white against dark |
| **Grave Crawler** | Something that lives under graves | Low, wide and six-legged, like a spider | It moves in alternating tripods; a crawling sound |
| **Hask, the Bell-Warden** (boss) | The bell-ringer fused with his bell | Huge and bell-bodied, with the clapper as a heart | The ember glow and the toll before an attack |

### Rules

- **Danger reads in shape and colour.** Elites are about 25% bigger and carry a colour accent. Bosses have a unique silhouette and their own light.
- **Telegraphs are part of the design.** Every attack has a windup pose visible from above, and big attacks get a ground telegraph (`Fx.telegraph`). Never make an attack that the art hides.
- **Monsters are darker and lower in saturation than heroes**, except their eyes and weak points (emissive, small).
- **Size tiers:**

  | Tier | Height |
  | --- | --- |
  | Swarm | 0.6–1.0 m |
  | Standard | 1.6–2.0 m |
  | Elite | about 25% larger than standard |
  | Boss | 3 m or more, filling about a fifth of the screen |

- **Death matters.** Every creature has a death clip that ends lying flat and still. Corpses fade after a few seconds; they never pop.

---

## 7. Material standards

We use **physically based rendering (PBR)** in Godot's Forward+ renderer: base colour, roughness, metallic and normal. The material library is generated by `scripts/assets/blender/materials.py`.

| Material | Base colour (sRGB, before texture) | Roughness | Metallic | Notes |
| --- | --- | --- | --- | --- |
| Stone (walls, pillars) | 0.55–0.65 grey with a slight warm shift | 0.75–0.9 | 0 | Darkens at the base with damp |
| Flagstone and cobble | 0.6–0.75 | 0.7–0.9 | 0 | The stone looks wetter (roughness drops) in the gaps |
| Timber | 0.55–0.9 brown | 0.7–0.85 | 0 | The grain runs along the beam |
| Plate steel | 0.55–0.65 | 0.3–0.5 | 1 | Edges are brighter, recesses dirtier |
| Dark iron | 0.2–0.3 | 0.45–0.6 | 1 | Hinges, chains, bands, fittings |
| Gold and bronze | Gold (0.9, 0.65, 0.3), bronze (0.7, 0.42, 0.2) | 0.3–0.4 | 1 | Used sparingly; highlights only |
| Leather | 0.3–0.45 brown | 0.6–0.75 | 0 | Stitching and worn edges |
| Cloth | 0.25–0.5 | 0.85–0.95 | 0 | Never shiny |
| Bone | 0.6–0.75 ivory | 0.55–0.7 | 0 | Yellows into the grooves |
| Skin | Natural range | 0.5–0.65 | 0 | No subsurface needed at this camera distance |
| Ember and flame | Emissive | – | – | Emission 2–8, plus a real light nearby (section 9) |

### Rules

- **Albedo carries no lighting.** No baked shadows or highlights in base colour; ambient occlusion goes in its own map or is left to the renderer.
- **Albedo stays in range.** Nothing darker than about 0.03 or brighter than about 0.9 in sRGB. Pure black and pure white don't exist.
- **Metal is metal (1) or not (0).** Use in-between values only on painted or rusted edges, through a texture.
- **Emission is for light sources and magic only**, never to make an asset "pop". If it glows, it lights something (section 9).
- **The tint convention.** A material named `tint_*` takes the hero's armour colour in game.
- **A few materials per model**, sharing the texture sets in `godot/assets/textures/materials/`. A new material set must earn its place: it is used by at least three assets, or it is a signature surface.

---

## 8. Texture standards

| Use | Resolution | Maps | Where |
| --- | --- | --- | --- |
| Floors and walls (fill the screen) | 1024² tileable | albedo, normal, roughness | `godot/assets/textures/materials/` |
| Characters, creatures and props (shared sets) | 512² tileable | albedo, normal, roughness | Same folder |
| Unique hero pieces (future) | Up to 1024² for a hero, 512² for an item | albedo, ORM (occlusion, roughness, metallic packed), normal | Next to the model |
| Item icons | 128² RGBA | Rendered | `godot/assets/textures/icons/items/` |
| Skill and passive icons | 128² RGBA | Rendered | `godot/assets/textures/icons/skills/` |
| UI frames | 64–128² nine-patch | RGBA | `godot/assets/textures/ui/` |

### Rules

- **Texel density:** about 512 px per metre for world surfaces and about 256 px per metre on characters. Keep it even across one model, so nothing looks blurry next to something sharp.
- **Tiling must not show.** Every tileable set has breakup at two scales: large patches (colour drift, damp) and small detail (grain, chips). In Godot, floors vary per cell (`godot/shaders/flagstone.gdshader`, `INSTANCE_CUSTOM`). Use the same trick on new floors.
- **Normal maps are OpenGL style** (green up), which is what Godot expects. Generated maps (`ddk.normal_from_height`) already are; check maps from other tools.
- **Colour spaces:** albedo is sRGB; normal and roughness are linear ("Non-Color" in Blender).
- **Formats:** PNG in the repository (stored in Git LFS). Godot compresses them on import (VRAM compression for 3D, lossless for UI).
- **Names:** `<set>_albedo.png`, `<set>_normal.png`, `<set>_roughness.png`, all lowercase with underscores.

---

## 9. Lighting rules

Lighting is **the** quality multiplier. A simple model in good light beats a detailed model in flat light.

### The rig per area (current values in `godot/scripts/world/world.gd`)

| Setting | Hollowmere | Sunken Crypt | Why |
| --- | --- | --- | --- |
| Ambient | Cool blue-grey (0.49, 0.55, 0.65) × 0.34 | Teal-grey (0.36, 0.43, 0.47) × 0.32 | Shadows are never pure black, but never warm |
| Key light | Moon, directional, cold blue (0.55, 0.58, 0.9) × 0.55, with shadows | None | Underground has no sky |
| Practical lights | Lanterns and windows: warm (1.0, 0.68, 0.36) | Torches and candles: warm (1.0, 0.58, 0.28) | Warm pools against cool ambient (pillar 1) |
| Tonemap | Filmic, exposure 1.1 | Filmic, exposure 1.1 | Keeps the fire from clipping |
| Glow | Intensity 0.9, threshold 0.9 | Same | Only emissive things bloom |

### Rules

- **Warm versus cool.** Every scene has cool fill and warm practical light. The player reads warm as safety, cool as the unknown.
- **The hero carries a light.** A soft warm omni light rides with the hero (`player.gd`, `HeroLight`) so they are never lost in the dark. Don't add scene light near the hero to compensate.
- **Every flame is a light.** A torch, candle cluster or brazier gets an `OmniLight3D` with the flicker script (`godot/scripts/world/flicker.gd`). A lone candle may share a light with its neighbours.
- **Shadows.** The moon and boss lights cast shadows. Small practical lights cast shadows only where it matters (a torch by a doorway). Others don't, to keep performance (section 15).
- **Light budget:**
  - at most about 8 shadowless omni lights affect one spot on screen;
  - at most 2 shadowed omni lights per screen;
  - 1 shadowed directional light per outdoor area.
- **Light pools guide the player.** Put lights at doors, stairs, quest-givers and loot rooms, and leave dead ends dark.
- **Bosses own their light.** A boss arena has a signature light colour that changes with the fight's phases (Hask's ember glow).
- **No light leaks through walls.** Keep each light's range inside its room. A light seen through a wall is a bug.

---

## 10. Atmospheric effects

| Effect | Where | How (Godot) | Budget |
| --- | --- | --- | --- |
| Distance fog | Everywhere | `Environment.fog`. Town: density 0.014, blue-grey. Crypt: density 0.01, teal | Free |
| Volumetric fog | Outdoors, High quality only | `volumetric_fog`, density about 0.012, 48 m long | Off on Low and Medium (Settings) |
| Ground mist | Graveyards, marsh | Large soft particle quads near the floor, slow drift | 1 emitter per area, ≤ 40 particles |
| Dust motes | Crypt shafts, lit rooms | GPU particles in light shafts | ≤ 60 per room |
| Embers and ash | Braziers, boss arena, ash themes | GPU particles rising with turbulence | ≤ 80 per emitter |
| Dripping water and ripples | Flooded crypt rooms | Animated water shader with ripples | Shader only |
| Ambient occlusion | Everywhere | SSAO | Off on Low quality |

### Rules

- **Atmosphere frames, never hides.** Fog and particles must never cover the hero, enemies, telegraphs or loot. Mist stays below knee height on paths.
- **Every effect is switchable by quality.** Volumetric fog, SSAO and glow follow Settings → Quality (`settings.gd`, `apply_world`).
- **Motion is slow.** Ambient effects move slower than anything in gameplay, so the eye goes to combat first.

---

## 11. VFX standards

VFX are gameplay information first and spectacle second.

### Colour language

| Colour | Meaning |
| --- | --- |
| Ember orange / fire | The Pyromancer, burning, Hask |
| Steel gold / white | Warrior impacts, stuns |
| Violet / shadow | Rogue skills, stealth |
| Sick green | Poison, rot (Rot Cloud, venom) |
| Frost blue | Slows, the grave's chill |
| Blood red | Bleeding, damage to the hero |
| Bright red ring on the ground | Danger: an enemy attack is coming (telegraph) |
| Gold pillar | Level-up, legendary loot |

### Rules

- **Telegraphs always win.**
  - **Shape:** an enemy telegraph is a ring or cone on the ground (`Fx.telegraph`).
  - **Visibility:** it draws above all player effects and is never covered.
  - **Timing:** it lasts at least 0.4 s before the hit.
- **The player's effects** are bright but short. An impact flash fades in under 0.3 s. A lingering area (Pyre, caltrops) uses a darker, low-alpha ground decal so enemies stay visible on it.
- **Readability at 1080p:** a skill reads as its colour and shape in under one second.
- **One light per effect at most**, short-lived (`Fx.flash`). Skill effects never cast shadows.
- **Screen shake** is short and scaled to impact (0.08 for a hit, 0.8 for a boss death), and it can be turned off in Settings.
- **Damage numbers:** white for normal hits, gold with "!" for crits, red for damage the hero takes, green for healing. They can be turned off.
- **Particle budget:** 300 GPU particles on screen in a normal fight; up to 1 000 at peak (a boss phase, a big nova).

---

## 12. Colour scripts

A colour script sets the palette, the value range and the accent for each place and moment. Use the hex values when painting concepts, and the numbers in `godot/scripts/world/world.gd` and `godot/scripts/ui/ui_theme.gd` when building.

### The master palette

| Role | Swatch | Hex | Use |
| --- | --- | --- | --- |
| Void | ■ | `#0C0A12` | Background, the darkest shadows |
| Night stone | ■ | `#2A2630` | Walls and floors in shadow |
| Moon fog | ■ | `#5C6A80` | Ambient and fog in the town |
| Crypt teal | ■ | `#3D5257` | Ambient underground |
| Firelight | ■ | `#FFAD5C` | Practical light |
| Ember | ■ | `#D9542B` | Accents, the UI highlight, fire |
| Old gold | ■ | `#E3B57D` | UI text, trims, holy things |
| Bone | ■ | `#C9BCA0` | Bones, parchment, candles |
| Blood | ■ | `#8C1F1A` | Danger, the life orb |
| Rot | ■ | `#80C74D` | Poison only |

### Per area

| Area | Value range | Dominant hue | Accent | Feeling |
| --- | --- | --- | --- | --- |
| Hollowmere | Low-mid, high contrast at the lanterns | Cold blue-grey | Warm lantern orange | Fear behind shutters |
| Graveyard | Low | Blue-green | Candle gold | Grief |
| Sunken Crypt | Very low | Teal-black | Torch orange | Holy, wet, wrong |
| Bell-Warden's pit | Low with a hot centre | Rust-brown | Ember orange-red | Heat and dread |

### The emotional arc of Act I

1. **Arrival:** cold and quiet (blue, low contrast).
2. **The crypt:** colder, darker, fire as the only safety.
3. **The boss:** the palette turns hot (ember red takes over).
4. **Victory:** dawn-gold light on the town, the first warm daylight of the act.

The light should make you feel the story without reading it.

---

## 13. Interface art

The interface belongs to the world: forged iron plates, gold inlay, ember highlights. See `godot/scripts/ui/ui_theme.gd` and `scripts/assets/blender/ui_frames.py`.

- **Frames** are nine-patch iron with a bevel lit from the top-left and a thin gold inlay. The middles stay plain so they stretch cleanly.
- **Item rarity colours:**

  | Rarity | Hex | Where it shows |
  | --- | --- | --- |
  | Worn | `#BDB3A8` | Item names |
  | Hallowed | `#809EE6` | Names, a tinted border, a soft glow in the cell |
  | Cursed | `#E3B57D` | Names, a tinted border, a soft glow in the cell |
  | Relic | `#EB6B2E` | Names, a tinted border, a soft glow in the cell |
  | Unique | `#F7E3A3` | Names, a tinted border, a soft glow in the cell |

- **Icons** are 3/4-lit renders with transparent backgrounds (items), or glowing class-coloured glyphs on stone discs (skills; passives get gold rims). Glyph glow stays under about 1.0 so the hue survives.
- **Type:** gold for headings, parchment white (`#E0D6C7`) for body text, muted (`#9E948C`) for hints. Every label has a dark outline for readability over the 3D world.
- **The HUD never covers the hero.** The bottom bar and orbs take at most about 14% of the screen height, and panels open over the sides and centre without pausing the game.

---

## 14. Asset production pipeline

Our pipeline is **script-first**: most assets are Python that Blender runs (`bun run assets:build`, see [assets.md](assets.md)). AI tools speed up concept and blockout; people and scripts own the final asset.

### Stages

```
1. Brief          a GitHub issue: purpose, region, silhouette sketch, references (our own), budget
2. Concept        Claude helps write the brief and variations; mood boards from our own screenshots and photos
3. Blockout       a script blockout (ddk primitives) or a Tripo AI draft mesh, at the right scale
4. Review 1       in-game blockout screenshot from the game camera: silhouette, scale, readability
5. Production     retopology, UVs, materials from the shared library, rig on the shared skeleton
6. Integration    exported to godot/assets/models/... through the pipeline; tested by asset_test and lineup
7. Review 2       the quality checklist (section 16) in game, at Low and High quality
8. Ship           pull request with before/after screenshots; the .blend is locked while edited (Git LFS)
```

### Roles of each tool

| Tool | Use it for | Don't use it for |
| --- | --- | --- |
| **Blender + scripts** (`scripts/assets/blender/`) | Everything final: modelling, rigging, animation clips, materials, export, icons, frames | — |
| **Tripo AI** | Fast draft meshes for blockout and for organic forms (creatures, rocks, roots). Always retopologised and re-textured from our material library. | Final topology, final textures, anything modelled on another game's character |
| **Claude** | Writing briefs, scripting Blender (`ddk.py` helpers), checklists, naming, data tables (items, skills), reviewing screenshots against this bible | Being the only reviewer of how something looks: a person approves every visual change |
| **Godot** | Lighting, shaders, VFX, final look, performance checks | Modelling |

### Turning a Tripo AI draft into a game asset

1. **Write the prompt from our own brief.** Never name another game, studio, artist or character.
2. **Generate a few variants** and pick the best silhouette from the game camera angle.
3. **Import into Blender** and scale it to metres (a monster of a standard tier is 1.6–2.0 m).
4. **Retopologise to budget** (section 15): use Quad Remesher or Blender's remesh plus a cleanup pass. Keep edge loops at joints for deformation.
5. **Unwrap the UVs**, then throw away the generated textures. Assign materials from `materials.py` (and paint masks if needed) so it matches the rest of the game (pillar 5).
6. **Rig** on the shared humanoid skeleton, or a custom rig like the crawler's. Make the six clips: idle, walk, attack, cast, hit, death.
7. **Turn it into a script** where you can. Save the cleaned mesh to `source-assets/Models/<group>/` and write the script that imports it, assigns materials, rigs and exports. Every asset is still rebuilt by `bun run assets:build`.
8. **Record provenance.** Add a line in `docs/asset-provenance.md`: asset, tool, date, prompt, who cleaned it up.

### Naming and folders

- **Folders:** `godot/assets/models/{characters,props,environment}/<name>.gltf`; sources in `source-assets/Models/<Group>/<name>.blend`.
- **Names:** lowercase with underscores, saying what the thing is: `crypt_pillar`, `gravestone_cross`, `hollow`.
- **Variants:** `<name>_a`, `<name>_b`. Damage states: `<name>_broken`.

---

## 15. Optimization strategy

**Target:** 60 fps at 1080p on a mid-range PC (GTX 1660 / RX 5600 class) at High quality, and 60 fps on integrated graphics at Low.

### Budgets per screen

| What | Budget |
| --- | --- |
| Triangles on screen | 1.5 M (High), 600 k (Low) |
| Draw calls | ≤ 1 500 |
| Hero | ≤ 25 k triangles, ≤ 4 materials |
| Standard monster | ≤ 12 k triangles (with 30 on screen) |
| Boss | ≤ 50 k triangles |
| Prop | ≤ 5 k triangles (large set pieces ≤ 15 k) |
| Shadowed lights | 1 directional + 2 omni |
| Shadowless lights | ~8 touching any pixel |
| GPU particles | 300 typical, 1 000 peak |
| Texture memory | ≤ 1.5 GB at High |

### Techniques, in order of value

1. **Share textures and materials.** One texture set used by many models (this is already how the pipeline works). Each unique material costs a draw call.
2. **MultiMesh for repetition.** Floors, gravestones, candles, bones and rubble use `MultiMeshInstance3D` or instancing; floors already do.
3. **LOD.** Characters and props over 5 k triangles get Godot's automatic mesh LOD (on by default for imported glTF) or a hand-made `_lod1`. Check it from the game camera.
4. **Visibility ranges** (`visibility_range_end`) hide small props beyond the camera's view. The camera is fixed, so this is easy to tune per area.
5. **Occlusion culling** in the crypt, with occluders on thick walls.
6. **Light discipline** (section 9): shadowless by default, short ranges, no light seen through walls.
7. **Quality settings** (Settings → Quality) switch off SSAO, glow, volumetric fog and lower MSAA and shadow resolution on Low.
8. **Animation** uses baked clips (glTF, NLA tracks), with no simulation at runtime.

### How to check

- **In the editor:** Godot's monitors (`Debugger → Monitors`: FPS, draw calls, primitives) in the busiest room of each area.
- **In game:** the dev console's `fps` command.
- **Before each beta:** run the screenshot tour at Low and High and compare frame times. A beta may not ship slower than the last one without a reason in its pull request.

---

## 16. Quality checklist

Every new or changed visual asset passes this in its pull request. Paste it into the description and tick it.

### Every asset

- [ ] Serves a pillar and breaks none (section 1).
- [ ] Reads from the game camera, in greyscale, at 1080p.
- [ ] Real-world scale (or the documented hero/weapon cheat).
- [ ] Within the triangle and material budget (section 15).
- [ ] Uses the shared material library; texel density matches its neighbours.
- [ ] No lighting baked into albedo; albedo within range; metallic is 0 or 1.
- [ ] Has wear that follows physics (damp low, soot high, edges worn).
- [ ] Built and exported by the pipeline (`bun run assets:build`), with the source `.blend` in `source-assets/`.
- [ ] `bun run test` passes (the asset test included).
- [ ] Screenshot in game at Low and at High quality attached to the pull request.
- [ ] Original: no other game's names, designs or art. AI drafts are recorded in `docs/asset-provenance.md` (section 17).

### Characters and creatures (in addition)

- [ ] Silhouette tells class or family from above.
- [ ] All six clips (idle, walk, attack, cast, hit, death); feet don't slide in walk.
- [ ] Attacks have a readable windup; the boss and elites have a telegraph.
- [ ] `tint_*` used only where the player's colour belongs.
- [ ] Checked in `res://tests/act1_lineup.tscn` next to the others.

### Environments (in addition)

- [ ] On the 1 m grid; walls 2 or 4 m wide, 3 m high.
- [ ] One dominant material family; one warm and one cool light.
- [ ] A visible landmark, light pools at exits and goals, dark dead ends.
- [ ] No light leaks, no visible tiling, wall tops finished.
- [ ] Frame rate within budget in the busiest view.

### VFX (in addition)

- [ ] Colour follows the colour language.
- [ ] Never hides a telegraph or the hero; fades out (no popping).
- [ ] At most one short light; particle count within budget.

---

## 17. Originality and AI-generated content

- **Everything is ours.** Depths of Darkness is its own world. We aim for the *quality bar* of the best games in the genre, never their content. Don't copy, trace or prompt for another game's characters, creatures, logos, UI or level layouts, and don't name them in prompts.
- **References** are photographs, real architecture and historical arms and armour, our own concept art, and our own screenshots. Keep them in a mood board, not in the repository.
- **AI drafts are drafts.** A Tripo AI mesh is a blockout. It is retopologised, re-textured from our library and approved by a person before it ships. Generated textures are never used directly.
- **Licences:** before shipping anything that started in an AI tool, check that tool's current terms allow commercial use of its output on our plan. Record it in `docs/asset-provenance.md`.
- **Claude** writes scripts and documents and reviews against this bible. Its output is checked like anyone else's: tests for code, screenshots for art.
