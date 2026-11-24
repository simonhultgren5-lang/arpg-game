import type { GamePreferences } from '../hooks/useGamePreferences';

export type RunMode = 'standard' | 'daily' | 'hardcore';

export const GAME_SAVE_KEYS = [
  'mdjup',
  'dodProgressionV2',
  'dodTalentTreeV2',
  'dodWarriorTalentTreeV1',
  'dodWarriorLoadoutV1',
  'dodClassLoadoutsV1',
  'dodBuildMasteryV1',
  'dodClass',
  'dodParagonV1',
  'dodGemsV1',
  'dodAspectsV1',
  'dodLootFilterV1',
  'dodFragmentsV1',
  'dodRiftV1',
  'dod2meta',
  'dod3meta',
  'dod21achievements',
  'dodHudLayoutV1',
  'dodLoreTomesV1',
  'dodGoldV1',
  'dodBestiaryV1',
  'dodSlayerTitleV1',
  'dodRunModeV1',
  'dodStarterPotionsV1',
] as const;

export interface BestiaryMilestone {
  threshold: number;
  title: string;
  loreSnippet: string;
}

export interface BestiaryEntry {
  key: string;
  icon: string;
  tier: string;
  depths: string;
  lore: string;
  isMajorBoss?: boolean;
  dropTable?: string[];
  loreSecret?: string;
  milestones?: BestiaryMilestone[];
}

