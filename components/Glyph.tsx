import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { EraId } from '../eras';

// Era glyphs, tinted via `color`
export default function Glyph({ id, color }: { id: EraId; color: string }) {
  switch (id) {
    case 'CLEAN': return ( // handheld karaoke mic, angled
      <Svg width={22} height={22} viewBox="0 0 20 20" fill="none" stroke={color} strokeLinecap="round">
        <Circle cx={13.2} cy={6.8} r={4.2} strokeWidth={1.5} />
        <Path d="M9.8 5.4 L16.6 5.4" strokeWidth={1.1} />
        <Path d="M10.1 8.2 L16.3 8.2" strokeWidth={1.1} />
        <Path d="M10.1 9.9 L3.6 16.4" strokeWidth={2.8} />
      </Svg>);
    case 'MASTER': return ( // four-point star
      <Svg width={18} height={18} viewBox="0 0 18 18" fill={color}>
        <Path d="M9 0.9 Q10.2 7.8 17.1 9 Q10.2 10.2 9 17.1 Q7.8 10.2 0.9 9 Q7.8 7.8 9 0.9 Z" />
      </Svg>);
    case 'VINYL': return ( // record with orbit dot so rotation reads
      <Svg width={18} height={18} viewBox="0 0 18 18" fill="none" stroke={color}>
        <Circle cx={9} cy={9} r={6.8} strokeWidth={1.5} />
        <Circle cx={9} cy={9} r={2.9} strokeWidth={1.3} />
        <Circle cx={9} cy={9} r={0.9} fill={color} stroke="none" />
        <Circle cx={9} cy={4.8} r={0.75} fill={color} stroke="none" />
      </Svg>);
    case 'RADIO': return ( // transistor radio
      <Svg width={18} height={18} viewBox="0 0 18 18" fill="none" stroke={color} strokeLinecap="round">
        <Path d="M4.8 5.4 L8.6 1.6" strokeWidth={1.4} />
        <Rect x={1.6} y={5.4} width={14.8} height={9.4} rx={2} strokeWidth={1.5} />
        <Circle cx={6.1} cy={10.1} r={2.2} strokeWidth={1.3} />
        <Path d="M11.3 8.3h3.4" strokeWidth={1.3} /><Path d="M11.3 11.9h3.4" strokeWidth={1.3} />
      </Svg>);
    case 'CASSETTE': return (
      <Svg width={18} height={18} viewBox="0 0 18 18" fill="none" stroke={color}>
        <Rect x={1.4} y={4.6} width={15.2} height={9.2} rx={1.6} strokeWidth={1.5} />
        <Circle cx={6.3} cy={9.2} r={1.8} strokeWidth={1.2} />
        <Circle cx={11.7} cy={9.2} r={1.8} strokeWidth={1.2} />
        <Path d="M8.1 9.2h1.8" strokeWidth={1.2} />
      </Svg>);
  }
}
