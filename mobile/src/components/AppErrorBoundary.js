/**
 * AppErrorBoundary — the last line of defence for the whole app.
 *
 * In a release build an unhandled JavaScript error closes the app with no
 * message (CRASH-001: one shadowed variable on the Home list killed the app on
 * every launch). This boundary catches render errors and fatal global errors
 * and shows a "Something went wrong / Try again" screen instead. "Try again"
 * remounts the whole tree below the boundary.
 *
 * Deliberately plain: no theme, i18n hooks or providers, because the thing
 * that failed may be one of them. Text comes straight from i18next with an
 * English fallback.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import i18next from 'i18next';

const label = (key, fallback) => {
  try { return i18next.t(key, { defaultValue: fallback }); } catch { return fallback; }
};

// Fatal errors raised outside render (event handlers, timers) go through the
// global handler, which would otherwise end the process. Route them here.
let fatalListener = null;
export function installGlobalErrorHandler() {
  const utils = global.ErrorUtils;
  if (!utils || typeof utils.setGlobalHandler !== 'function') return () => {};
  const previous = typeof utils.getGlobalHandler === 'function' ? utils.getGlobalHandler() : null;
  utils.setGlobalHandler((error, isFatal) => {
    if (isFatal && fatalListener) { fatalListener(error); return; }
    if (previous) previous(error, isFatal);
  });
  return () => { if (previous) utils.setGlobalHandler(previous); };
}

export default class AppErrorBoundary extends React.Component {
  state = { error: null, generation: 0 };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the message in the device log so adb logcat / Console still show it.
    console.error('[AppErrorBoundary]', error?.message || error, info?.componentStack || '');
  }

  componentDidMount() {
    fatalListener = (error) => this.setState({ error });
  }

  componentWillUnmount() {
    if (fatalListener) fatalListener = null;
  }

  retry = () => {
    this.setState(({ generation }) => ({ error: null, generation: generation + 1 }));
  };

  render() {
    const { error, generation } = this.state;
    if (error) {
      return (
        <View style={styles.screen} testID="app-error-screen">
          <Text style={styles.title}>{label('common.something_went_wrong', 'Something went wrong')}</Text>
          <Text style={styles.detail} numberOfLines={3}>{String(error?.message || error)}</Text>
          <TouchableOpacity style={styles.button} onPress={this.retry} accessibilityRole="button">
            <Text style={styles.buttonText}>{label('common.try_again', 'Try again')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    // Changing the key remounts every child, which resets the broken state.
    return <React.Fragment key={generation}>{this.props.children}</React.Fragment>;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#f2f2f7' },
  title: { fontSize: 20, fontWeight: '700', color: '#1d1d1f', marginBottom: 8, textAlign: 'center' },
  detail: { fontSize: 13, color: '#8e8e93', marginBottom: 24, textAlign: 'center' },
  button: { backgroundColor: '#1a8fa8', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