export const BESTIARY_CATALOG: BestiaryEntry[] = [
  {
    key: 'Skeleton',
    icon: '💀',
    tier: 'Common',
    depths: 'Depth 1+',
    lore: 'Animated bones bound by ash-wardens to patrol the upper crypts.',
    milestones: [
      {
        threshold: 50,
        title: 'Bonebreaker',
        loreSnippet: 'Fifty skulls cracked beneath your boot reveal hairline runes etched inside their marrow—old militia oaths broken at the fall of the northern keep.',
      },
      {
        threshold: 100,
        title: 'Cryptwarden',
        loreSnippet: 'At a hundred fallen sentries, you recognize their patrol cadence: they still guard granary doors that collapsed three centuries ago.',
      },
      {
        threshold: 500,
        title: 'Sovereign of Ash & Bone',
        loreSnippet: 'Five hundred shattered frames prove even deathless bone learns fear; lesser skeletons hesitate a heartbeat before raising rusted steel.',
      },
      {
        threshold: 1000,
        title: 'Undying Reaper',
        loreSnippet: 'A thousand bone-wardens turned to dust; the upper keep’s necromantic bindings unravel at the mere sound of your footsteps.',
      },
    ],
  },
  {
    key: 'Undead Beast',
    icon: '🧟',
    tier: 'Bruiser',
    depths: 'Depth 1+',
    lore: 'Hulking flesh stitched with iron staples; slow but crushing.',
    milestones: [
      {
        threshold: 50,
        title: 'Fleshrender',
        loreSnippet: 'Every iron staple binding these brutes bears the Butcher’s foundry mark—scrap iron salvaged from siege rams.',
      },
      {
        threshold: 100,
        title: 'Abomination Hunter',
        loreSnippet: 'Alchemical brine seeps from their seams when felled; the deeper vaults stitch two fallen beasts together for twice the reach.',
      },
      {
        threshold: 500,
        title: 'Scourge of the Vat',
        loreSnippet: 'Five hundred hulks torn apart leave the slaughter pits quiet enough to hear the bellows below Depth 15 finally stall.',
      },
      {
        threshold: 1000,
        title: 'Titan-Bane',
        loreSnippet: 'A thousand stitched abominations dismantled; even the Butcher’s oldest vats yield no champion strong enough to bar your path.',
      },
    ],
  },
  {
    key: 'Bone Archer',
    icon: '🏹',
    tier: 'Ranged',
    depths: 'Depth 1+',
    lore: 'Deadeye marksmen firing ember-tipped bone arrows from afar.',
    milestones: [
      {
        threshold: 50,
        title: 'Arrow-Cutter',
        loreSnippet: 'Their arrowheads are carved from finger-bones dipped in pitch—light enough to whistle across sunken halls before igniting.',
      },
      {
        threshold: 100,
        title: 'Deadeye Stalker',
        loreSnippet: 'A hundred quivers emptied reveal fletching dyed with ash-crow feathers, prized by keep rangers before the seals broke.',
      },
      {
        threshold: 500,
        title: 'Bane of the Volley',
        loreSnippet: 'Five hundred marksmen silenced across the crypts; not one loose bowstring remains unstrung in your wake.',
      },
      {
        threshold: 1000,
        title: 'Gale-Breaker',
        loreSnippet: 'A thousand ember-tipped shafts deflected or shattered—no rampart volley can pin down your advance.',
      },
    ],
  },
  {
    key: 'Cultist Summoner',
    icon: '🕯️',
    tier: 'Caster',
    depths: 'Depth 4+',
    lore: 'Hooded acolytes raising skeletal thralls in battle.',
    milestones: [
      {
        threshold: 50,
        title: 'Chant-Breaker',
        loreSnippet: 'Inside their charred robes lie wax-sealed parchments repeating a single syllable meant to keep the Sovereign’s bell from tolling.',
      },
      {
        threshold: 100,
        title: 'Hex-Hunter',
        loreSnippet: 'A hundred extinguished braziers expose their hierarchy: crimson tallow marks initiates, bone-ash wax marks choir leaders.',
      },
      {
        threshold: 500,
        title: 'Heretic’s Doom',
        loreSnippet: 'Five hundred summoners cut mid-incantation leave the summoning circles cold across every floor above the Endless Abyss.',
      },
      {
        threshold: 1000,
        title: 'Silencer of Bells',
        loreSnippet: 'A thousand grimoires reduced to ash; the coven’s deepest choirs dare not whisper the Sovereign’s name within three depths.',
      },
    ],
  },
  {
    key: 'Plague Bomber',
    icon: '🧪',
    tier: 'Volatile',
    depths: 'Depth 7+',
    lore: 'Blighted sprinters rushing close to detonate in toxic fire.',
    milestones: [
      {
        threshold: 50,
        title: 'Blight-Walker',
        loreSnippet: 'Their glass flasks hold fermented swamp-fire and marrow oil—stable only until agitated by heavy footsteps.',
      },
      {
        threshold: 100,
        title: 'Cinder-Sapper',
        loreSnippet: 'A hundred detonations dodged teach the ear to catch the hiss of uncorked pitch half a stride before impact.',
      },
      {
        threshold: 500,
        title: 'Alchemist’s Ruin',
        loreSnippet: 'Five hundred blight-runners neutralized before the fuse catches—not even toxic fire can stall your descent.',
      },
      {
        threshold: 1000,
        title: 'Ashen Purifier',
        loreSnippet: 'A thousand plague-flasks snuffed cold; the swamp-fire alchemy of the lower vaults holds no terror for seasoned steel.',
      },
    ],
  },
  {
    key: 'Dread Knight',
    icon: '🛡️',
    tier: 'Champion',
    depths: 'Depth 10+',
    lore: 'Armored revenants clad in obsidian plate.',
    milestones: [
      {
        threshold: 50,
        title: 'Plate-Cracker',
        loreSnippet: 'Beneath their black pauldrons, royal silver filigree still gleams—veteran honor guards who chose eternal watch over retreat.',
      },
      {
        threshold: 100,
        title: 'Oathbreaker',
        loreSnippet: 'A hundred duels won uncover their vow: no knight may lay down shield or blade while an unsealed ember burns in Depth 30.',
      },
      {
        threshold: 500,
        title: 'Vanguard Conqueror',
        loreSnippet: 'Five hundred obsidian helms cloven in two—even the Grave Lord’s inner legion gives ground at your approach.',
      },
      {
        threshold: 1000,
        title: 'Obsidian Breaker',
        loreSnippet: 'A thousand honor-bound plates shattered; the oldest royal sentinel order in the keep now bows to a living legend.',
      },
    ],
  },
  {
    key: 'Elite Champion',
    icon: '⚡',
    tier: 'Elite',
    depths: 'Depth 1+',
    lore: 'Bulwarks, Ravagers, Hexers, and Crushers mutated by dungeon miasma.',
    milestones: [
      {
        threshold: 50,
        title: 'Champion-Slayer',
        loreSnippet: 'Fifty mutated packs broken reveal how the abyss warps soldiers into four distinct strains: shield-wall Bulwarks, charging Ravagers, cursing Hexers, and earth-shaking Crushers.',
      },
      {
        threshold: 100,
        title: 'Miasma-Bane',
        loreSnippet: 'A hundred elite packs felled prove their glowing auras stem from fractured Abyssal Fragments lodged near the heart.',
      },
      {
        threshold: 500,
        title: 'Apex Harvester',
        loreSnippet: 'Five hundred elite packs purged from the keep; golden trophy caches spill like rain wherever your shadow falls.',
      },
      {
        threshold: 1000,
        title: 'Miasma Sovereign',
        loreSnippet: 'A thousand mutated packs conquered across campaign and Waystone Rifts alike—your name echoes deeper than the Thirtieth Seal.',
      },
    ],
  },
  {
    key: 'The Butcher',
    icon: '🪓',
    tier: 'Boss',
    depths: 'Depth 3, 15+',
    lore: 'First warden of the slaughter vaults; charges recklessly into prey.',
    isMajorBoss: true,
    dropTable: [
      '2–3 Boss Trophy items (+0.65 rarity bias, Legendary chance)',
      '85% Socket Gem (Ruby, Emerald, Sapphire, Amethyst, Topaz)',
      '95–135 Gold + Unique Axe / Cleaver pool',
    ],
    loreSecret: 'Ledger of the Butcher: No prisoner left Depth 3 alive once the iron hooks began to swing beneath the chapel; his ledger still records every name in dried rust.',
  },
  {
    key: 'Blood Witch',
    icon: '🩸',
    tier: 'Boss',
    depths: 'Depth 6+',
    lore: 'Sanguine matriarch whose coven feeds upon spilled crimson.',
    isMajorBoss: true,
    dropTable: [
      '2–3 Boss Trophy items (Crit Dmg, Leech & Spell Power bias)',
      '85% Socket Gem + Legendary Catalyst / Pendant chance',
      '110–150 Gold + 48% Health Orb',
    ],
    loreSecret: 'Covenant of Crimson: The Blood Witch bound her coven with living veins; every drop of bleed spilled in the catacombs feeds the roots beneath Depth 6.',
  },
  {
    key: 'Grave Lord',
    icon: '👑',
    tier: 'Boss',
    depths: 'Depth 9+',
    lore: 'Fallen sovereign clad in rusted regalia, commanding endless legions.',
    isMajorBoss: true,
    dropTable: [
      '2–3 Boss Trophy items (Armor, Strength & Bleed rolls)',
      '85% Socket Gem + Crown of Dawn / Worldplate Unique chance',
      '125–165 Gold',
    ],
    loreSecret: 'Epitaph of the Grave Lord: Royal bones marched once more the night his iron crown shattered against the obsidian throne.',
  },
  {
    key: 'Abyssal Dragon',
    icon: '🐉',
    tier: 'Boss',
    depths: 'Depth 12+',
    lore: 'Ancient wyrm whose cinder breath scorched the lower obsidian halls.',
    isMajorBoss: true,
    dropTable: [
      '2–3 Boss Trophy items (Fire, Crit Dmg & Cooldown rolls)',
      '85% Socket Gem + Cinderheart / Volcanic Breaker Unique pool',
      '140–180 Gold',
    ],
    loreSecret: 'Scales of the Deep Wyrm: Dragonfire never cooled in Depth 12—it sank into the granite walls, still pulsing under the footsteps of delvers.',
  },
  {
    key: 'Iron Colossus',
    icon: '🗿',
    tier: 'Boss',
    depths: 'Depth 15+',
    lore: 'Living siege-golem forged from basalt and chained furnace cores.',
    isMajorBoss: true,
    dropTable: [
      '2–3 Boss Trophy items (+0.65 rarity bias, Mace & Shield pool)',
      '85% Socket Gem + Doomhammer / Warden’s Aegis chance',
      '155–195 Gold (+1 Abyssal Fragment on Tier III+)',
    ],
    loreSecret: 'Furnace Oath: Dwarven smiths sealed their own heart-embers inside the basalt core so the upper vault gates would never yield.',
  },
  {
    key: 'Ash Seraph',
    icon: '🪽',
    tier: 'Boss',
    depths: 'Depth 18+',
    lore: 'Fallen sentinel wreathed in white-hot cinders and blinding wings.',
    isMajorBoss: true,
    dropTable: [
      '2–3 Boss Trophy items (Haste, CDR & Emberweaver Set chance)',
      '85% Socket Gem + Astral Focus / Pyrelight Unique pool',
      '170–210 Gold (+1 Abyssal Fragment on Tier III+)',
    ],
    loreSecret: 'Hymn of Cinders: Once sworn to guard the northern sun-keep, her wings blackened when she stared too long into the thirtieth seal.',
  },
  {
    key: 'Dread Necromancer',
    icon: '☠️',
    tier: 'Boss',
    depths: 'Depth 21+',
    lore: 'Arch-lich weaving nova bolts from shattered soul-phylacteries.',
    isMajorBoss: true,
    dropTable: [
      '2–3 Boss Trophy items (Spell Power, Leech & Mana Regen bias)',
      '85% Socket Gem + Soulbinder Pendant Unique chance',
      '185–225 Gold (+1 Abyssal Fragment on Tier III+)',
    ],
    loreSecret: 'Seven Phylacteries: Each bone spire in Depth 21 anchors a stolen breath; shattering one only strengthens the lich’s remaining chorus.',
  },
  {
    key: 'Void Sovereign',
    icon: '🌑',
    tier: 'Boss',
    depths: 'Depth 24+',
    lore: 'Ruler of the deep rift; heralds the Endless Abyss beyond Depth 30.',
    isMajorBoss: true,
    dropTable: [
      '2–3 Boss Trophy items (High-iLvl Legendary & Set gear chance)',
      '85% Socket Gem + Nightstalker Shroud / Blackfang pool',
      '200–240 Gold (+1 Abyssal Fragment on Tier III+)',
    ],
    loreSecret: 'The Fracture Chorus: Void Sovereigns are not native to the keep—they stepped sideways through cracks opened by careless Waystone rituals.',
  },
  {
    key: 'The Abyssal Sovereign',
    icon: '👁️',
    tier: 'Campaign Finale',
    depths: 'Depth 30',
    lore: 'Final seal-keeper guarding the threshold into the Endless Abyss.',
    isMajorBoss: true,
    dropTable: [
      '3 High-iLvl Boss Trophy items (Elevated Unique drop rate)',
      '100% Abyssal Fragment (+1) + 85% Socket Gem',
      '230–270 Gold + Endless Abyss Unlock',
    ],
    loreSecret: 'Beyond the Thirtieth Seal: Breaking the Sovereign’s seal did not end the dark—it revealed the Endless Abyss where time bends and legends fall like rain.',
  },
  {
    key: 'Rift Guardian',
    icon: '🌀',
    tier: 'Endgame Boss',
    depths: 'Waystone Rifts',
    lore: 'Planar warden summoned by Waystone carnage.',
    isMajorBoss: true,
    dropTable: [
      '3 Waystone Rift Trophy items (Waystone Tier Loot scaling)',
      'Guaranteed +2 Abyssal Fragments + 100% Bonus Socket Gem',
      '120+ Waystone Gold & +1 Waystone Tier Clear Upgrade',
    ],
    loreSecret: 'Planar Ledger: Every Waystone shard carries echoes of prior delvers; clear enough carnage and the Rift’s own warden materializes to reclaim the stone.',
  },
  {
    key: 'Uber Butcher',
    icon: '🔥',
    tier: 'Pinnacle',
    depths: 'Abyssal Altar',
    lore: 'Ascended Lord of Slaughter empowered by Abyssal Fragments.',
    isMajorBoss: true,
    dropTable: [
      '3 Depth 32+ Pinnacle Trophy items (High Legendary chance)',
      '100% Abyssal Fragment (+1) + 85% Socket Gem',
      '2.5× Pinnacle XP + 240–280 Gold',
    ],
    loreSecret: 'Altar of Five Shards: Five Abyssal Fragments rekindle the Butcher’s furnace chains, turning rusted iron into living magma.',
  },
  {
    key: 'Uber Abyssal Sovereign',
    icon: '👑',
    tier: 'Pinnacle',
    depths: 'Abyssal Altar',
    lore: 'Apex pinnacle entity of the deepest rift.',
    isMajorBoss: true,
    dropTable: [
      '3 Depth 38+ Apex Pinnacle Trophy items',
      '100% Abyssal Fragment (+1) + 85% Socket Gem',
      '2.5× Pinnacle XP + 270–310 Gold',
    ],
    loreSecret: 'Apex of the Tenth Fragment: Only delvers bearing ten Abyssal Fragments witness the Sovereign’s true unsealed form above the abyss.',
  },
];

