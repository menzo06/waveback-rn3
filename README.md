# Waveback

A React Native music-player concept built with Expo, TypeScript, and NativeWind.

## Run on macOS

```bash
npm install
npx expo start
```

Press `i` for iOS, `a` for Android, or `w` for web.

## Run on Windows

```powershell
npm.cmd install
npx.cmd expo start
```

Press `a` for Android or `w` for web. Scan the QR code with Expo Go to use a phone.

## Project structure

- `App.tsx` — app entry and font loading.
- `WavebackScreen.tsx` — main player screen and state.
- `components/` — disc, era selector, icons, and song picker.
- `songs.ts` / `eras.ts` / `theme.ts` — app data and design tokens.

## Notes

- Playback is currently simulated; no audio file is played yet.
- The song picker supports search. Connect `onAddSong` to add audio imports.
