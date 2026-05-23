import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <AppNavigator />
          <StatusBar style="light" />
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