export interface MonsterMilestoneState {
  unlocked: BestiaryMilestone[];
  highestTitle: string | null;
  nextMilestone: BestiaryMilestone | null;
  progressPct: number;
}

export function getMonsterMilestoneState(
  kills: number,
  milestones?: BestiaryMilestone[]
): MonsterMilestoneState {
  if (!milestones || milestones.length === 0) {
    return { unlocked: [], highestTitle: null, nextMilestone: null, progressPct: 0 };
  }
  const safeKills = Math.max(0, Math.floor(kills));
  const unlocked = milestones.filter((m) => safeKills >= m.threshold);
  const highestTitle = unlocked.length > 0 ? unlocked[unlocked.length - 1].title : null;
  const nextMilestone = milestones.find((m) => safeKills < m.threshold) ?? null;
  const progressPct = nextMilestone
    ? Math.min(100, Math.round((safeKills / nextMilestone.threshold) * 100))
    : 100;
  return { unlocked, highestTitle, nextMilestone, progressPct };
}

export type MonsterDifficulty = 'Easy' | 'Moderate' | 'Deadly';

export interface MonsterDifficultyInfo {
  label: MonsterDifficulty;
  avgDepth: number;
}

export function getMonsterDifficulty(
  entry: Pick<BestiaryEntry, 'depths' | 'tier'>
): MonsterDifficultyInfo {
  const depthMatches = entry.depths.match(/\d+/g);
  const avgDepth =
    depthMatches && depthMatches.length > 0
      ? Math.round(
          depthMatches.reduce((sum, num) => sum + Number(num), 0) / depthMatches.length
        )
      : entry.tier === 'Pinnacle'
        ? 35
        : entry.tier === 'Endgame Boss'
          ? 30
          : 1;

  const isDeadly =
    avgDepth >= 10 ||
    entry.tier === 'Pinnacle' ||
    entry.tier === 'Campaign Finale' ||
    entry.tier === 'Endgame Boss';

  if (isDeadly) {
    return { label: 'Deadly', avgDepth };
  }

  if (avgDepth >= 4 || entry.tier === 'Elite') {
    return { label: 'Moderate', avgDepth };
  }

  return { label: 'Easy', avgDepth };
}

