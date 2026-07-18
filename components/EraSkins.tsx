import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { WB } from '../theme';

// Point on a circle centred at (cx,cy); 0° = 12 o'clock, clockwise
const pt = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

// ---------------------------------------------------------------- VINYL 1950s

// Deterministic golden-angle scatter so the dust looks random but stable
const DUST = Array.from({ length: 30 }, (_, i) => {
  const a = i * 2.39996;
  const r = 80 + ((i * 53) % 86);
  return {
    x: 170 + r * Math.cos(a), y: 170 + r * Math.sin(a),
    s: 0.7 + ((i * 29) % 10) / 9, o: 0.18 + ((i * 17) % 10) / 40,
  };
});
const GROOVES = Array.from({ length: 14 }, (_, i) => 80 + i * 6.4);

// Rotates with the record: sepia wash, micro-grooves, dust flecks
export function VinylRotating({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 340 340" style={{ position: 'absolute' }}>
      <Circle cx={170} cy={170} r={170} fill="rgba(40,26,14,0.55)" />
      <Circle cx={170} cy={170} r={170} fill="rgba(233,162,59,0.06)" />
      {GROOVES.map(r => (
        <Circle key={r} cx={170} cy={170} r={r} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={1} />
      ))}
      {DUST.map((d, i) => (
        <Circle key={i} cx={d.x} cy={d.y} r={d.s} fill={`rgba(245,234,208,${d.o})`} />
      ))}
    </Svg>
  );
}

// Fixed light reflection — stays put while the record turns under it
export function VinylSheen({ size }: { size: number }) {
  const wedge = (a1: number, a2: number) => {
    const o1 = pt(170, 170, 168, a1), o2 = pt(170, 170, 168, a2);
    const i2 = pt(170, 170, 76, a2), i1 = pt(170, 170, 76, a1);
    return `M${o1.x},${o1.y} A168,168 0 0 1 ${o2.x},${o2.y} L${i2.x},${i2.y} A76,76 0 0 0 ${i1.x},${i1.y} Z`;
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 340 340" style={{ position: 'absolute' }} pointerEvents="none">
      <Path d={wedge(18, 52)} fill="rgba(245,234,208,0.05)" />
      <Path d={wedge(198, 232)} fill="rgba(245,234,208,0.05)" />
    </Svg>
  );
}

// ------------------------------------------------------------- AM RADIO 1960s

const TICKS = Array.from({ length: 33 }, (_, i) => -130 + i * 8.125);
const FREQS = [54, 70, 90, 110, 130, 160]; // kc ÷ 10, like real AM dials

