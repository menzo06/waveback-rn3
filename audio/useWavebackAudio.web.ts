import { useEffect, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
import type { EraId } from '../eras';
import type { WavebackAudioApi } from './types';

/**
 * Web playback engine with era "device" simulation, built on the Web Audio API.
 *
 * Each TIME DOWN era routes the song through a chain modelled on period hardware:
 *
 * VINYL · 1950s — console phonograph: mono (stereo LPs arrive only in 1958),
 *   tube-amp warmth (soft tanh saturation, +2.5 dB low-mid bump), speaker band
 *   ~70 Hz–8 kHz, slow wow ≈0.24% peak (typical decks measured 0.2–0.5%;
 *   0.2% is roughly the audibility threshold), dust crackle + occasional pops.
 *
 * RADIO · 1960s — pocket transistor radio: broadcast limiter (AM stations
 *   compressed hard for loudness), transmission capped ≈5 kHz, then a tiny
 *   high-resonance speaker leaves ~300 Hz–3.4 kHz with a honky presence peak
 *   ("tinny" sound), mono, light atmospheric static, a little grit.
 *
 * CASSETTE · 1970s — Type I ferric tape on an early deck: stereo (its tell),
 *   audible tape hiss (the artifact Dolby B was invented to fight), highs
 *   shelved off above ~7.5 kHz, gentle tape squash/saturation, wow ≈0.14%
 *   plus fast flutter "shimmer" ≈0.12%.
 *
 * CLEAN / MASTER / ULTRA and no era play the file untouched (flat chain).
 */

type EraKey = 'flat' | 'vinyl' | 'radio' | 'cassette';

const ERA_TO_KEY: Partial<Record<EraId, EraKey>> = {
  VINYL: 'vinyl',
  RADIO: 'radio',
  CASSETTE: 'cassette',
};

interface NoiseLoop { start(): void; stop(): void; }
interface Chain { input: AudioNode; noise: NoiseLoop | null; }

class EraEngine {
  ctx: AudioContext;
  private master: GainNode;
  analyser: AnalyserNode; // exposed for debugging/verification
  private bus: GainNode;  // sources always connect here; bus feeds the active chain
  private chains: Record<EraKey, Chain>;
  active: EraKey = 'flat';

  private buffer: AudioBuffer | null = null;
  private src: AudioBufferSourceNode | null = null;
  private offset = 0;
  private startedAt = 0;
  playing = false;
  private finished = false;
  private pendingPlay = false;
  private loadToken = 0;
  onFinish?: () => void;

  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 4096;
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.bus = this.ctx.createGain();
    this.chains = {
      flat: this.buildFlat(),
      vinyl: this.buildVinyl(),
      radio: this.buildRadio(),
      cassette: this.buildCassette(),
    };
    this.bus.connect(this.chains.flat.input);
  }

  // ---- node helpers -------------------------------------------------------

  private biquad(type: BiquadFilterType, freq: number, q = 0.707, gain = 0): BiquadFilterNode {
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q; f.gain.value = gain;
    return f;
  }

  private shaper(k: number): WaveShaperNode {
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    const ws = this.ctx.createWaveShaper();
    ws.curve = curve; ws.oversample = '2x';
    return ws;
  }

  private mono(): GainNode {
    const g = this.ctx.createGain();
    g.channelCount = 1; g.channelCountMode = 'explicit'; g.channelInterpretation = 'speakers';
    return g;
  }

  // Pitch instability: a short delay whose time is wiggled by sine LFOs.
  // Peak pitch deviation per LFO ≈ depth × 2π × rate.
  private wobble(base: number, lfos: Array<[rate: number, depth: number]>): DelayNode {
    const d = this.ctx.createDelay(0.1);
    d.delayTime.value = base;
    for (const [rate, depth] of lfos) {
      const osc = this.ctx.createOscillator();
      osc.frequency.value = rate;
      const g = this.ctx.createGain();
      g.gain.value = depth;
      osc.connect(g); g.connect(d.delayTime); osc.start();
    }
    return d;
  }

  private compressor(threshold: number, knee: number, ratio: number, attack: number, release: number): DynamicsCompressorNode {
    const c = this.ctx.createDynamicsCompressor();
    c.threshold.value = threshold; c.knee.value = knee; c.ratio.value = ratio;
    c.attack.value = attack; c.release.value = release;
    return c;
  }

  private loopNoise(get: () => AudioBuffer, dest: AudioNode): NoiseLoop {
    let src: AudioBufferSourceNode | null = null;
    return {
      start: () => {
        if (src) return;
        src = this.ctx.createBufferSource();
        src.buffer = get(); src.loop = true;
        src.connect(dest); src.start();
      },
      stop: () => {
        if (!src) return;
        try { src.stop(); } catch {}
        src.disconnect(); src = null;
      },
    };
  }

  // ---- generated noise beds (6 s loops) -----------------------------------

  private vinylNoiseBuf: AudioBuffer | null = null;
  private makeVinylNoise(): AudioBuffer {
    if (this.vinylNoiseBuf) return this.vinylNoiseBuf;
    const sr = this.ctx.sampleRate, len = sr * 6;
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    let lp = 0;
    for (let i = 0; i < len; i++) { // dark hiss bed under the crackle
      const w = Math.random() * 2 - 1;
      lp = lp * 0.96 + w * 0.04;
      d[i] = lp * 1.2 + w * 0.02;
    }
    for (let c = 0; c < 2400; c++) { // fine dust crackle
      const at = Math.floor(Math.random() * (len - 64));
      const amp = Math.pow(Math.random(), 2.5) * 0.9;
      const decay = 4 + Math.random() * 20;
      for (let j = 0; j < 40; j++) d[at + j] += (Math.random() * 2 - 1) * amp * Math.exp(-j / decay);
    }
    for (let p = 0; p < 11; p++) { // proper pops, roughly two per second
      const at = Math.floor(Math.random() * (len - 512));
      const amp = 0.9 + Math.random() * 0.6;
      for (let j = 0; j < 300; j++) d[at + j] += Math.sin(j / 6) * amp * Math.exp(-j / 40);
    }
    return (this.vinylNoiseBuf = buf);
  }

  private staticNoiseBuf: AudioBuffer | null = null;
  private makeStaticNoise(): AudioBuffer {
    if (this.staticNoiseBuf) return this.staticNoiseBuf;
    const sr = this.ctx.sampleRate, len = sr * 6;
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.25;
    for (let b = 0; b < 10; b++) { // brief atmospheric bursts
      const at = Math.floor(Math.random() * (len - 2048));
      const span = 400 + Math.floor(Math.random() * 1400);
      for (let j = 0; j < span; j++) {
        const env = Math.sin((j / span) * Math.PI);
        d[at + j] += (Math.random() * 2 - 1) * env * 0.9;
      }
    }
    return (this.staticNoiseBuf = buf);
  }

  private hissNoiseBuf: AudioBuffer | null = null;
  private makeHissNoise(): AudioBuffer {
    if (this.hissNoiseBuf) return this.hissNoiseBuf;
    const sr = this.ctx.sampleRate, len = sr * 6;
    const buf = this.ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
    }
    return (this.hissNoiseBuf = buf);
  }

  // ---- era chains ---------------------------------------------------------

  private buildFlat(): Chain {
    const g = this.ctx.createGain();
    g.connect(this.master);
    return { input: g, noise: null };
  }

  private buildVinyl(): Chain {
    const monoIn = this.mono();
    const wow = this.wobble(0.012, [[0.55, 0.002]]); // ≈0.7% peak — warped-record sway
    const tube = this.shaper(3);
    const warm = this.biquad('peaking', 300, 0.8, 5);
    const hp = this.biquad('highpass', 120, 0.7);
    const lp1 = this.biquad('lowpass', 4500, 0.8); // very dark 1950s console top end
    const lp2 = this.biquad('lowpass', 5200, 0.6);
    const out = this.ctx.createGain(); out.gain.value = 0.55;
    monoIn.connect(wow); wow.connect(tube); tube.connect(warm); warm.connect(hp);
    hp.connect(lp1); lp1.connect(lp2); lp2.connect(out); out.connect(this.master);
    // Crackle enters before the speaker filters so it is voiced like the music.
    const noiseGain = this.ctx.createGain(); noiseGain.gain.value = 0.22;
    noiseGain.connect(hp);
    return { input: monoIn, noise: this.loopNoise(() => this.makeVinylNoise(), noiseGain) };
  }

  private buildRadio(): Chain {
    const monoIn = this.mono();
    const limiter = this.compressor(-30, 8, 8, 0.003, 0.15); // station loudness limiter
    const grit = this.shaper(3);
    const honk = this.biquad('peaking', 1700, 1.1, 4); // small-speaker resonance
    const hp1 = this.biquad('highpass', 250, 0.8);
    const hp2 = this.biquad('highpass', 320, 0.6);
    const lp1 = this.biquad('lowpass', 3400, 0.9);
    const lp2 = this.biquad('lowpass', 3000, 0.6);
    const out = this.ctx.createGain(); out.gain.value = 0.32;
    monoIn.connect(limiter); limiter.connect(grit); grit.connect(honk);
    honk.connect(hp1); hp1.connect(hp2); hp2.connect(lp1); lp1.connect(lp2);
    lp2.connect(out); out.connect(this.master);
    const noiseGain = this.ctx.createGain(); noiseGain.gain.value = 0.03;
    noiseGain.connect(hp1); // static is band-limited by the same speaker
    return { input: monoIn, noise: this.loopNoise(() => this.makeStaticNoise(), noiseGain) };
  }

  private buildCassette(): Chain {
    const input = this.ctx.createGain(); // stays stereo — cassette's tell
    // Slow wow plus two fast flutter rates — the audible tape "shimmer".
    const wowFlutter = this.wobble(0.01, [[0.5, 0.0006], [6.3, 0.00015], [8.1, 0.00006]]);
    const tape = this.shaper(1.6);
    const squash = this.compressor(-32, 8, 5, 0.005, 0.15);
    const hp = this.biquad('highpass', 45, 0.7);
    const shelf = this.biquad('highshelf', 5800, 0.707, -8);
    const lp = this.biquad('lowpass', 7600, 0.7); // duller than flat, brighter than vinyl
    const out = this.ctx.createGain(); out.gain.value = 0.6;
    input.connect(wowFlutter); wowFlutter.connect(tape); tape.connect(squash);
    squash.connect(hp); hp.connect(shelf); shelf.connect(lp); lp.connect(out);
    out.connect(this.master);
    // Worn-tape azimuth drift: the high shelf slowly "breathes" ±4.5 dB.
    const azimuth = this.ctx.createOscillator(); azimuth.frequency.value = 0.27;
    const azDepth = this.ctx.createGain(); azDepth.gain.value = 4.5;
    azimuth.connect(azDepth); azDepth.connect(shelf.gain); azimuth.start();
    // Worn-transport level wobble: overall volume gently pumps ±2 dB.
    const sag = this.ctx.createOscillator(); sag.frequency.value = 0.35;
    const sagDepth = this.ctx.createGain(); sagDepth.gain.value = 0.13;
    sag.connect(sagDepth); sagDepth.connect(out.gain); sag.start();
    // Hiss lives in the 3–10 kHz band, above the programme's shelved highs.
    const hissColor = this.biquad('highpass', 3000, 0.7);
    const noiseGain = this.ctx.createGain(); noiseGain.gain.value = 0.24;
    noiseGain.connect(hissColor); hissColor.connect(lp);
    return { input, noise: this.loopNoise(() => this.makeHissNoise(), noiseGain) };
  }

  // ---- transport ----------------------------------------------------------

  async load(source: number): Promise<void> {
    const token = ++this.loadToken;
    this.stopSrc();
    this.playing = false;
    this.buffer = null; this.offset = 0; this.finished = false;
    try {
      const asset = Asset.fromModule(source);
      const res = await fetch(asset.uri);
      const ab = await res.arrayBuffer();
      const buf = await this.ctx.decodeAudioData(ab);
      if (token !== this.loadToken) return;
      this.buffer = buf;
      if (this.pendingPlay) { this.pendingPlay = false; this.play(); }
    } catch (err) {
      if (token === this.loadToken) console.warn('[waveback] failed to load audio', err);
    }
  }

  play(): void {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (!this.buffer) { this.pendingPlay = true; return; }
    if (this.playing) return;
    if (this.finished || this.offset >= this.buffer.duration) { this.offset = 0; this.finished = false; }
    this.start();
  }

  pause(): void {
    this.pendingPlay = false;
    if (!this.playing) return;
    this.offset = Math.min(this.now(), this.buffer?.duration ?? this.offset);
    this.playing = false;
    this.stopSrc();
  }

  seekTo(seconds: number): void {
    const dur = this.buffer?.duration;
    this.offset = Math.max(0, dur ? Math.min(seconds, dur - 0.05) : seconds);
    this.finished = false;
    if (this.playing) { this.stopSrc(); this.start(); }
  }

  setEra(era: EraId | null): void {
    const key: EraKey = (era && ERA_TO_KEY[era]) || 'flat';
    if (key === this.active) return;
    this.chains[this.active].noise?.stop();
    this.bus.disconnect();
    this.active = key;
    this.bus.connect(this.chains[key].input);
    if (this.playing) this.chains[key].noise?.start();
  }

  now(): number {
    if (!this.playing) return this.offset;
    const t = this.offset + (this.ctx.currentTime - this.startedAt);
    return this.buffer ? Math.min(t, this.buffer.duration) : t;
  }

  private start(): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer!;
    src.connect(this.bus);
    src.onended = () => {
      if (this.src !== src) return; // superseded by pause/seek/load
      this.src = null;
      this.playing = false;
      this.offset = this.buffer?.duration ?? this.offset;
      this.finished = true;
      this.chains[this.active].noise?.stop();
      this.onFinish?.();
    };
    src.start(0, Math.min(this.offset, this.buffer!.duration));
    this.src = src;
    this.startedAt = this.ctx.currentTime;
    this.playing = true;
    this.chains[this.active].noise?.start();
  }

  private stopSrc(): void {
    const s = this.src;
    this.src = null; // clear first so onended knows it was manual
    if (s) {
      try { s.stop(); } catch {}
      s.disconnect();
    }
    this.chains[this.active].noise?.stop();
  }
}

let engine: EraEngine | null = null;
const getEngine = (): EraEngine => {
  if (!engine) {
    engine = new EraEngine();
    (window as any).__wbAudio = engine; // debug/verification handle
  }
  return engine;
};

export function useWavebackAudio(source: number | null): WavebackAudioApi {
  const [currentTime, setCurrentTime] = useState(0);
  const [didJustFinish, setDidJustFinish] = useState(false);
  const eng = useRef<EraEngine | undefined>(undefined);
  eng.current ??= getEngine();

  useEffect(() => {
    if (source != null) void eng.current!.load(source);
    else eng.current!.pause();
  }, [source]);

  useEffect(() => {
    const e = eng.current!;
    e.onFinish = () => setDidJustFinish(true);
    const iv = setInterval(() => setCurrentTime(e.now()), 250);
    return () => { clearInterval(iv); e.onFinish = undefined; };
  }, []);

  return {
    play: () => { setDidJustFinish(false); eng.current!.play(); },
    pause: () => eng.current!.pause(),
    seekTo: s => { setDidJustFinish(false); eng.current!.seekTo(s); setCurrentTime(s); },
    setEra: era => eng.current!.setEra(era),
    currentTime,
    didJustFinish,
  };
}
