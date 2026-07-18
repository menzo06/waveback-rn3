import React, { useRef, useState } from 'react';
import { Dimensions, Image, Modal, PanResponder, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { WB, WavebackTheme, Tone } from '../theme';
import { Song, fmt } from '../songs';
import { Playlist } from '../playlists';

export default function SongSheet({
  visible, onClose, songs, songIdx, onPick, onAddSong, playlists, activePlaylistId,
  onSelectPlaylist, onCreatePlaylist, onToggleSongInPlaylist, theme, T,
}: {
  visible: boolean; onClose: () => void;
  songs: Song[]; songIdx: number; onPick: (i: number) => void;
  onAddSong?: () => void; // wire to expo-document-picker in the app
  playlists: Playlist[]; activePlaylistId: string | null;
  onSelectPlaylist: (id: string | null) => void;
  onCreatePlaylist: (name: string) => string | null;
  onToggleSongInPlaylist: (playlistId: string, songIndex: number) => void;
  theme: WavebackTheme; T: Tone;
}) {
  const [query, setQuery] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [showingAllSongs, setShowingAllSongs] = useState(true);
  const [pendingSong, setPendingSong] = useState<{ index: number; title: string } | null>(null);
  const minSheetHeight = 300;
  const maxSheetHeight = Math.round(Dimensions.get('window').height * 0.84);
  const [sheetHeight, setSheetHeight] = useState(Math.min(510, maxSheetHeight));
  const sheetHeightRef = useRef(sheetHeight);
  sheetHeightRef.current = sheetHeight;
  const dragStartHeight = useRef(sheetHeight);
  const sheetDrag = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 2,
    onPanResponderGrant: () => { dragStartHeight.current = sheetHeightRef.current; },
    onPanResponderMove: (_, gesture) => {
      const next = Math.round(dragStartHeight.current - gesture.dy);
      setSheetHeight(Math.max(minSheetHeight, Math.min(maxSheetHeight, next)));
    },
  })).current;
  const activePlaylist = playlists.find(playlist => playlist.id === activePlaylistId);
  const visibleSongs = songs.map((sg, i) => ({ sg, i }))
    .filter(({ i }) => showingAllSongs || !activePlaylist || activePlaylist.songIndexes.includes(i))
    .filter(({ sg }) => !query.trim() || `${sg.title} ${sg.artist}`.toLowerCase().includes(query.trim().toLowerCase()));
  const savePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const id = onCreatePlaylist(newPlaylistName);
    if (!id) return;
    setNewPlaylistName('');
    setCreatingPlaylist(false);
    setShowingAllSongs(false);
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1" style={{ backgroundColor: 'rgba(12,8,6,0.55)' }} onPress={onClose} />
      <View className="rounded-t-[28px] px-4 pt-[14px] pb-10"
        style={{ height: sheetHeight, backgroundColor: theme === 'cream' ? '#EFE3C6' : '#241A13' }}>
        <View {...sheetDrag.panHandlers} className="py-2 -mt-2 mb-1" accessibilityRole="adjustable" accessibilityLabel="Resize song sheet">
          <View className="w-9 h-1 rounded-full self-center" style={{ backgroundColor: T.track }} />
        </View>
        <Text className="font-display text-[11px] text-center mb-2.5" style={{ color: T.dim, letterSpacing: 3 }}>PICK A SONG</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3"
          style={{ flexGrow: 0, maxHeight: 38 }} contentContainerStyle={{ gap: 8, alignItems: 'center' }}
          keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => setShowingAllSongs(true)} className="px-3 py-2 rounded-full"
            style={{ backgroundColor: showingAllSongs ? WB.amber : T.plate }}>
            <Text className="font-sansbold text-[8px]" style={{ color: showingAllSongs ? WB.espresso : T.mut, letterSpacing: 1.3 }}>ALL SONGS</Text>
          </Pressable>
          {playlists.map(playlist => {
            const selected = playlist.id === activePlaylistId && !showingAllSongs;
            return <Pressable key={playlist.id} onPress={() => { onSelectPlaylist(playlist.id); setShowingAllSongs(false); }} className="px-3 py-2 rounded-full"
              style={{ backgroundColor: selected ? WB.amber : T.plate }}>
              <Text className="font-sansbold text-[8px]" style={{ color: selected ? WB.espresso : T.mut, letterSpacing: 1.3 }}>{playlist.name.toUpperCase()} · {playlist.songIndexes.length}</Text>
            </Pressable>;
          })}
          <Pressable onPress={() => setCreatingPlaylist(value => !value)} className="px-3 py-2 rounded-full border"
            style={{ borderColor: 'rgba(233,162,59,0.5)' }} accessibilityLabel="Create playlist">
            <Text className="font-sansbold text-[8px]" style={{ color: WB.amber, letterSpacing: 1.3 }}>+ PLAYLIST</Text>
          </Pressable>
        </ScrollView>
        {creatingPlaylist && (
          <View className="flex-row gap-2 mb-3">
            <TextInput value={newPlaylistName} onChangeText={setNewPlaylistName} placeholder="Playlist name"
              placeholderTextColor={T.dim} className="flex-1 h-10 rounded-full px-3.5 font-sans text-[13px]"
              style={{ color: T.ink, backgroundColor: theme === 'cream' ? 'rgba(28,20,16,0.08)' : 'rgba(245,234,208,0.08)' }} onSubmitEditing={savePlaylist} />
            <Pressable onPress={savePlaylist} className="px-4 justify-center rounded-full" style={{ backgroundColor: WB.amber }}>
              <Text className="font-sansbold text-[9px]" style={{ color: WB.espresso, letterSpacing: 1.1 }}>SAVE</Text>
            </Pressable>
          </View>
        )}
        <View className="flex-row items-center gap-2.5 mb-3">
          <View className="flex-1 flex-row items-center gap-2 h-10 rounded-full px-3.5"
            style={{ backgroundColor: theme === 'cream' ? 'rgba(28,20,16,0.08)' : 'rgba(245,234,208,0.08)' }}>
            <Svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke={T.mut} strokeWidth={1.6} strokeLinecap="round">
              <Circle cx={7} cy={7} r={4.6} /><Path d="M10.6 10.6 L14 14" />
            </Svg>
            <TextInput value={query} onChangeText={setQuery} placeholder="Search songs"
              placeholderTextColor={T.dim} className="flex-1 font-sans text-[13px] p-0"
              style={{ color: T.ink }} />
          </View>
          <Pressable onPress={onAddSong} accessibilityRole="button" accessibilityLabel="Add audio file"
            className="w-10 h-10 rounded-full items-center justify-center"
            style={({ pressed }) => ({ backgroundColor: T.plate, borderWidth: 1.5, borderColor: 'rgba(233,162,59,0.5)', transform: [{ scale: pressed ? 0.92 : 1 }] })}>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke={WB.amber} strokeWidth={1.8} strokeLinecap="round">
              <Path d="M8 2.5v11" /><Path d="M2.5 8h11" />
            </Svg>
          </Pressable>
        </View>
        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
        {visibleSongs.map(({ sg, i }) => {
          const sel = i === songIdx;
          const inPlaylist = !!activePlaylist?.songIndexes.includes(i);
          const canAdd = showingAllSongs;
          const canRemove = !showingAllSongs && activePlaylist;
          return (
            <Pressable key={sg.title} onPress={() => onPick(i)}
              className="flex-row items-center gap-3 px-2.5 py-[10px] rounded-2xl"
              style={{ backgroundColor: sel ? 'rgba(233,162,59,0.12)' : 'transparent' }}
              accessibilityRole="button" accessibilityState={{ selected: sel }}
            >
              <View className="w-[34px] h-[34px] rounded-full overflow-hidden"
                style={{ borderWidth: sel ? 2 : 1, borderColor: sel ? WB.amber : 'rgba(245,234,208,0.25)', backgroundColor: WB.espresso }}>
                {sg.cover && <Image source={sg.cover} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
              </View>
              <View className="flex-1">
                <Text className="font-display text-[13px]" style={{ color: theme === 'cream' ? WB.espresso : WB.cream }}>{sg.title}</Text>
                <Text className="font-sansbold text-[10.5px] mt-0.5" style={{ color: T.mut }}>{sg.artist}</Text>
              </View>
              {(canAdd || canRemove) && (
                <Pressable onPress={() => canAdd ? setPendingSong({ index: i, title: sg.title }) : onToggleSongInPlaylist(activePlaylist!.id, i)}
                  accessibilityRole="button" accessibilityLabel={`${canRemove ? 'Remove' : 'Add'} ${sg.title} ${canRemove ? 'from' : 'to'} playlist`}
                  className="w-7 h-7 rounded-full items-center justify-center mr-1"
                  style={{ backgroundColor: canRemove ? 'rgba(233,162,59,0.18)' : T.plate }}>
                  <Text className="font-sansbold text-[14px]" style={{ color: canRemove ? WB.amber : T.mut }}>{canRemove ? '−' : '+'}</Text>
                </Pressable>
              )}
              <Text className="font-sansbold text-[10px]" style={{ color: sel ? WB.amber : T.mut }}>{fmt(sg.dur)}</Text>
            </Pressable>
          );
        })}
        </ScrollView>
        {pendingSong && (
          <View className="mt-3 rounded-2xl p-3" style={{ backgroundColor: theme === 'cream' ? 'rgba(28,20,16,0.08)' : 'rgba(245,234,208,0.08)' }}>
            <Text className="font-sansbold text-[9px] mb-2" style={{ color: T.dim, letterSpacing: 1.5 }}>ADD “{pendingSong.title.toUpperCase()}” TO</Text>
            {playlists.map(playlist => {
              const alreadyAdded = playlist.songIndexes.includes(pendingSong.index);
              return (
                <Pressable key={playlist.id} disabled={alreadyAdded}
                  onPress={() => { onToggleSongInPlaylist(playlist.id, pendingSong.index); setPendingSong(null); }}
                  className="flex-row justify-between px-3 py-2 rounded-xl mb-1"
                  style={{ backgroundColor: T.plate, opacity: alreadyAdded ? 0.45 : 1 }}>
                  <Text className="font-sansbold text-[10px]" style={{ color: T.ink, letterSpacing: 0.8 }}>{playlist.name.toUpperCase()}</Text>
                  <Text className="font-sansbold text-[9px]" style={{ color: alreadyAdded ? T.mut : WB.amber }}>{alreadyAdded ? 'ADDED' : 'ADD'}</Text>
                </Pressable>
              );
            })}
            <View className="flex-row gap-2 mt-1">
              <TextInput value={newPlaylistName} onChangeText={setNewPlaylistName} placeholder="New playlist name"
                placeholderTextColor={T.dim} className="flex-1 h-9 rounded-full px-3 font-sans text-[12px]"
                style={{ color: T.ink, backgroundColor: T.plate }} />
              <Pressable onPress={() => {
                const id = onCreatePlaylist(newPlaylistName);
                if (!id) return;
                onToggleSongInPlaylist(id, pendingSong.index);
                setNewPlaylistName('');
                setPendingSong(null);
              }} className="px-3 justify-center rounded-full" style={{ backgroundColor: WB.amber }}>
                <Text className="font-sansbold text-[8px]" style={{ color: WB.espresso, letterSpacing: 1 }}>CREATE + ADD</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setPendingSong(null)} className="self-end mt-2 px-2 py-1">
              <Text className="font-sansbold text-[8px]" style={{ color: T.mut, letterSpacing: 1 }}>CANCEL</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}