// Fixed tuning dial over the label; needle drifts gently while playing
export function RadioDial({ size, playing }: { size: number; playing: boolean }) {
  const dial = size * (152 / 340);
  const wob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!playing) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(wob, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(wob, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [playing, wob]);
  const rot = wob.interpolate({ inputRange: [0, 1], outputRange: ['31deg', '39deg'] });

  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
      <View style={{ width: dial, height: dial }}>
        <Svg width={dial} height={dial} viewBox="0 0 160 160" style={{ position: 'absolute' }}>
          {/* Smoked-glass face — the cover art keeps turning underneath */}
          <Circle cx={80} cy={80} r={78} fill="rgba(16,10,7,0.58)" stroke="rgba(233,162,59,0.45)" strokeWidth={2} />
          <Circle cx={80} cy={80} r={71} fill="none" stroke="rgba(245,234,208,0.1)" strokeWidth={1} />
          {TICKS.map((deg, i) => {
            const major = i % 4 === 0;
            const o = pt(80, 80, 68, deg), n = pt(80, 80, major ? 59 : 63, deg);
            return (
              <Line key={deg} x1={o.x} y1={o.y} x2={n.x} y2={n.y}
                stroke={`rgba(245,234,208,${major ? 0.85 : 0.42})`} strokeWidth={major ? 1.6 : 1} />
            );
          })}
          {FREQS.map((f, i) => {
            const p = pt(80, 80, 47, -125 + i * 50);
            return (
              <SvgText key={f} x={p.x} y={p.y + 3} fontSize={9.5} fill="rgba(245,234,208,0.9)"
                textAnchor="middle" letterSpacing={0.5}>{f}</SvgText>
            );
          })}
          <SvgText x={80} y={107} fontSize={6.5} fill="rgba(233,162,59,0.9)" textAnchor="middle"
            letterSpacing={2.4}>AM · KC</SvgText>
        </Svg>
        <Animated.View style={{ position: 'absolute', width: dial, height: dial, transform: [{ rotate: rot }] }}>
          <Svg width={dial} height={dial} viewBox="0 0 160 160">
            <Line x1={80} y1={80} x2={80} y2={17} stroke={WB.brick} strokeWidth={2.5} strokeLinecap="round" />
            <Line x1={80} y1={80} x2={80} y2={93} stroke={WB.brick} strokeWidth={4} strokeLinecap="round" />
            <Circle cx={80} cy={80} r={5} fill={WB.amber} />
            <Circle cx={80} cy={80} r={1.8} fill={WB.espresso} />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

// ------------------------------------------------------------- CASSETTE 1970s

function Reel({ unit, cx, cy, duration, playing }: {
  unit: number; cx: number; cy: number; duration: number; playing: boolean;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!playing) return;
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => { loop.stop(); spin.setValue(0); };
  }, [playing, duration, spin]);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const box = 26 * unit;
  return (
    <Animated.View style={{
      position: 'absolute', left: (cx - 13) * unit, top: (cy - 13) * unit,
      width: box, height: box, transform: [{ rotate: rot }],
    }}>
      <Svg width={box} height={box} viewBox="0 0 26 26">
        <Circle cx={13} cy={13} r={10} fill="#2A1D12" stroke="rgba(245,234,208,0.5)" strokeWidth={1.5} />
        {[0, 60, 120].map(deg => {
          const a = pt(13, 13, 7.5, deg), b = pt(13, 13, 7.5, deg + 180);
          return <Line key={deg} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(245,234,208,0.55)" strokeWidth={2} />;
        })}
        <Circle cx={13} cy={13} r={2.4} fill="rgba(245,234,208,0.6)" />
      </Svg>
    </Animated.View>
  );
}

// Fixed reel window over the label — sized to sit inside the round cover,
// so the artwork stays visible above and below the tape band
export function CassetteReels({ size, playing }: { size: number; playing: boolean }) {
  const unit = size / 340;
  const box = 148 * unit; // matches the label circle
  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
      <View style={{ width: box, height: box }}>
        <Svg width={box} height={box} viewBox="0 0 148 148" style={{ position: 'absolute' }}>
          <Circle cx={74} cy={74} r={74} fill="rgba(15,10,7,0.28)" />
          <Rect x={14} y={49} width={120} height={50} rx={25}
            fill="rgba(16,10,7,0.85)" stroke="rgba(245,234,208,0.24)" strokeWidth={1.5} />
          {/* tape pancakes — fat feed reel, thin take-up */}
          <Circle cx={44} cy={74} r={16.5} fill="#140D08" stroke="rgba(233,162,59,0.2)" strokeWidth={1} />
          <Circle cx={104} cy={74} r={12} fill="#140D08" stroke="rgba(233,162,59,0.2)" strokeWidth={1} />
          {/* tape run between the reels */}
          <Line x1={44} y1={92} x2={104} y2={92} stroke="#0E0906" strokeWidth={2.5} />
          <Circle cx={44} cy={91} r={2.5} fill="#2A1D12" stroke="rgba(245,234,208,0.35)" strokeWidth={0.8} />
          <Circle cx={104} cy={91} r={2.5} fill="#2A1D12" stroke="rgba(245,234,208,0.35)" strokeWidth={0.8} />
        </Svg>
        <Reel unit={unit} cx={44} cy={74} duration={1800} playing={playing} />
        <Reel unit={unit} cx={104} cy={74} duration={2600} playing={playing} />
      </View>
    </View>
  );
}
