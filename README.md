# Waveback

Waveback is a music player that lets listeners move one track through different playback eras — from clean digital sound to vinyl, AM radio, and cassette — while building personal playlists.

## Demo

For the full experience, run the web build:

1. Open the song picker from the music icon in the top-right corner.
2. Select **Hotel California** and press play.
3. Tap **VINYL**, **RADIO**, or **CASSETTE** to hear the era treatment and see the player transform.
4. In the song picker, create a playlist with `+ PLAYLIST`.
5. Use the `+` beside a song to add it, then open the playlist to play or remove tracks.

## Run on macOS

```bash
npm install
npx expo install expo-asset
npx expo start --web
```

## Run on Windows

```powershell
npm.cmd install
npx.cmd expo install expo-asset
npx.cmd expo start --web
```

## What it includes

- Web Audio playback with vinyl, radio, and cassette sound treatments.
- Animated era transitions, record skins, ripples, and transport controls.
- Searchable song picker with session-based playlists.
- Espresso and cream themes.
- Expo, React Native, TypeScript, NativeWind, and SVG.

## Current scope

- The featured demo track has real audio playback; the remaining library tracks use simulated playback.
- Era sound processing is implemented for the web build. Native playback uses the original audio.
- Playlists are intentionally session-only for the demo and reset when the app reloads.
