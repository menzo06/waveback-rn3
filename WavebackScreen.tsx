import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Image, ImageSourcePropType, LayoutChangeEvent,
  Pressable, StatusBar, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useWavebackAudio } from './audio/useWavebackAudio';
import { WB, WavebackTheme, tone } from './theme';
import { EraId, TIME_UP, TIME_DOWN, ALL_ERAS, rankOf } from './eras';
import { Song, SONGS, fmt } from './songs';
import { Playlist } from './playlists';
import EraChip from './components/EraChip';
import Disc from './components/Disc';
import SongSheet from './components/SongSheet';

const PROCESS_MS = 1700;

export interface WavebackScreenProps {
  theme?: WavebackTheme;
  spinSeconds?: number;
  songs?: Song[];
  cover?: ImageSourcePropType;
  grainTexture?: ImageSourcePropType; // optional tiling noise PNG
  initialEra?: EraId | null;
  onAddSong?: () => void; // wire to expo-document-picker in the app
}

export default function WavebackScreen({
  theme = 'espresso', spinSeconds = 7, songs = SONGS,
  cover, grainTexture, initialEra = null, onAddSong,
}: WavebackScreenProps) {
  const T = tone(theme);
  const [era, setEra] = useState<EraId | null>(initialEra);
  const [playing, setPlaying] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [t, setT] = useState(47);
  const [songIdx, setSongIdx] = useState(0);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ripple, setRipple] = useState(0);
  const [dir, setDir] = useState<'in' | 'out'>('in');
  const [trackW, setTrackW] = useState(0);
  const trackRef = useRef<View>(null);
  const procTimer = useRef<ReturnType<typeof setTimeout>>();
  const song = songs[songIdx];
  const dur = song.dur;
  const hasAudio = !!song.audio;
  const audio = useWavebackAudio(song.audio ?? null, song.karaokeAudio ?? null, song.mixedAudio ?? null);

  // Era chip → audio processing (TIME DOWN eras sound like their device; web only for now)
  useEffect(() => {
    audio.setEra(era);
  }, [era]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the player in sync with play/pause state (paused while "processing" an era jump)
  useEffect(() => {
    if (!hasAudio) return;
    if (playing && !processing) audio.play();
    else audio.pause();
  }, [playing, processing, hasAudio, songIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real playback position
  useEffect(() => {
    if (!hasAudio) return;
    if (Number.isFinite(audio.currentTime)) setT(Math.min(dur, audio.currentTime));
    if (audio.didJustFinish) setPlaying(false);
  }, [audio.currentTime, audio.didJustFinish, hasAudio, dur]);

  // Simulated playback clock for songs without an audio file
  useEffect(() => {
    if (!playing || processing || hasAudio) return;
    const iv = setInterval(() => setT(prev => {
      const nt = Math.min(dur, prev + 0.25);
      if (nt >= dur) setPlaying(false);
      return nt;
    }), 250);
    return () => clearInterval(iv);
  }, [playing, processing, dur, hasAudio]);
  useEffect(() => () => clearTimeout(procTimer.current), []);

  const pick = (id: EraId) => {
    if (id === 'MASTER' && era !== 'MASTER' && !song.mixedAudio) return; // MIXING only turns on for songs with a mix
    const next = era === id ? null : id;
    if (rankOf(next) === rankOf(era)) return;
    setDir(rankOf(next) < rankOf(era) ? 'out' : 'in'); // down in time → outward
    setEra(next);
    setProcessing(true);
    setRipple(n => n + 1);
    clearTimeout(procTimer.current);
    procTimer.current = setTimeout(() => setProcessing(false), PROCESS_MS);
  };

  const togglePlay = () => {
    if (!playing && t >= dur) { setT(0); if (hasAudio) audio.seekTo(0); }
    setPlaying(p => !p);
  };
  const pickSong = (i: number) => { setSongIdx(i); setT(0); setSheetOpen(false); };
  const activePlaylist = playlists.find(p => p.id === activePlaylistId);
  const queue = activePlaylist?.songIndexes.length ? activePlaylist.songIndexes : songs.map((_, index) => index);
  const skip = (d: number) => {
    const current = Math.max(0, queue.indexOf(songIdx));
    pickSong(queue[(current + d + queue.length) % queue.length]);
  };
  const createPlaylist = (name: string): string | null => {
    const cleanName = name.trim();
    if (!cleanName) return null;
    const playlist = { id: `${Date.now()}-${cleanName}`, name: cleanName, songIndexes: [] };
    setPlaylists(current => [...current, playlist]);
    setActivePlaylistId(playlist.id);
    return playlist.id;
  };
  const toggleSongInPlaylist = (playlistId: string, index: number) => {
    setPlaylists(current => current.map(playlist => {
      if (playlist.id !== playlistId) return playlist;
      const included = playlist.songIndexes.includes(index);
      return { ...playlist, songIndexes: included
        ? playlist.songIndexes.filter(songIndex => songIndex !== index)
        : [...playlist.songIndexes, index] };
    }));
  };

  const pillText = processing
    ? (era ? (dir === 'out' ? 'REWINDING…' : 'RESTORING…') : 'RETURNING…')
    : (era ? ALL_ERAS.find(e => e.id === era)!.pill : 'ORIGINAL · TODAY');
  const lit = processing || era !== null;
  const pct = t / dur;
  const beatMs = 60000 / (song.bpm ?? 112);

  const blink = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    if (!processing) return;
    let alive = true; // self-restarting: Animated.loop is one-shot on react-native-web
    const run = () => {
      Animated.sequence([
        Animated.timing(blink, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 0.25, duration: 400, useNativeDriver: true }),
      ]).start(({ finished }) => { if (alive && finished) run(); });
    };
    run();
    return () => { alive = false; blink.stopAnimation(); };
  }, [processing, blink]);

  const Hairline = useMemo(() => () => (
    <View className="flex-1 h-px" style={{ backgroundColor: T.track }} />
  ), [T.track]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: T.bg }}>
      <StatusBar barStyle={T.bar} />
      <View className="flex-1 pb-1">
        {/* Wordmark + song picker */}
        <View className="mt-2 items-center justify-center">
          <Text className="font-display text-[13.5px] text-center"
            style={{ color: T.ink, letterSpacing: 5.7 }}>WAVEBACK</Text>
          <Pressable
            onPress={() => setSheetOpen(true)}
            className="absolute right-[18px] w-10 h-10 rounded-full items-center justify-center"
            style={({ pressed }) => ({
              backgroundColor: T.plate, borderWidth: 1.5, borderColor: 'rgba(245,234,208,0.22)',
              transform: [{ scale: pressed ? 0.92 : 1 }],
            })}
            accessibilityRole="button"
            accessibilityLabel="Pick a song"
          >
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke={T.mut} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M5.6 12.6 V3.8 L13 2.4 V11.2" />
              <Circle cx={3.7} cy={12.6} r={1.9} fill={T.mut} stroke="none" />
              <Circle cx={11.1} cy={11.2} r={1.9} fill={T.mut} stroke="none" />
            </Svg>
          </Pressable>
        </View>

        {/* TIME UP */}
        <View className="flex-row items-center gap-3 mx-[30px] mt-[15px] mb-[11px]">
          <Hairline />
          <Text className="font-sansbold text-[8.5px]" style={{ color: T.dim, letterSpacing: 2.5 }}>TIME UP ↑</Text>
          <Hairline />
        </View>
        <View className="flex-row justify-center gap-3 px-4">
          {TIME_UP.map((e, i) => (
            <React.Fragment key={e.id}>
              {i > 0 && <View className="w-[106px]" /> /* keep the outer positions; the disc owns the middle */}
              <EraChip era={e} active={era === e.id} plate={T.plate} mut={T.mut} beatMs={beatMs} playing={playing} onPress={() => pick(e.id)} />
            </React.Fragment>
          ))}
        </View>

        {/* Player */}
        <View className="flex-1 items-center justify-center gap-[15px]">
          <Disc size={300} bg={T.bg} playing={playing} processing={processing} spinSeconds={spinSeconds}
            rippleKey={ripple} rippleDir={dir} cover={cover ?? song.cover} era={era} />

          <View className="items-center px-[30px]">
            <View className="items-center px-[30px] mb-[5px]">
              <Text className="font-display text-[18px] text-center" style={{ color: T.ink }}>{song.title}</Text>
              <Text className="font-sansbold text-[11.5px] mt-[2px]" style={{ color: T.mut, letterSpacing: 0.5 }}>{song.artist}</Text>
            </View>
            <View className="flex-row items-center" style={{ gap: 36 }}>
              <Pressable onPress={() => skip(-1)} className="p-[11px]"
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.88 : 1 }] })}
                accessibilityRole="button" accessibilityLabel="Previous song">
                <Svg width={22} height={22} viewBox="0 0 20 20">
                  <Rect x={4.6} y={4.6} width={2} height={10.8} rx={1} fill={T.mut} />
                  <Path d="M15.6 4.6 L8 10 L15.6 15.4 Z" fill={T.mut} />
                </Svg>
              </Pressable>
              <Pressable onPress={togglePlay} className="p-2"
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.9 : 1 }] })}
                accessibilityRole="button" accessibilityLabel={playing ? 'Pause' : 'Play'}>
                <Svg width={32} height={32} viewBox="0 0 20 20">
                  {playing ? (
                    <>
                      <Rect x={5.6} y={4.6} width={3.1} height={10.8} rx={1} fill={T.ink} />
                      <Rect x={11.3} y={4.6} width={3.1} height={10.8} rx={1} fill={T.ink} />
                    </>
                  ) : (
                    <Path d="M7.2 4.6 L15.4 10 L7.2 15.4 Z" fill={T.ink} />
                  )}
                </Svg>
              </Pressable>
              <Pressable onPress={() => skip(1)} className="p-[11px]"
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.88 : 1 }] })}
                accessibilityRole="button" accessibilityLabel="Next song">
                <Svg width={22} height={22} viewBox="0 0 20 20">
                  <Rect x={13.4} y={4.6} width={2} height={10.8} rx={1} fill={T.mut} />
                  <Path d="M4.4 4.6 L12 10 L4.4 15.4 Z" fill={T.mut} />
                </Svg>
              </Pressable>
            </View>
            <View className="flex-row items-center gap-[7px] mt-[9px] px-[13px] py-[5px] rounded-full border"
              style={{ borderColor: lit ? 'rgba(233,162,59,0.4)' : T.track }}>
              {processing && (
                <Animated.View className="w-[5px] h-[5px] rounded-full"
                  style={{ backgroundColor: WB.amber, opacity: blink }} />
              )}
              <Text className="font-sansbold text-[8.5px]"
                style={{ color: lit ? WB.amber : T.mut, letterSpacing: 2.2 }}>{pillText}</Text>
            </View>
          </View>
        </View>

        {/* Timeline groove */}
        <View className="px-10 mt-[6px]">
          <Pressable ref={trackRef} className="h-6 justify-center"
            onLayout={(e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width)}
            onPress={e => {
              const pageX = e.nativeEvent.pageX; // locationX is unreliable on web
              trackRef.current?.measureInWindow((wx, _wy, w) => {
                if (!w || !Number.isFinite(pageX)) return;
                const nt = Math.max(0, Math.min(1, (pageX - wx) / w)) * dur;
                setT(nt);
                if (hasAudio) audio.seekTo(nt);
              });
            }}
          >
            <View className="h-[5px] rounded-[3px]" style={{ backgroundColor: T.track }} />
            <View className="absolute h-[5px] rounded-l-[3px]"
              style={{ width: trackW * pct, backgroundColor: WB.amber,
                shadowColor: WB.amber, shadowOpacity: 0.4, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } }} />
            <View className="absolute w-3 h-3 rounded-full"
              style={{ left: Math.max(0, trackW * pct - 6), backgroundColor: T.dot,
                shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 }} />
          </Pressable>
          <View className="flex-row justify-between mt-px">
            <Text className="font-sansbold text-[9.5px]" style={{ color: T.mut, letterSpacing: 0.8 }}>{fmt(t)}</Text>
            <Text className="font-sansbold text-[9.5px]" style={{ color: T.mut, letterSpacing: 0.8 }}>{fmt(dur)}</Text>
          </View>
        </View>

        {/* TIME DOWN */}
        <View className="flex-row justify-center gap-3 px-4 mt-3">
          {TIME_DOWN.map(e => (
            <EraChip key={e.id} era={e} active={era === e.id} plate={T.plate} mut={T.mut} beatMs={beatMs} playing={playing} onPress={() => pick(e.id)} />
          ))}
        </View>
        <View className="flex-row items-center gap-3 mx-[30px] mt-[11px]">
          <Hairline />
          <Text className="font-sansbold text-[8.5px]" style={{ color: T.dim, letterSpacing: 2.5 }}>TIME DOWN ↓</Text>
          <Hairline />
        </View>
      </View>

      {grainTexture && (
        <Image source={grainTexture} resizeMode="repeat" pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: T.grain }} />
      )}

      <SongSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}
        songs={songs} songIdx={songIdx} onPick={pickSong} onAddSong={onAddSong}
        playlists={playlists} activePlaylistId={activePlaylistId}
        onSelectPlaylist={setActivePlaylistId} onCreatePlaylist={createPlaylist}
        onToggleSongInPlaylist={toggleSongInPlaylist}
        theme={theme} T={T} />
    </SafeAreaView>
  );
}

// Re-exports for convenience / backward compatibility
export { WB, tone } from './theme';
export type { WavebackTheme } from './theme';
export { SONGS } from './songs';
export type { Song } from './songs';
export type { EraId } from './eras';
