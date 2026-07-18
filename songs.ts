import { ImageSourcePropType } from 'react-native';

export interface Song { title: string; artist: string; dur: number; bpm?: number; cover?: ImageSourcePropType; audio?: number; karaokeAudio?: number; mixedAudio?: number; }

export const SONGS: Song[] = [
  { title: 'Hotel California', artist: 'Eagles', dur: 385, bpm: 74, cover: require('./assets/hotel-california.jpg'), audio: require('./assets/hotel-california.m4a'), karaokeAudio: require('./assets/hotel-california-karaoke.m4a') },
  { title: 'The Real Slim Shady', artist: 'Eminem', dur: 284, bpm: 104, cover: require('./assets/real-slim-shady.jpg'), audio: require('./assets/real-slim-shady.m4a'), karaokeAudio: require('./assets/real-slim-shady-karaoke.m4a') },
  { title: 'Blinding Lights', artist: 'The Weeknd', dur: 203, bpm: 171, cover: require('./assets/blinding-lights.jpg'), audio: require('./assets/blinding-lights.m4a'), karaokeAudio: require('./assets/blinding-lights-karaoke.m4a') },
  { title: "Ain't No Mountain High Enough", artist: 'Marvin Gaye & Tammi Terrell', dur: 152, bpm: 131, cover: require('./assets/aint-no-mountain.jpg'), audio: require('./assets/aint-no-mountain.m4a'), karaokeAudio: require('./assets/aint-no-mountain-karaoke.m4a'), mixedAudio: require('./assets/aint-no-mountain-mixed.m4a') },
];

export const fmt = (x: number) => `${Math.floor(x / 60)}:${`${Math.floor(x % 60)}`.padStart(2, '0')}`;
