export interface Playlist {
  id: string;
  name: string;
  /** Indexes into the current song library. */
  songIndexes: number[];
}
