// Generates Act I's music, ambience and new skill sounds by synthesis (no samples, no downloads).
//
//   bun run audio:act1            writes godot/assets/audio/{music,ambience,sfx,spells}/*.wav
//
// Everything is seeded, so running it again gives the same files. The loops are rendered with their
// reverb tail folded back to the start, so they repeat without a seam. 22.05 kHz mono 16-bit keeps
// the files small; the game loops music and ambience (godot/scripts/autoload/act_audio.gd).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(root, 'godot', 'assets', 'audio');
const SR = 22050;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- helpers
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const buf = (seconds) => new Float32Array(Math.ceil(seconds * SR));

function writeWav(file, data) {
  const out = Buffer.alloc(44 + data.length * 2);
  out.write('RIFF', 0);
  out.writeUInt32LE(36 + data.length * 2, 4);
  out.write('WAVE', 8);
  out.write('fmt ', 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(1, 22); // mono
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36);
  out.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) out.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(data[i] * 32767))), 44 + i * 2);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out);
  console.log(`✓ ${path.relative(root, file)} (${(out.length / 1048576).toFixed(2)} MB)`);
}

function normalize(data, peak = 0.89) {
  let max = 0;
  for (const v of data) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < data.length; i++) data[i] *= peak / max;
  return data;
}

// Fold everything past `length` seconds back onto the start, so the loop is seamless.
function fold(data, length) {
  const n = Math.round(length * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < data.length; i++) out[i % n] += data[i];
  return out;
}

// One-pole low-pass, in place. `cut` may be a number or a function of the sample index.
function lowpass(data, cut) {
  let y = 0;
  for (let i = 0; i < data.length; i++) {
    const c = Math.max(10, typeof cut === "function" ? cut(i) : cut); // a cutoff at or below 0 Hz makes the filter blow up
    const a = 1 - Math.exp((-TAU * c) / SR);
    y += a * (data[i] - y);
    data[i] = y;
  }
  return data;
}
function highpass(data, cut) {
  const low = lowpass(Float32Array.from(data), cut);
  for (let i = 0; i < data.length; i++) data[i] -= low[i];
  return data;
}

// A small Schroeder reverb: four combs into two all-passes. Returns a new, longer buffer.
function reverb(data, { size = 1, mix = 0.35, damp = 0.4, tail = 4 } = {}) {
  const out = new Float32Array(data.length + Math.round(tail * SR));
  out.set(data);
  const wet = new Float32Array(out.length);
  for (const [ms, g] of [[29.7, 0.84], [37.1, 0.83], [41.1, 0.82], [43.7, 0.81]]) {
    const d = Math.round((ms * size * SR) / 1000);
    const line = new Float32Array(d);
    let idx = 0;
    let lp = 0;
    for (let i = 0; i < out.length; i++) {
      const y = line[idx];
      lp = y * (1 - damp) + lp * damp;
      line[idx] = out[i] + lp * g;
      idx = (idx + 1) % d;
      wet[i] += y * 0.25;
    }
  }
  for (const [ms, g] of [[5.0, 0.7], [1.7, 0.7]]) {
    const d = Math.round((ms * size * SR) / 1000);
    const line = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < wet.length; i++) {
      const x = wet[i];
      const y = line[idx];
      const v = x + y * g;
      line[idx] = v;
      wet[i] = y - v * g;
      idx = (idx + 1) % d;
    }
  }
  for (let i = 0; i < out.length; i++) out[i] = out[i] * (1 - mix) + wet[i] * mix * 2.2;
  return out;
}

// ---------------------------------------------------------------- instruments (add into `data` at time `t`)
// A church bell: inharmonic partials, each with its own decay.
const BELL = [[0.5, 1.0, 4.5], [1.0, 0.8, 3.2], [1.19, 0.55, 2.4], [1.5, 0.45, 2.0], [2.0, 0.4, 1.6], [2.51, 0.28, 1.1], [2.66, 0.22, 0.9], [3.01, 0.18, 0.8], [4.17, 0.1, 0.5]];
function bell(data, t, freq, amp, length = 7) {
  const s0 = Math.round(t * SR);
  for (let i = 0; i < length * SR && s0 + i < data.length; i++) {
    const tt = i / SR;
    let v = 0;
    for (const [ratio, a, decay] of BELL) v += a * Math.exp(-tt / decay) * Math.sin(TAU * freq * ratio * tt + ratio);
    const strike = Math.min(1, tt * 400);
    data[s0 + i] += v * amp * strike * 0.25;
  }
}

