import type { HeroAvatarProfile } from '../lib/gameCloudSync';

const TIER_FRAME_COLORS: Record<number, { border: string; metal: string; trim: string }> = {
  0: { border: '#4a3a2d', metal: '#8f8479', trim: '#63564b' },
  1: { border: '#547aa5', metal: '#9ebce0', trim: '#4b6c91' },
  2: { border: '#c9a24a', metal: '#e8c987', trim: '#8a6d33' },
  3: { border: '#e89b45', metal: '#ffd28e', trim: '#9e591d' },
  4: { border: '#b673f2', metal: '#e4c2ff', trim: '#7844a8' },
};

const CLASS_ACCENT: Record<HeroAvatarProfile['heroClass'], { glow: string; dark: string }> = {
  warrior: { glow: '#d98a4a', dark: '#231412' },
  pyromancer: { glow: '#ff6f28', dark: '#24120c' },
  rogue: { glow: '#78b3d6', dark: '#101820' },
};

function mixHex(hex: string, factor: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(0, 2), 16) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(2, 4), 16) * factor)));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(4, 6), 16) * factor)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function HeroAvatar({
  profile,
  size = 48,
}: {
  profile: HeroAvatarProfile;
  size?: number;
}) {
  const tier = TIER_FRAME_COLORS[profile.maxRarity] ?? TIER_FRAME_COLORS[0];
  const accent = CLASS_ACCENT[profile.heroClass];
  const armorBase = profile.armorColor;
  const armorLight = mixHex(armorBase, 1.25);
  const armorShadow = mixHex(armorBase, 0.55);

  const s = profile.seed;
  const variant = s % 3;
  const crestTier = profile.heroLevel >= 20 || profile.bestDepth >= 20 ? 2 : profile.heroLevel >= 8 || profile.bestDepth >= 8 ? 1 : 0;
  const pipCount = Math.min(4, Math.max(1, Math.ceil(profile.equippedCount / 2)));
  const runeArcAngle = Math.min(280, Math.round(45 + profile.power * 1.4 + profile.defense * 0.12));
  const showParagonCrown = profile.paragonRanks > 0 || profile.bestDepth >= 15;

  // Compute radial arc path around center (32, 30) with r=23
  const cx = 32;
  const cy = 30;
  const radius = 23;
  const startRad = ((-90 - runeArcAngle / 2) * Math.PI) / 180;
  const endRad = ((-90 + runeArcAngle / 2) * Math.PI) / 180;
  const x1 = (cx + radius * Math.cos(startRad)).toFixed(2);
  const y1 = (cy + radius * Math.sin(startRad)).toFixed(2);
  const x2 = (cx + radius * Math.cos(endRad)).toFixed(2);
  const y2 = (cy + radius * Math.sin(endRad)).toFixed(2);
  const largeArc = runeArcAngle > 180 ? 1 : 0;
  const arcPath = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;

  return (
    <div
      style={{ width: size, height: size, borderColor: tier.border }}
      className="relative shrink-0 overflow-hidden rounded-[2px] border bg-[#0b090a]"
      title={`${profile.classLabel} · Lv.${profile.heroLevel} · Best D${profile.bestDepth} · ${profile.power} PWR · ${profile.defense} DEF · ${profile.cunning}% CUN`}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        aria-hidden="true"
        className="block h-full w-full"
      >
        {/* Obsidian backdrop & subtle stat-scaled inner aura */}
        <rect width="64" height="64" fill="#0b090a" />
        <circle cx="32" cy="30" r="24" fill={accent.dark} />
        <path
          d={arcPath}
          fill="none"
          stroke={tier.metal}
          strokeOpacity="0.32"
          strokeWidth="1.25"
          strokeDasharray={profile.cunning >= 18 ? '3 2' : '6 2'}
        />

        {/* Corner rank frame notches driven by gear tier & equipped pieces */}
        <path d="M 3 9 V 3 H 9" fill="none" stroke={tier.metal} strokeWidth="1.4" />
        <path d="M 55 3 H 61 V 9" fill="none" stroke={tier.metal} strokeWidth="1.4" />
        <path d="M 3 55 V 61 H 9" fill="none" stroke={tier.metal} strokeWidth="1.4" />
        <path d="M 55 61 H 61 V 55" fill="none" stroke={tier.metal} strokeWidth="1.4" />

        {/* Class Back Weapons / Aura Silhouette */}
        {profile.heroClass === 'warrior' && (
          <g>
            {/* Crossed blade(s) behind shoulders — high defense adds tower shield silhouette */}
            {profile.defense >= 180 || variant === 1 ? (
              <path
                d="M 13 24 L 22 19 L 42 19 L 51 24 L 48 48 L 32 56 L 16 48 Z"
                fill="#1b1718"
                stroke={tier.trim}
                strokeWidth="1.2"
              />
            ) : null}
            <g stroke={tier.metal} strokeWidth="1.5" strokeLinecap="round">
              <line x1="14" y1="12" x2="50" y2="52" stroke={tier.trim} strokeWidth="2.4" />
              <line x1="50" y1="12" x2="14" y2="52" stroke={tier.metal} strokeWidth="2.2" />
              <line x1="12" y1="17" x2="18" y2="11" stroke={tier.metal} strokeWidth="2" />
              <line x1="52" y1="17" x2="46" y2="11" stroke={tier.metal} strokeWidth="2" />
            </g>
          </g>
        )}

        {profile.heroClass === 'pyromancer' && (
          <g>
            {/* Flame Halo & Arcane Spires scaled by spell power */}
            <circle
              cx="32"
              cy="25"
              r={15 + crestTier * 1.5}
              fill="none"
              stroke={accent.glow}
              strokeOpacity="0.45"
              strokeWidth="1.4"
              strokeDasharray="2 3"
            />
            <path
              d={
                variant === 0
                  ? 'M 17 31 L 12 16 L 23 23 M 47 31 L 52 16 L 41 23'
                  : 'M 18 33 Q 11 20 20 12 Q 21 22 25 25 M 46 33 Q 53 20 44 12 Q 43 22 39 25'
              }
              fill={accent.glow}
              fillOpacity="0.6"
            />
            {profile.power >= 35 && (
              <polygon
                points="32,5 35,12 32,15 29,12"
                fill="#ffd07a"
              />
            )}
          </g>
        )}

        {profile.heroClass === 'rogue' && (
          <g>
            {/* Twin Curved Daggers & Crescent Stealth Sigil */}
            <path
              d="M 15 48 L 22 14 L 26 24 L 20 48 Z"
              fill={tier.metal}
              fillOpacity="0.72"
            />
            <path
              d="M 49 48 L 42 14 L 38 24 L 44 48 Z"
              fill={tier.metal}
              fillOpacity="0.72"
            />
            {profile.cunning >= 14 && (
              <path
                d="M 16 14 A 18 18 0 0 1 48 14 A 20 15 0 0 0 16 14 Z"
                fill={accent.glow}
                fillOpacity="0.45"
              />
            )}
          </g>
        )}

        {/* Torso / Pauldrons tinted with Hero's Armor Color */}
        <g>
          {profile.heroClass === 'warrior' ? (
            <>
              <path
                d="M 11 60 L 14 42 Q 23 36 32 38 Q 41 36 50 42 L 53 60 Z"
                fill={armorBase}
                stroke={tier.metal}
                strokeWidth="1.3"
              />
              {/* Heavy Layered Pauldrons */}
              <path
                d="M 10 47 Q 13 36 24 38 L 22 48 Z"
                fill={armorLight}
                stroke={tier.trim}
                strokeWidth="1"
              />
              <path
                d="M 54 47 Q 51 36 40 38 L 42 48 Z"
                fill={armorLight}
                stroke={tier.trim}
                strokeWidth="1"
              />
              <path d="M 27 42 L 32 54 L 37 42" fill={armorShadow} stroke={tier.metal} strokeWidth="1" />
            </>
          ) : profile.heroClass === 'pyromancer' ? (
            <>
              {/* High-Collared Mantle */}
              <path
                d="M 13 60 L 17 40 L 23 33 L 32 39 L 41 33 L 47 40 L 51 60 Z"
                fill={armorBase}
                stroke={tier.metal}
                strokeWidth="1.2"
              />
              <path d="M 24 39 L 32 56 L 40 39" fill={armorShadow} />
              <circle cx="32" cy="45" r="2.6" fill={accent.glow} stroke={tier.metal} strokeWidth="0.9" />
            </>
          ) : (
            <>
              {/* Agile Cloak & Cross-Strap Harness */}
              <path
                d="M 14 60 L 17 41 Q 25 36 32 38 Q 39 36 47 41 L 50 60 Z"
                fill={armorBase}
                stroke={tier.trim}
                strokeWidth="1.2"
              />
              <line x1="20" y1="40" x2="44" y2="57" stroke={armorShadow} strokeWidth="3" />
              <line x1="44" y1="40" x2="20" y2="57" stroke={tier.metal} strokeWidth="1.4" />
            </>
          )}
        </g>

        {/* Class Headpiece / Bust Silhouette */}
        {profile.heroClass === 'warrior' && (
          <g>
            {/* Horns or Crest on High-Tier Warriors */}
            {crestTier >= 1 && (
              <path
                d={
                  variant === 2
                    ? 'M 21 22 Q 14 14 18 9 Q 22 15 24 18 M 43 22 Q 50 14 46 9 Q 42 15 40 18'
                    : 'M 29 14 L 32 6 L 35 14 Z'
                }
                fill={tier.metal}
              />
            )}
            {/* Greathelm */}
            <path
              d="M 21 24 Q 21 13 32 13 Q 43 13 43 24 L 41 38 L 32 42 L 23 38 Z"
              fill="#2a2425"
              stroke={tier.metal}
              strokeWidth="1.4"
            />
            {/* Helm Crest Ridge & T-Visor */}
            <line x1="32" y1="14" x2="32" y2="39" stroke={tier.metal} strokeWidth="1.5" />
            <path
              d={
                variant === 1
                  ? 'M 24 25 L 30 27 L 30 29 L 25 28 Z M 40 25 L 34 27 L 34 29 L 39 28 Z'
                  : 'M 24 26 H 40 V 28.5 H 33.5 V 36 H 30.5 V 28.5 H 24 Z'
              }
              fill="#090807"
            />
            <circle cx="27.5" cy="27" r="1" fill={accent.glow} />
            <circle cx="36.5" cy="27" r="1" fill={accent.glow} />
          </g>
        )}

        {profile.heroClass === 'pyromancer' && (
          <g>
            {/* Pointed / Peaked Arcane Cowl */}
            <path
              d="M 19 36 L 22 20 Q 32 10 42 20 L 45 36 L 32 41 Z"
              fill={armorShadow}
              stroke={tier.metal}
              strokeWidth="1.3"
            />
            <path
              d="M 24 24 Q 32 18 40 24 L 38 37 L 32 39 L 26 37 Z"
              fill="#120c0e"
            />
            {/* Glowing Ember Eyes & Brow Sigil */}
            <polygon points="32,16 34,20 32,23 30,20" fill="#ffb84d" />
            <circle cx="28.5" cy="28.5" r="1.4" fill="#ff7d33" />
            <circle cx="35.5" cy="28.5" r="1.4" fill="#ff7d33" />
          </g>
        )}

        {profile.heroClass === 'rogue' && (
          <g>
            {/* Deep Assassin Hood & Shadowed Half-Mask */}
            <path
              d="M 20 36 L 21 21 Q 32 11 43 21 L 44 36 L 32 40 Z"
              fill={armorShadow}
              stroke={tier.trim}
              strokeWidth="1.3"
            />
            <path d="M 24 24 Q 32 20 40 24 L 39 36 L 32 39 L 25 36 Z" fill="#0d0f12" />
            {/* Lower Half-Mask */}
            <path
              d="M 24 30 L 32 32 L 40 30 L 38 38 L 32 40 L 26 38 Z"
              fill={armorBase}
              stroke={tier.metal}
              strokeWidth="0.9"
            />
            {/* Sharp Slit Eyes */}
            <polygon points="26,26.5 30.5,28 26.5,28.5" fill={accent.glow} />
            <polygon points="38,26.5 33.5,28 37.5,28.5" fill={accent.glow} />
          </g>
        )}

        {/* Paragon / Depth Crown Pip */}
        {showParagonCrown && (
          <polygon points="32,2 34.5,6.5 32,9 29.5,6.5" fill={tier.metal} />
        )}

        {/* Bottom Equip-Mastery Studs (1..4 pips representing equipped slot fullness) */}
        <g>
          {Array.from({ length: pipCount }).map((_, idx) => {
            const totalW = (pipCount - 1) * 6;
            const px = 32 - totalW / 2 + idx * 6;
            return (
              <rect
                key={idx}
                x={px - 1.5}
                y={58.5}
                width="3"
                height="2.5"
                fill={tier.metal}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