export function readBestiaryKills(win?: Window | null): Record<string, number> {
  try {
    const bridge = win as (Window & { dodBestiary?: { get?: () => Record<string, number> } }) | null | undefined;
    if (bridge?.dodBestiary?.get) {
      return bridge.dodBestiary.get();
    }
    const raw = (win?.localStorage ?? window.localStorage).getItem('dodBestiaryV1');
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const clean: Record<string, number> = {};
    for (const [key, val] of Object.entries(parsed)) {
      const count = Math.max(0, Math.floor(Number(val) || 0));
      if (count > 0) clean[key] = count;
    }
    return clean;
  } catch {
    return {};
  }
}

export interface BuildItemSummary {
  name: string;
  slot: number;
  rarity: number;
  icon?: string;
  itemLevel?: number;
  stats?: Record<string, number>;
}

export interface BuildSummary {
  equipment: BuildItemSummary[];
  loadout?: number[];
}

export interface HeroSaveRecord {
  id: number;
  slotKey: string;
  heroName: string;
  heroLevel: number;
  currentDepth: number;
  bestDepth: number;
  snapshot: Record<string, string>;
  updatedAt: string;
}

export type HeroClassId = 'warrior' | 'pyromancer' | 'rogue';

export interface HeroAvatarProfile {
  heroName: string;
  heroClass: HeroClassId;
  classLabel: string;
  heroLevel: number;
  currentDepth: number;
  bestDepth: number;
  armorColor: string;
  power: number;
  defense: number;
  cunning: number;
  equippedCount: number;
  maxRarity: number;
  paragonRanks: number;
  seed: number;
}