// A plucked string (Karplus-Strong): the lonely lute of Hollowmere.
function pluck(data, t, freq, amp, r, decay = 0.996) {
  const n = Math.max(2, Math.round(SR / freq));
  const line = new Float32Array(n);
  for (let i = 0; i < n; i++) line[i] = r() * 2 - 1;
  const s0 = Math.round(t * SR);
  let idx = 0;
  for (let i = 0; i < SR * 4 && s0 + i < data.length; i++) {
    const next = (idx + 1) % n;
    const v = line[idx];
    line[idx] = (line[idx] + line[next]) * 0.5 * decay;
    idx = next;
    data[s0 + i] += v * amp;
  }
}

// A slow pad chord of detuned saws, low-passed. Seeded start phases keep the output identical between runs.
const padPhase = rng(31337);
function pad(data, t, length, notes, amp, { cut = 900, attack = 2.5, release = 3 } = {}) {
  const s0 = Math.round(t * SR);
  const n = Math.round((length + release) * SR);
  const voice = new Float32Array(n);
  for (const note of notes) {
    for (const det of [-0.11, 0.0, 0.09]) {
      const f = midi(note + det);
      let ph = padPhase();
      for (let i = 0; i < n; i++) {
        ph += f / SR;
        voice[i] += (2 * (ph % 1) - 1) * 0.33;
      }
    }
  }
  lowpass(voice, cut);
  lowpass(voice, cut * 1.5);
  for (let i = 0; i < n && s0 + i < data.length; i++) {
    const tt = i / SR;
    const env = Math.min(1, tt / attack) * (tt > length ? Math.max(0, 1 - (tt - length) / release) : 1);
    data[s0 + i] += (voice[i] / notes.length) * env * amp;
  }
}

// A low drone: sine and filtered saw, with a slowly breathing filter.
function drone(data, freq, amp, cut = 300, wobble = 0.08) {
  let p1 = 0;
  let p2 = 0;
  const saw = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    p1 += freq / SR;
    p2 += (freq * 1.003) / SR;
    saw[i] = Math.sin(TAU * p1) * 0.6 + (2 * (p2 % 1) - 1) * 0.4;
  }
  lowpass(saw, (i) => cut * (1 + Math.sin((TAU * i) / (SR * 11)) * wobble * 4));
  for (let i = 0; i < data.length; i++) data[i] += saw[i] * amp;
}

function noise(data, t, length, amp, r, { cut = 2000, attack = 0.01, shape = 'exp' } = {}) {
  const s0 = Math.round(t * SR);
  const n = Math.round(length * SR);
  const seg = new Float32Array(n);
  for (let i = 0; i < n; i++) seg[i] = r() * 2 - 1;
  lowpass(seg, cut);
  for (let i = 0; i < n && s0 + i < data.length; i++) {
    const tt = i / SR;
    const env = Math.min(1, tt / attack) * (shape === 'exp' ? Math.exp((-tt * 5) / length) : Math.sin((Math.PI * i) / n));
    data[s0 + i] += seg[i] * env * amp;
  }
}

// A kick or tom: a sine falling in pitch.
function drum(data, t, f0, f1, amp, length = 0.5) {
  const s0 = Math.round(t * SR);
  let ph = 0;
  for (let i = 0; i < length * SR && s0 + i < data.length; i++) {
    const tt = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-tt * 18);
    ph += f / SR;
    data[s0 + i] += Math.sin(TAU * ph) * Math.exp((-tt * 4.5) / length) * amp;
  }
}

// ---------------------------------------------------------------- music
const D_MINOR = [50, 52, 53, 55, 57, 58, 60, 62]; // D E F G A Bb C D

function title() {
  const r = rng(13);
  const L = 64;
  const data = buf(L + 6);
  drone(data, midi(38), 0.18, 260);
  const chords = [[50, 53, 57], [46, 50, 53], [43, 46, 50, 55], [45, 49, 52]];
  chords.forEach((c, i) => pad(data, i * 16, 15, c, 0.32, { cut: 700, attack: 4, release: 4 }));
  for (let b = 0; b < L; b += 16) bell(data, b + 0.2, midi(38), 0.9, 9);
  for (let t = 6; t < L - 4; t += 2.5 + r() * 3) pluck(data, t, midi(D_MINOR[Math.floor(r() * D_MINOR.length)] + 12), 0.18, r);
  return normalize(fold(reverb(data, { size: 1.3, mix: 0.45, tail: 6 }), L));
}

