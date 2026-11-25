// Original deterministic synthesis. Run with node scripts/audio/hollowmere-bank.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../godot/assets/audio/hollowmere/', import.meta.url));
const rate = 32000;
const tau = 2 * Math.PI;
const midi = n => 440 * 2 ** ((n - 69) / 12);

function randomFor(key) {
  let state = 2166136261;
  for (const char of key) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
}

// A layer is [start, duration, fundamental/filter frequency, gain, envelope attack].
function layer(kind, start, duration, hz, gain, attack = 0.003) {
  return { kind, start, duration, hz, gain, attack };
}
const strike = (...args) => layer('metal', ...args);
const skin = (...args) => layer('skin', ...args);
const air = (...args) => layer('air', ...args);
const bow = (...args) => layer('bow', ...args);
const pluck = (...args) => layer('pluck', ...args);

function render(layers, seconds, rng, loop = false) {
  const data = new Float32Array(Math.round(seconds * rate));
  for (const l of layers) {
    const length = Math.round(l.duration * rate);
    const start = Math.round(l.start * rate);
    const hz = l.hz * (0.993 + rng() * 0.014);
    let phase = rng() * tau, low = 0, rumble = 0;
    const alpha = 1 - Math.exp(-tau * hz / rate);
    for (let i = 0; i < length; i++) {
      const frame = start + i;
      if (!loop && frame >= data.length) break;
      const t = i / rate, u = i / length;
      const env = Math.min(1, t / l.attack, (length - i - 1) / (rate * 0.008));
      let sample;
      if (l.kind === 'air') {
        low += alpha * ((rng() * 2 - 1) - low);
        rumble += Math.min(alpha * 0.22, 0.04) * (low - rumble);
        sample = (low - rumble) * Math.sin(Math.PI * u) ** 0.7;
      } else {
        phase += tau * hz / rate * (l.kind === 'skin' ? 1 + 1.3 * Math.exp(-35*t) : 1);
        if (l.kind === 'metal') {
          sample = Math.exp(-4*u) * (Math.sin(phase) + 0.48*Math.sin(2.71*phase)*Math.exp(-3*u) + 0.22*Math.sin(4.19*phase)*Math.exp(-7*u));
        } else if (l.kind === 'bow') {
          sample = Math.sin(Math.PI*u) ** 1.4 * (Math.sin(phase + 0.17*Math.sin(t*27)) + 0.27*Math.sin(2*phase) + 0.14*Math.sin(3*phase));
        } else if (l.kind === 'pluck') {
          sample = Math.exp(-5*u) * (Math.sin(phase) + 0.4*Math.sin(2*phase)*Math.exp(-4*u) + 0.23*Math.sin(3*phase)*Math.exp(-8*u));
        } else {
          sample = Math.exp(-6*u) * (Math.sin(phase) + 0.2*Math.sin(2*phase));
        }
      }
      data[frame % data.length] += sample * l.gain * env;
    }
  }
  return data;
}