const DEFAULT_CLASS_COLOR: Record<HeroClassId, string> = {
  warrior: '#8d3430',
  pyromancer: '#b34b25',
  rogue: '#315b79',
};

const CLASS_DISPLAY_LABEL: Record<HeroClassId, string> = {
  warrior: 'Warrior',
  pyromancer: 'Pyromancer',
  rogue: 'Rogue',
};

function fnv1aHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

interface ParsedSaveSnapshot {
  lv?: unknown;
  depth?: unknown;
  best?: unknown;
  heroColor?: unknown;
  eq?: unknown;
}

export function extractHeroAvatarProfile(save: HeroSaveRecord): HeroAvatarProfile {
  const snap = save.snapshot || {};
  let parsedSave: ParsedSaveSnapshot | null = null;

  try {
    if (typeof snap.mdjup === 'string' && snap.mdjup) {
      parsedSave = JSON.parse(snap.mdjup) as ParsedSaveSnapshot | null;
    }
  } catch {
    parsedSave = null;
  }

  let rawClass = typeof snap.dodClass === 'string' ? snap.dodClass.trim().toLowerCase() : '';
  const eqArray = Array.isArray(parsedSave?.eq) ? parsedSave.eq : [];
  if (rawClass !== 'warrior' && rawClass !== 'pyromancer' && rawClass !== 'rogue') {
    const mainHand = eqArray[0] as { weaponClass?: unknown } | null | undefined;
    const weaponClass =
      typeof mainHand?.weaponClass === 'string' ? mainHand.weaponClass.toLowerCase() : '';
    rawClass =
      weaponClass === 'pyromancer' || weaponClass === 'rogue' ? weaponClass : 'warrior';
  }
  const heroClass = rawClass as HeroClassId;

  const rawColor =
    typeof parsedSave?.heroColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsedSave.heroColor)
      ? parsedSave.heroColor
      : DEFAULT_CLASS_COLOR[heroClass];

  let gearDmg = 0;
  let gearSp = 0;
  let gearArm = 0;
  let gearHp = 0;
  let gearCrit = 0;
  let gearHaste = 0;
  let gearDodge = 0;
  let equippedCount = 0;
  let maxRarity = 0;
  const gearNames: string[] = [];

  for (const item of eqArray) {
    if (!item || typeof item !== 'object') continue;
    const record = item as { r?: unknown; n?: unknown; st?: Record<string, unknown> };
    equippedCount += 1;
    const rarity = Math.max(0, Math.min(4, Math.trunc(Number(record.r) || 0)));
    if (rarity > maxRarity) maxRarity = rarity;
    if (typeof record.n === 'string') gearNames.push(record.n);

    const st = record.st && typeof record.st === 'object' ? record.st : null;
    if (!st) continue;
    const dMin = Number(st.dMin) || 0;
    const dMax = Number(st.dMax) || 0;
    gearDmg += Math.round((dMin + dMax) * 0.5) + (Number(st.str) || 0);
    gearSp += Number(st.sp) || 0;
    gearArm += Number(st.arm) || 0;
    gearHp += Number(st.hp) || 0;
    gearCrit += Number(st.crit) || 0;
    gearHaste += Number(st.haste) || 0;
    gearDodge += Number(st.dodge) || 0;
  }

  let paragonRanks = 0;
  let paragonMight = 0;
  let paragonVit = 0;
  let paragonFury = 0;
  try {
    if (typeof snap.dodParagonV1 === 'string' && snap.dodParagonV1) {
      const p = JSON.parse(snap.dodParagonV1) as Record<string, unknown>;
      paragonMight = Math.max(0, Math.trunc(Number(p.might) || 0));
      paragonVit = Math.max(0, Math.trunc(Number(p.vit) || 0));
      paragonFury = Math.max(0, Math.trunc(Number(p.fury) || 0));
      const mastery = Math.max(0, Math.trunc(Number(p.mastery) || 0));
      paragonRanks = paragonMight + paragonVit + paragonFury + mastery;
    }
  } catch {
    paragonRanks = 0;
  }

  const lv = Math.max(1, Math.trunc(Number(parsedSave?.lv) || save.heroLevel || 1));
  const currentDepth = Math.max(1, Math.trunc(Number(parsedSave?.depth) || save.currentDepth || 1));
  const bestDepth = Math.max(
    currentDepth,
    Math.trunc(Number(parsedSave?.best) || save.bestDepth || 1)
  );

  const power = Math.round(
    lv * 3 +
      (heroClass === 'pyromancer' ? gearSp * 1.15 + gearDmg : gearDmg + gearSp * 0.4) +
      paragonMight * 2
  );
  const defense = Math.round(
    40 + lv * 10 + gearHp + gearArm * 2 + paragonVit * 12
  );
  const cunning = Math.round(
    (heroClass === 'rogue' ? 8 : 4) + gearCrit + gearHaste * 0.5 + gearDodge * 0.5 + paragonFury
  );

  const seed = fnv1aHash(
    `${save.heroName}|${heroClass}|${lv}|${bestDepth}|${rawColor}|${power}|${defense}|${cunning}|${gearNames.join(',')}`
  );

  return {
    heroName: save.heroName,
    heroClass,
    classLabel: CLASS_DISPLAY_LABEL[heroClass],
    heroLevel: lv,
    currentDepth,
    bestDepth,
    armorColor: rawColor,
    power,
    defense,
    cunning,
    equippedCount,
    maxRarity,
    paragonRanks,
    seed,
  };
}

