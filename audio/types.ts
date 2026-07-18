import type { EraId } from '../eras';

export interface WavebackAudioApi {
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  setEra(era: EraId | null): void;
  currentTime: number;
  didJustFinish: boolean;
}
