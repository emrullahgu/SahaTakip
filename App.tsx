import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import { AuthProvider } from './src/context/AuthContext';
import { VisitProvider } from './src/context/VisitContext';
import AppNavigator from './src/navigation';
import ConnectionBanner from './src/components/ConnectionBanner';
import ErrorBoundary from './src/components/ErrorBoundary';
import { installGlobalErrorHandler } from './src/services/crashReporter';

installGlobalErrorHandler();

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <VisitProvider>
            <AppProvider>
              <View style={{ flex: 1 }}>
                <ConnectionBanner />
                <AppNavigator />
              </View>
              <StatusBar style="light" />
            </AppProvider>
          </VisitProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