export interface DungeonRunRecord {
  id: number;
  heroName: string;
  heroLevel: number;
  depthReached: number;
  runMode: string;
  challengeDate: string | null;
  buildSummary: BuildSummary | null;
  notes: string | null;
  recordedAt: string;
}

export interface LeaderboardEntry {
  id: number;
  heroName: string;
  heroLevel: number;
  depthReached: number;
  runMode: string;
  challengeDate: string | null;
  buildSummary: BuildSummary | null;
  notes: string | null;
  recordedAt: string;
  playerName: string;
}

export interface FallenHeroRecord {
  id: number;
  heroName: string;
  heroLevel: number;
  depthReached: number;
  causeOfDeath: string | null;
  buildSummary: BuildSummary | null;
  fallenAt: string;
}

export interface StashItemRecord {
  id: number;
  itemName: string;
  rarity: number;
  slot: number;
  itemLevel: number;
  itemData: Record<string, unknown>;
  storedAt: string;
}

export interface CapturedHeroSnapshot {
  heroName: string;
  heroLevel: number;
  currentDepth: number;
  bestDepth: number;
  snapshot: Record<string, string>;
}

export interface GameStashBridgeWindow extends Window {
  dodBuildSnapshot?: () => BuildSummary;
  dodRunMode?: {
    get: () => { runMode: RunMode; challengeDate: string | null };
    set: (next: { runMode: RunMode; challengeDate?: string | null }) => void;
  };
  dodStash?: {
    listInventory: () => Array<{ index: number; item: Record<string, unknown> }>;
    popInventoryItem: (index: number) => Record<string, unknown> | null;
    giveItem: (item: Record<string, unknown>) => boolean;
  };
}