function hollowmere() {
  const r = rng(1337);
  const L = 64;
  const data = buf(L + 6);
  drone(data, midi(38), 0.14, 240);
  const chords = [[50, 53, 57], [50, 55, 58], [46, 50, 53, 57], [45, 50, 52]];
  chords.forEach((c, i) => pad(data, i * 16, 15.5, c, 0.22, { cut: 650, attack: 5, release: 4 }));
  // The lute: a slow broken chord over each pad chord, a little uneven like a tired hand.
  chords.forEach((c, i) => {
    for (let k = 0; k < 6; k++) {
      const note = c[k % c.length] + (k >= c.length ? 12 : 0);
      pluck(data, i * 16 + 1 + k * 1.9 + r() * 0.15, midi(note + 12), 0.2, r, 0.995);
    }
  });
  // The distant bell of St. Aldric's, which should be silent.
  bell(data, 3, midi(43), 0.35, 8);
  bell(data, 35, midi(43), 0.3, 8);
  return normalize(fold(reverb(data, { size: 1.5, mix: 0.5, tail: 6 }), L));
}

function sunkenCrypt() {
  const r = rng(404);
  const L = 64;
  const data = buf(L + 6);
  drone(data, midi(33), 0.22, 180, 0.15); // A1
  drone(data, midi(34), 0.08, 160, 0.2); // Bb1 rubbing against it
  for (let i = 0; i < 4; i++) pad(data, i * 16 + 2, 12, [57, 58, 63], 0.11, { cut: 500, attack: 6, release: 5 });
  // Scrapes of stone and metal, far away.
  for (let t = 4; t < L - 3; t += 5 + r() * 6) noise(data, t, 1.4 + r(), 0.12, r, { cut: 600 + r() * 900, attack: 0.4, shape: 'swell' });
  // A low bell from below.
  bell(data, 20, midi(31), 0.45, 10);
  bell(data, 52, midi(30), 0.35, 10);
  for (let t = 1; t < L; t += 3 + r() * 5) pluck(data, t, midi([69, 70, 74, 75][Math.floor(r() * 4)] + 12), 0.05, r, 0.99);
  return normalize(fold(reverb(data, { size: 2.0, mix: 0.6, damp: 0.5, tail: 6 }), L));
}

function bellWarden() {
  const r = rng(52);
  const bpm = 96;
  const beat = 60 / bpm;
  const bars = 16;
  const L = bars * 4 * beat;
  const data = buf(L + 5);
  drone(data, midi(38), 0.16, 300, 0.2);
  const riff = [38, 38, 39, 38, 41, 39, 38, 36];
  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * 4 * beat;
    drum(data, t0, 120, 45, 0.9);
    drum(data, t0 + 2 * beat, 120, 45, 0.7);
    drum(data, t0 + 2.75 * beat, 110, 45, 0.45);
    drum(data, t0 + 3.5 * beat, 160, 80, 0.4, 0.35); // tom
    for (let k = 0; k < 8; k++) pluck(data, t0 + k * 0.5 * beat, midi(riff[k] + (bar % 4 === 3 ? 1 : 0)), 0.32, r, 0.985);
    if (bar % 4 === 0) pad(data, t0, 4 * 4 * beat - 0.5, bar % 8 === 0 ? [50, 53, 56] : [49, 52, 55], 0.18, { cut: 1200, attack: 1.5, release: 1 });
    if (bar % 2 === 0) bell(data, t0, midi(38), 0.7, 6);
    noise(data, t0 + 1 * beat, 0.08, 0.15, r, { cut: 5000 });
    noise(data, t0 + 3 * beat, 0.08, 0.15, r, { cut: 5000 });
  }
  return normalize(fold(reverb(data, { size: 1.1, mix: 0.3, tail: 5 }), L));
}

// ---------------------------------------------------------------- ambience
function wind() {
  const r = rng(7);
  const L = 40;
  const data = buf(L);
  for (let i = 0; i < data.length; i++) data[i] = r() * 2 - 1;
  // Two layers of slowly moving band-limited noise: a low moan and a thin whistle.
  const moan = lowpass(Float32Array.from(data), (i) => 300 + 150 * Math.sin((TAU * i) / (SR * 13)) + 90 * Math.sin((TAU * i) / (SR * 5.3)));
  const whistle = highpass(lowpass(Float32Array.from(data), 1800), 900);
  for (let i = 0; i < data.length; i++) {
    const gust = 0.55 + 0.45 * Math.sin((TAU * i) / (SR * 10)) ** 2;
    data[i] = moan[i] * 1.4 * gust + whistle[i] * 0.25 * gust * gust;
  }
  return normalize(fold(data, L), 0.7);
}