function write(id, channels) {
  const frames = channels[0].length, count = channels.length;
  let peak = 0;
  for (const ch of channels) for (const sample of ch) peak = Math.max(peak, Math.abs(sample));
  if (!(peak > 0)) throw new Error('Empty render: ' + id);
  const wav = Buffer.alloc(44 + frames * count * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(count, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate*count*2, 28);
  wav.writeUInt16LE(count*2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
  for (let i = 0; i < frames; i++) for (let c = 0; c < count; c++)
    wav.writeInt16LE(Math.round(channels[c][i] / peak * 25000), 44 + (i*count+c)*2);
  const dest = path.join(root, id + '.wav');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, wav);
}

const cues = {
  wells: [strike(0,3.4,110,.58),bow(.5,2.5,168,.28),strike(.83,2.4,220,.13)],
  act_complete: [pluck(0,1.5,147,.32),bow(.28,2.6,220,.36),bow(.64,2.1,330,.23)],
  boss_summon: [skin(0,.35,110,.5),strike(.13,.71,311,.35)],
  boss_enrage: [air(0,.65,3210,.7),bow(.1,.63,277,.33)],
  tell_archer: [air(0,.37,1650,.6),bow(.07,.37,530,.22)],
  tell_hollow: [air(0,.26,1150,.65),skin(.1,.13,220,.2)],
  tell_crawler: [air(0,.14,4300,.65),pluck(.025,.12,660,.23)],
  tell_boss: [strike(0,.29,310,.31),air(.09,.36,1400,.6)],
  ember_impact: [skin(0,.18,155,.37),air(0,.24,4150,.86)],
  level_up: [pluck(0,.55,330,.34),bow(.13,.68,495,.33)],
  hero_fall: [skin(0,.4,95,.48),air(.07,.51,1050,.55),strike(.32,.25,370,.17)],
  ui_click: [air(0,.045,1400,.55), skin(.014,.065,510,.32)],
  inventory: [air(0,.14,1700,.8), skin(.1,.1,255,.22)],
  equipment: [air(0,.13,1300,.6), strike(.09,.18,640,.32), skin(.095,.1,150,.38)],
  vendor: [strike(0,.18,1220,.4), strike(.087,.25,940,.26), skin(.10,.09,200,.25)],
  deny: [skin(0,.11,165,.5), air(.01,.08,750,.25)],
  quest_accept: [air(0,.15,1400,.4), pluck(.07,.55,midi(62),.45), bow(.24,.63,midi(63),.28)],
  quest_complete: [pluck(0,.7,midi(62),.48), pluck(.23,.5,midi(63),.28), bow(.48,1.25,midi(69),.38), pluck(.5,.9,midi(50),.3)],
  gear: [air(0,.19,2700,.6), strike(.065,.10,880,.09)],
  sword: [air(0,.19,3800,.8), air(.075,.10,7600,.34)],
  axe: [air(0,.29,1100,1), skin(.035,.19,117,.16), air(.14,.13,2600,.62)],
  crit: [strike(0,.13,1380,.38), strike(.027,.18,1820,.33), skin(.01,.15,152,.35)],
  hit_hollow: [skin(0,.13,145,.6), air(.008,.12,1500,.75)],
  hit_archer: [pluck(0,.08,480,.45), pluck(.018,.1,720,.3), skin(0,.11,162,.35)],
  hit_crawler: [strike(0,.09,670,.4), air(.024,.13,4300,.55)],
  hit_boss: [skin(0,.22,107,.5), strike(.003,.32,270,.46)],
  death_hollow: [air(0,.38,1200,.6), skin(.21,.24,99,.4)],
  death_archer: [pluck(0,.12,570,.45), skin(.13,.19,180,.42), pluck(.23,.17,385,.32)],
  death_crawler: [air(0,.28,3200,.52), strike(.15,.12,615,.32), skin(.24,.16,119,.35)],
  boss_prepare: [strike(0,.17,955,.4), bow(.05,1.15,415,.36), bow(.55,.65,883,.29)],
  boss_release: [strike(0,1.05,142,.65), skin(0,.5,68,.5), air(.015,.47,1500,.5)],
  boss_death: [strike(0,1.8,92,.52), skin(.24,.56,71,.53), strike(.79,.5,336,.21), strike(1.28,.32,510,.14), skin(1.61,.12,192,.18)],
  loot_gold: [strike(0,.13,1510,.4), strike(.041,.18,1120,.33)],
  loot_item: [skin(0,.17,165,.55), air(.012,.16,1900,.48)],
  loot_potion: [strike(0,.17,895,.34), skin(.012,.1,260,.26)],
  relic: [strike(0,.65,700,.45), bow(.12,.65,1050,.26)],
  unique: [strike(0,.75,700,.45), bow(.12,.7,1050,.26), pluck(.35,1.05,1400,.28)],
  thunder: [air(0,.22,2100,.46), skin(.055,1.6,49,.52), air(.16,3.8,260,1), skin(.77,2.1,63,.27)],
  potion: [skin(0,.09,405,.33), pluck(.08,.13,630,.24), skin(.17,.19,180,.3)],
  hurt: [skin(0,.21,106,.58), air(.01,.19,1150,.55)],
};
for (const [name,freq,grit] of [['stone',265,3400],['dirt',125,1050],['wood',390,1500],['grass',105,4200],['snow',180,2350]]) {
  for (let take=1; take<=3; take++) {
    const id = 'step_'+name+'_'+take;
    cues[id] = [skin(0,.12,freq*(1+.025*take),.32), air(.008,.10+.012*take,grit,.76), air(.06,.09,grit*.55,.35)];
    if (name === 'wood') cues[id].push(pluck(.015,.16,480,.26));
    if (name === 'snow') cues[id].push(air(.054,.19,3100,.65));
  }
}

function shot(id, layers) {
  const length = Math.max(...layers.map(l => l.start+l.duration));
  write(id, [render(layers,length,randomFor(id))]);
}
for (const [id,layers] of Object.entries(cues)) shot('sfx/'+id,layers);

// Each base skill has its own release gesture. Material contact is mixed by the target.
const skills = {
  grave_cleave: [air(0,.28,1900,.8), air(.11,.14,4200,.55)],
  shield_bash: [air(0,.09,1100,.52), skin(.04,.17,135,.45), strike(.04,.12,430,.3)],
  earthsplitter: [skin(0,.42,64,.7), air(.03,.52,1150,.78), skin(.17,.29,96,.3)],
  iron_rush: [strike(0,.12,510,.23), air(.04,.44,1800,.83)],
  grave_leap: [skin(0,.16,120,.4), air(.04,.41,1750,.76)],
  grave_roar: [bow(0,.48,95,.44), air(.015,.52,1300,.8)],
  sextons_whirl: [air(0,.34,2650,.8), air(.21,.36,3200,.72), air(.44,.35,2300,.65)],
  iron_hide: [strike(0,.26,285,.43),strike(.06,.2,510,.32),strike(.115,.31,740,.24)],
  ember_bolt: [air(0,.09,6900,.9),skin(.02,.20,188,.3),air(.04,.29,1450,.65)],
  cinder_spray: [air(0,.18,4500,.7),air(.06,.22,2900,.7),air(.12,.16,5200,.5)],
  cinder_nova: [air(0,.17,2300,.7),skin(.14,.33,83,.55),air(.145,.48,4200,.7)],
  pyre: [skin(0,.25,111,.36),air(.03,.63,2800,.82),strike(.12,.25,660,.16)],
  ember_step: [air(0,.19,1350,.7),air(.17,.22,5600,.68)],
  ashen_ward: [bow(0,.66,520,.3),strike(.34,.32,808,.28),air(.1,.44,2500,.7)],
  cinder_rain: [air(0,.6,2900,.75),pluck(.11,.16,780,.22),pluck(.26,.2,1080,.2)],
  flame_wave: [air(0,.58,1250,.95),air(.14,.45,3700,.72),skin(.1,.34,88,.23)],
  twin_cuts: [air(0,.13,4100,.83),air(.115,.16,5350,.77)],
  barbed_throw: [skin(0,.06,455,.26),air(.02,.24,5500,.78),bow(.03,.16,810,.12)],
  knife_fan: [air(0,.24,4100,.8),strike(.024,.09,1130,.18),strike(.045,.09,1470,.16)],
  veilstep: [air(0,.31,1550,.8),bow(.06,.27,302,.18),air(.26,.10,6400,.4)],
  smoke_veil: [air(0,.45,970,.86),air(.15,.36,3100,.48)],
  bone_caltrops: [pluck(0,.09,470,.36),pluck(.056,.10,785,.31),pluck(.13,.12,565,.31),air(.09,.24,2900,.5)],
  death_flurry: [air(0,.15,1600,.8),air(.1,.19,4600,.7),air(.23,.16,3300,.75)],
  rot_cloud: [air(0,.64,780,.85),skin(.05,.22,155,.33),skin(.23,.24,195,.25)],
};
for (const [id,layers] of Object.entries(skills)) for (let i=1;i<=3;i++) {
  const suffix = i===1 ? '' : '_'+i;
  shot('spells/'+id+suffix, layers.map(l => ({...l, hz:l.hz*(.94+.035*i), start:l.start*(.9+.055*i)})));
}

// Common central performance with decorrelated, wraparound room reflections.
function stereoRoom(dry, side, wet) {
  return [0,1].map(c => {
    const delay = Math.floor(rate * (c ? .073 : .047));
    return dry.map((v,i) => .79*v + wet*dry[(i+dry.length-delay)%dry.length] + side[c][i]);
  });
}

for (const id of ['title','hollowmere','sunken_crypt','combat','bell_warden']) {
  const beat = 60/72, seconds = 32*beat;
  const layers = [], sides = [[],[]];
  const fighting = id === 'combat' || id === 'bell_warden';
  const roots = {title:[38,39,46,45], hollowmere:[50,46,43,45], sunken_crypt:[38,37,34,33],
    combat:[38,38,41,39], bell_warden:[26,27,31,26]}[id];
  roots.forEach((root,index) => {
    const t = index*8*beat;
    layers.push(bow(t,8.7*beat,midi(root),.32));
    sides[index%2].push(bow(t+.12,7.4*beat,midi(root+7),.14));
    if (id === 'hollowmere' || id === 'title') {
      for (const [k,interval] of [[.5,0],[2,1],[5,7]]) {
        layers.push(pluck(t+k*beat,1.9,midi(root+12+interval),.23));
      }
    } else if (id === 'sunken_crypt') {
      sides[index%2].push(air(t+2.1,1.6,980,.20),bow(t+3.4,2.7,midi(root+19),.11));
    }
    if (fighting) {
      for (const k of (id === 'bell_warden' ? [0,1.5,3,4,6.5,7] : [0,2.5,4,7])) {
        layers.push(skin(t+k*beat,.43,k===0 ? 62 : 87,.31),pluck(t+k*beat,.39,midi(root+12),.24));
      }
      if (id === 'bell_warden') sides[index%2].push(strike(t+3*beat,1.6,midi(root+24),.18));
    }
  });
  const dry = render(layers,seconds,randomFor(id),true);
  write('music/'+id,stereoRoom(dry,sides.map((ls,c)=>render(ls,seconds,randomFor(id+c),true)),.14));
}

// The boss director starts these at the running transport position on phase changes.
for (const phase of ['summon','enrage']) {
  const beat = 60/72, layers = [];
  [26,27,31,26].forEach((root,bar) => {
    for (const k of (phase === 'summon' ? [1,5] : [0,1.5,3,4,5.5,7])) {
      const t = (8*bar+k)*beat;
      if (phase === 'summon') layers.push(bow(t,beat*2.5,midi(root+19),.33));
      else layers.push(pluck(t,beat*.65,midi(root+31),.26),air(t,.14,1600,.2));
    }
  });
  const seconds = 32*beat, dry = render(layers,seconds,randomFor(phase),true);
  const silence = new Float32Array(dry.length);
  write('music/boss_'+phase,stereoRoom(dry,[silence,silence],.14));
}

for (const [id,cut] of Object.entries({wind:650,drips:390,cave:230,forest:2100,rain:4200})) {
  const seconds=19;
  const channels=[0,1].map(c=>{
    const rng=randomFor(id+c), layers=[];
    for(let t=0;t<seconds;t+=2.5) layers.push(air(t,5.5,cut*(.8+.35*rng()),.52));
    for(let t=1+c*.8;t<seconds;t+=2.1+rng()*3.5) {
      if(id==='drips' || id==='cave') {
        const hz=620+rng()*510;
        layers.push(pluck(t,.16,hz,.16),pluck(t+.13,.22,hz,.052),pluck(t+.31,.25,hz,.025));
      } else if(id==='wind') layers.push(air(t,1.2,1450,.15),pluck(t+.6,.24,180,.031));
      else if(id==='forest') layers.push(air(t,.8,3700,.23),bow(t+.6,.19,1600,.025));
      else layers.push(air(t,.16,6800,.32));
    }
    return render(layers,seconds,rng,true);
  });
  write('ambience/'+id,channels);
}