export function getTodayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function captureGameSnapshot(win?: Window | null): CapturedHeroSnapshot | null {
  try {
    const storage = win?.localStorage ?? window.localStorage;
    const snapshot: Record<string, string> = {};
    for (const key of GAME_SAVE_KEYS) {
      const value = storage.getItem(key);
      if (value !== null) {
        snapshot[key] = value;
      }
    }

    const rawSave = snapshot.mdjup;
    if (!rawSave) {
      return null;
    }

    const parsed = JSON.parse(rawSave) as {
      heroName?: unknown;
      lv?: unknown;
      depth?: unknown;
      best?: unknown;
    };

    const heroName =
      typeof parsed.heroName === 'string' && parsed.heroName.trim()
        ? parsed.heroName.trim().slice(0, 32)
        : 'Varg';
    const heroLevel = Math.max(1, Math.trunc(Number(parsed.lv) || 1));
    const currentDepth = Math.max(1, Math.trunc(Number(parsed.depth) || 1));
    const bestDepth = Math.max(currentDepth, Math.trunc(Number(parsed.best) || 1));

    return {
      heroName,
      heroLevel,
      currentDepth,
      bestDepth,
      snapshot,
    };
  } catch {
    return null;
  }
}

export function captureBuildSummary(win?: Window | null): BuildSummary | null {
  try {
    const bridge = win as GameStashBridgeWindow | null | undefined;
    if (bridge?.dodBuildSnapshot) {
      return bridge.dodBuildSnapshot();
    }
    const rawSave = (win?.localStorage ?? window.localStorage).getItem('mdjup');
    if (!rawSave) return null;
    const parsed = JSON.parse(rawSave) as { eq?: unknown[]; lv?: number };
    const equipment = (Array.isArray(parsed.eq) ? parsed.eq : [])
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        name: String(item.n || 'Gear').slice(0, 48),
        slot: Number(item.s) || 0,
        rarity: Number(item.r) || 0,
        icon: typeof item.icon === 'string' ? item.icon : undefined,
        itemLevel: Number(item.itemLevel) || Number(parsed.lv) || 1,
        stats:
          item.st && typeof item.st === 'object'
            ? (item.st as Record<string, number>)
            : undefined,
      }));
    return { equipment };
  } catch {
    return null;
  }
}

