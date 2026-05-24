// ErrorBoundary — POZ-DEV-360
// Top-level guard: son kullanıcıda beyaz ekran / crash önleme.
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { recordCrash } from '../services/crashReporter';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  info: string | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, info: null };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    try {
      void recordCrash({
        severity: 'fatal',
        message: error?.message ?? 'Unknown error',
        stack: (error?.stack ?? '') + '\n--- componentStack ---\n' + (info?.componentStack ?? ''),
        handled: true,
      });
    } catch {
      // sessiz
    }
    this.setState({ info: info?.componentStack ?? null });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <ScrollView contentContainerStyle={s.content}>
            <Ionicons name="warning" size={64} color="#f59e0b" />
            <Text style={s.title}>{this.props.fallbackTitle ?? 'Beklenmedik bir hata oluştu'}</Text>
            <Text style={s.subtitle}>Uygulama kararsız bir duruma girdi. Lütfen tekrar deneyin.</Text>
            {this.state.error?.message ? (
              <View style={s.errorBox}>
                <Text style={s.errorText} numberOfLines={6}>
                  {this.state.error.message}
                </Text>
              </View>
            ) : null}
            <Pressable style={s.button} onPress={this.handleReset}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={s.buttonText}>Tekrar Dene</Text>
            </Pressable>
          </ScrollView>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  title: {
    fontSize: typography.xl,
    fontWeight: '800',
    color: colors.text.primary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.md,
    color: colors.text.muted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  errorBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.primary,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    maxWidth: 520,
    width: '100%',
  },
  errorText: { color: '#f87171', fontSize: typography.sm, fontFamily: 'monospace' },
  button: {
    marginTop: spacing.xl,
    backgroundColor: '#22c55e',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: typography.md },
});
