import { useEffect } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { EraId } from '../eras';
import type { WavebackAudioApi } from './types';

// Native: plain expo-audio playback. Era colouring lives in useWavebackAudio.web.ts;
// bringing it to iOS/Android needs a DSP-capable library (e.g. react-native-audio-api).
export function useWavebackAudio(source: number | null): WavebackAudioApi {
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (source != null) player.replace(source);
    else player.pause();
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    play: () => player.play(),
    pause: () => player.pause(),
    seekTo: s => { player.seekTo(s); },
    setEra: (_era: EraId | null) => {},
    currentTime: Number.isFinite(status.currentTime) ? status.currentTime : 0,
    didJustFinish: !!status.didJustFinish,
  };
}
