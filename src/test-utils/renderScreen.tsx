// renderScreen — bir ekranı izole edip "çökmeden mount oldu" doğrulaması için
// react-test-renderer ile render eder. Navigation hook'ları jest.render.setup.js'te
// mock'lu olduğundan NavigationContainer gerekmez; ayrıca navigation/route prop'ları da
// stub olarak geçilir (prop-tabanlı erişen ekranlar için). Varsayılan olarak ekran
// AuthProvider + AppProvider içine sarılır → useAuth/useAppContext kullanan ekranlar da
// render olur (test ortamı offline → AppProvider seed veriyle, ağ çağrısı yok). Render +
// bekleyen efektler + unmount hepsi act() içinde sarılır (react act uyarısı çıkmasın).
import React, { ComponentType } from 'react';
import TestRenderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { AuthProvider } from '../context/AuthContext';
import { VisitProvider } from '../context/VisitContext';
import { AppProvider } from '../context/AppContext';

const navStub: any = {
  navigate: () => {},
  goBack: () => {},
  setOptions: () => {},
  dispatch: () => {},
  addListener: () => () => {},
  canGoBack: () => true,
  setParams: () => {},
  push: () => {},
  replace: () => {},
};

export async function renderScreen(
  Screen: ComponentType<any>,
  params: Record<string, unknown> = {},
  opts: { providers?: boolean } = {},
): Promise<{ json: unknown }> {
  const withProviders = opts.providers !== false;
  const screenEl = React.createElement(Screen, {
    navigation: navStub,
    route: { params, key: 'test', name: 'Test' },
  });
  // App.tsx ile aynı sıra: AuthProvider → VisitProvider → AppProvider.
  const root = withProviders
    ? React.createElement(AuthProvider, null,
        React.createElement(VisitProvider, null,
          React.createElement(AppProvider, null, screenEl)))
    : screenEl;

  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = TestRenderer.create(root);
  });
  // Mount sonrası bekleyen efektlerin (useEffect/useFocusEffect) oturması için bir tur daha.
  await act(async () => { await Promise.resolve(); });
  const json = tree!.toJSON();
  await act(async () => { tree!.unmount(); });
  return { json };
}
