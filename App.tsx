import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation';
import ConnectionBanner from './src/components/ConnectionBanner';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <View style={{ flex: 1 }}>
            <ConnectionBanner />
            <AppNavigator />
          </View>
          <StatusBar style="light" />
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