function drips() {
  const r = rng(99);
  const L = 36;
  const data = buf(L + 4);
  // Low cave rumble.
  const rumble = buf(L + 4);
  for (let i = 0; i < rumble.length; i++) rumble[i] = r() * 2 - 1;
  lowpass(lowpass(rumble, 90), 90);
  for (let i = 0; i < data.length; i++) data[i] += rumble[i] * 2.5;
  // Water drops: a quick falling blip.
  for (let t = 0.4; t < L; t += 0.6 + r() * 2.4) {
    const s0 = Math.round(t * SR);
    const f = 900 + r() * 1400;
    let ph = 0;
    for (let i = 0; i < 0.12 * SR; i++) {
      const tt = i / SR;
      ph += (f * (1 + 1.5 * Math.exp(-tt * 40))) / SR;
      data[s0 + i] += Math.sin(TAU * ph) * Math.exp(-tt * 35) * (0.15 + r() * 0.15);
    }
  }
  return normalize(fold(reverb(data, { size: 2.2, mix: 0.55, damp: 0.3, tail: 4 }), L), 0.7);
}

// ---------------------------------------------------------------- one-shot sounds
function toll() {
  const data = buf(8);
  bell(data, 0, midi(36), 1.0, 7.5);
  drum(data, 0, 80, 40, 0.5, 1.2);
  return normalize(reverb(data, { size: 1.6, mix: 0.45, tail: 2 }).slice(0, 9 * SR), 0.9);
}

const SKILLS = {
  grave_roar: (r) => {
    const d = buf(1.4);
    noise(d, 0, 1.2, 0.8, r, { cut: 500, attack: 0.05, shape: 'swell' });
    drum(d, 0, 90, 40, 0.8, 0.8);
    return d;
  },
  sextons_whirl: (r) => {
    const d = buf(1.6);
    for (let k = 0; k < 6; k++) noise(d, k * 0.25, 0.25, 0.6, r, { cut: 2500 + k * 200, attack: 0.08, shape: 'swell' });
    return d;
  },
  ashen_ward: (r) => {
    const d = buf(1.5);
    noise(d, 0, 1.3, 0.5, r, { cut: 1200, attack: 0.3, shape: 'swell' });
    bell(d, 0.05, midi(62), 0.35, 1.4);
    return d;
  },
  cinder_rain: (r) => {
    const d = buf(2.0);
    for (let k = 0; k < 8; k++) {
      noise(d, k * 0.2, 0.35, 0.5, r, { cut: 1800 });
      drum(d, k * 0.2 + 0.05, 140, 60, 0.35, 0.3);
    }
    return d;
  },
  bone_caltrops: (r) => {
    const d = buf(1.0);
    for (let k = 0; k < 10; k++) pluck(d, k * 0.05 + r() * 0.03, 900 + r() * 1500, 0.25, r, 0.9);
    return d;
  },
  death_flurry: (r) => {
    const d = buf(1.2);
    for (let k = 0; k < 5; k++) noise(d, k * 0.12, 0.12, 0.7, r, { cut: 4500 });
    return d;
  },
};

// ---------------------------------------------------------------- write everything
writeWav(path.join(OUT, 'music', 'title.wav'), title());
writeWav(path.join(OUT, 'music', 'hollowmere.wav'), hollowmere());
writeWav(path.join(OUT, 'music', 'sunken_crypt.wav'), sunkenCrypt());
writeWav(path.join(OUT, 'music', 'bell_warden.wav'), bellWarden());
writeWav(path.join(OUT, 'ambience', 'wind.wav'), wind());
writeWav(path.join(OUT, 'ambience', 'drips.wav'), drips());
writeWav(path.join(OUT, 'sfx', 'toll.wav'), toll());
let seed = 2000;
for (const [id, make] of Object.entries(SKILLS)) {
  // Three takes per skill, like the recorded spell sounds (act_audio.gd picks a different one each cast).
  for (let take = 1; take <= 3; take++) {
    const r = rng(seed++);
    const d = normalize(reverb(make(r), { size: 0.8, mix: 0.25, tail: 0.6 }), 0.85);
    writeWav(path.join(OUT, 'spells', take === 1 ? `${id}.wav` : `${id}_${take}.wav`), d);
  }
}
