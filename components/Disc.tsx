import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, ImageSourcePropType, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { WB } from '../theme';
import { EraId } from '../eras';
import { CassetteReels, RadioDial, VinylRotating, VinylSheen } from './EraSkins';

const RIPPLE_MS = 620;

// Groove rings, center outward: berry → brick → burnt → amber
const RINGS = [
  { r: 89,  w: 14, c: WB.berry },
  { r: 111, w: 14, c: WB.brick },
  { r: 133, w: 14, c: WB.burnt },
  { r: 156, w: 16, c: WB.amber },
];

export default function Disc({ size, bg, playing, processing, spinSeconds, rippleKey, rippleDir, cover, era, children }: {
  size: number; bg: string; playing: boolean; processing: boolean; spinSeconds: number;
  rippleKey: number; rippleDir: 'in' | 'out';
  cover?: ImageSourcePropType; era?: EraId | null; children?: React.ReactNode;
}) {
  // Rotation — resumes from current angle on play/pause
  const spin = useRef(new Animated.Value(0)).current;
  const angle = useRef(0);
  useEffect(() => {
    const sub = spin.addListener(({ value }) => { angle.current = value; });
    return () => spin.removeListener(sub);
  }, [spin]);
  useEffect(() => {
    if (!playing) return;
    const from = angle.current;
    spin.setValue(from);
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: from + 1, duration: spinSeconds * 1000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [playing, spinSeconds, spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Ripple — one-shot staggered scale pulse across the 4 rings (era change only)
  const ripples = useRef(RINGS.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (!rippleKey) return;
    ripples.forEach(v => v.setValue(0));
    const order = rippleDir === 'out' ? [...ripples] : [...ripples].reverse(); // out: inner→outer
    Animated.stagger(95, order.map(v =>
      Animated.timing(v, { toValue: 1, duration: RIPPLE_MS, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true })
    )).start();
  }, [rippleKey, rippleDir, ripples]);

  // Processing pulse on the outermost ring
  const pulse = useRef(new Animated.Value(0.12)).current;
  useEffect(() => {
    if (!processing) { pulse.setValue(0); return; }
    pulse.setValue(0.12);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.92, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.12, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [processing, pulse]);

  // Era skin cross-fade
  const skinFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    skinFade.setValue(0);
    Animated.timing(skinFade, { toValue: 1, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
  }, [era, skinFade]);
  const skinLayer = { position: 'absolute' as const, width: size, height: size, opacity: skinFade };
  const dimRings = era === 'RADIO' || era === 'CASSETTE';

  const coverSize = size * (148 / 340);
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate }] }}>
        {/* Disc base blends into the screen background */}
        <Svg width={size} height={size} viewBox="0 0 340 340" style={{ position: 'absolute' }}>
          <Circle cx={170} cy={170} r={170} fill={bg} />
        </Svg>
        {/* Groove rings — each in its own layer so it can ripple independently */}
        {RINGS.map((g, i) => (
          <Animated.View key={g.c} style={{
            position: 'absolute', width: size, height: size,
            transform: [{ scale: ripples[i].interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 1.045, 1] }) }],
          }}>
            <Svg width={size} height={size} viewBox="0 0 340 340">
              <Circle cx={170} cy={170} r={g.r} fill="none" stroke={g.c} strokeWidth={g.w} />
            </Svg>
          </Animated.View>
        ))}
        {processing && (
          <Animated.View style={{ position: 'absolute', width: size, height: size, opacity: pulse }}>
            <Svg width={size} height={size} viewBox="0 0 340 340">
              <Circle cx={170} cy={170} r={156} fill="none" stroke={WB.amber} strokeWidth={18} />
            </Svg>
          </Animated.View>
        )}
        {/* Era skin — rotating pieces */}
        {era === 'VINYL' && (
          <Animated.View style={skinLayer} pointerEvents="none">
            <VinylRotating size={size} />
          </Animated.View>
        )}
        {dimRings && (
          <Animated.View style={skinLayer} pointerEvents="none">
            <Svg width={size} height={size} viewBox="0 0 340 340">
              <Circle cx={170} cy={170} r={170}
                fill={era === 'RADIO' ? 'rgba(15,10,7,0.5)' : 'rgba(24,16,10,0.4)'} />
            </Svg>
          </Animated.View>
        )}
        {/* Cover art = record label — always visible; era skins overlay it */}
        <View className="absolute inset-0 items-center justify-center">
          <View className="rounded-full overflow-hidden items-center justify-center"
            style={{ width: coverSize, height: coverSize, backgroundColor: WB.plate }}>
            {cover ? (
              <Image source={cover} style={{ width: coverSize, height: coverSize }} resizeMode="cover" />
            ) : (
              <>
                <View className="absolute inset-[6px] rounded-full border border-dashed"
                  style={{ borderColor: 'rgba(245,234,208,0.25)' }} />
                <Text className="font-sansbold text-[8px]"
                  style={{ color: 'rgba(245,234,208,0.4)', letterSpacing: 1.6 }}>COVER ART</Text>
              </>
            )}
            {era === 'VINYL' && (
              <Animated.View className="absolute inset-0 rounded-full"
                style={{ backgroundColor: 'rgba(46,30,16,0.45)', opacity: skinFade }} pointerEvents="none" />
            )}
          </View>
        </View>
      </Animated.View>
      {/* Era skin — fixed pieces (don't rotate with the record) */}
      {era === 'VINYL' && (
        <Animated.View style={skinLayer} pointerEvents="none">
          <VinylSheen size={size} />
        </Animated.View>
      )}
      {era === 'RADIO' && (
        <Animated.View style={skinLayer} pointerEvents="none">
          <RadioDial size={size} playing={playing} />
        </Animated.View>
      )}
      {era === 'CASSETTE' && (
        <Animated.View style={skinLayer} pointerEvents="none">
          <CassetteReels size={size} playing={playing} />
        </Animated.View>
      )}
      {children /* non-rotating overlay */}
    </View>
  );
}