export function applyGameSnapshot(snapshot: Record<string, string>, win?: Window | null): void {
  const storage = win?.localStorage ?? window.localStorage;
  for (const key of GAME_SAVE_KEYS) {
    if (typeof snapshot[key] === 'string') {
      storage.setItem(key, snapshot[key]);
    } else {
      storage.removeItem(key);
    }
  }
}

async function apiRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errBody?.error || 'Request failed.');
  }

  return (await response.json()) as T;
}

export async function fetchCloudPreferences(token: string) {
  return apiRequest<{ preferences: GamePreferences | null }>('/api/preferences', token);
}

export async function saveCloudPreferences(token: string, prefs: GamePreferences) {
  return apiRequest<{ preferences: GamePreferences }>('/api/preferences', token, {
    method: 'PUT',
    body: JSON.stringify(prefs),
  });
}

export async function fetchHeroSaves(token: string) {
  return apiRequest<{ saves: HeroSaveRecord[] }>('/api/saves', token);
}

export async function saveHeroToCloud(
  token: string,
  payload: CapturedHeroSnapshot & { slotKey: string }
) {
  return apiRequest<{ save: HeroSaveRecord }>('/api/saves', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteCloudHeroSave(token: string, saveId: number) {
  return apiRequest<{ deletedId: number }>(`/api/saves/${saveId}`, token, {
    method: 'DELETE',
  });
}

export async function fetchDungeonRuns(token: string) {
  return apiRequest<{ runs: DungeonRunRecord[] }>('/api/runs', token);
}

export async function fetchGlobalLeaderboard(
  token: string,
  options?: { mode?: 'all' | RunMode; date?: string }
) {
  const params = new URLSearchParams();
  if (options?.mode) params.set('mode', options.mode);
  if (options?.date) params.set('date', options.date);
  const qs = params.toString();
  return apiRequest<{ leaderboard: LeaderboardEntry[] }>(
    `/api/leaderboard${qs ? `?${qs}` : ''}`,
    token
  );
}

export async function recordDungeonRun(
  token: string,
  payload: {
    heroName: string;
    heroLevel: number;
    depthReached: number;
    runMode?: RunMode;
    challengeDate?: string | null;
    buildSummary?: BuildSummary | null;
    notes?: string;
  }
) {
  return apiRequest<{ run: DungeonRunRecord }>('/api/runs', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchFallenHeroes(token: string) {
  return apiRequest<{ fallen: FallenHeroRecord[] }>('/api/fallen', token);
}

export async function archiveFallenHeroRun(
  token: string,
  payload: {
    heroName: string;
    heroLevel: number;
    depthReached: number;
    causeOfDeath?: string;
    buildSummary?: BuildSummary | null;
    slotKey?: string;
  }
) {
  return apiRequest<{ fallen: FallenHeroRecord }>('/api/fallen', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchAccountStash(token: string) {
  return apiRequest<{ items: StashItemRecord[] }>('/api/stash', token);
}

export async function depositToAccountStash(
  token: string,
  itemData: Record<string, unknown>
) {
  return apiRequest<{ item: StashItemRecord }>('/api/stash', token, {
    method: 'POST',
    body: JSON.stringify({ itemData }),
  });
}

export async function withdrawFromAccountStash(token: string, stashId: number) {
  return apiRequest<{ item: StashItemRecord }>(`/api/stash/${stashId}`, token, {
    method: 'DELETE',
  });
}

export interface CurrentUserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
}

export async function fetchCurrentUser(token: string) {
  return apiRequest<{ user: CurrentUserProfile }>('/api/me', token);
}

export interface ClassUsageStat {
  id: 'warrior' | 'pyromancer' | 'rogue';
  label: string;
  count: number;
  percentage: number;
}

export interface GlobalServerStats {
  totalUsers: number;
  activeUsers30d: number;
  totalSavedHeroes: number;
  totalDungeonRuns: number;
  avgBestDepthAcrossPlayers: number;
  avgRunDepth: number;
  maxDepthReached: number;
  classDistribution: ClassUsageStat[];
  generatedAt: string;
}

export async function fetchAdminServerStats(token: string) {
  return apiRequest<{ stats: GlobalServerStats }>('/api/admin/stats', token);
}
