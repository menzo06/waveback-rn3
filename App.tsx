import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, YoungSerif_400Regular } from '@expo-google-fonts/young-serif';
import {
  NunitoSans_400Regular, NunitoSans_600SemiBold,
  NunitoSans_700Bold, NunitoSans_800ExtraBold,
} from '@expo-google-fonts/nunito-sans';
import WavebackScreen from './WavebackScreen';
import './global.css';

export default function App() {
  const [loaded, error] = useFonts({
    YoungSerif_400Regular,
    NunitoSans_400Regular, NunitoSans_600SemiBold,
    NunitoSans_700Bold, NunitoSans_800ExtraBold,
  });
  // Don't blank the screen while fonts load (or if loading fails on web)
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: '#1C1410' }} />;

  return (
    <SafeAreaProvider>
      <WavebackScreen
        theme="espresso"          // or "cream"
        spinSeconds={10}
        // songs={[{ title: 'My Song', artist: 'Me', dur: 215 }]}
        // cover={require('./assets/cover.jpg')}
        // grainTexture={require('./assets/grain.png')}
      />
    </SafeAreaProvider>
  );
}
