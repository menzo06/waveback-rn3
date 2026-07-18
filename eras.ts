export type EraId = 'CLEAN' | 'MASTER' | 'VINYL' | 'RADIO' | 'CASSETTE';

export interface EraDef { id: EraId; label: string; sub: string; pill: string; rank: number; }

export const TIME_UP: EraDef[] = [
  { id: 'CLEAN',  label: 'KARAOKE', sub: 'SING ALONG',  pill: 'KARAOKE · SING ALONG', rank: 1 },
  { id: 'MASTER', label: 'MIXING',  sub: 'AI RESTORED', pill: 'MIXING · AI RESTORED', rank: 2 },
];

export const TIME_DOWN: EraDef[] = [
  { id: 'VINYL',    label: 'VINYL',    sub: '1950S', pill: 'VINYL · 1950S',    rank: -3 },
  { id: 'RADIO',    label: 'AM RADIO', sub: '1960S', pill: 'AM RADIO · 1960S', rank: -2 },
  { id: 'CASSETTE', label: 'CASSETTE', sub: '1970S', pill: 'CASSETTE · 1970S', rank: -1 },
];

export const ALL_ERAS = [...TIME_UP, ...TIME_DOWN];
export const rankOf = (id: EraId | null): number => (id ? ALL_ERAS.find(e => e.id === id)!.rank : 0);
