// renderScreen — bir ekranı izole edip "çökmeden mount oldu" doğrulaması için
// react-test-renderer ile render eder. Navigation hook'ları jest.render.setup.js'te
// mock'lu olduğundan NavigationContainer gerekmez; ayrıca navigation/route prop'ları da
// stub olarak geçilir (prop-tabanlı erişen ekranlar için). Render + bekleyen efektler +
// unmount hepsi act() içinde sarılır (react act uyarısı çıkmasın).
import React, { ComponentType } from 'react';
import TestRenderer, { act, ReactTestRenderer } from 'react-test-renderer';

const navStub: any = {
  navigate: () => {},
  goBack: () => {},
  setOptions: () => {},
  dispatch: () => {},
  addListener: () => () => {},
  canGoBack: () => true,
};

export async function renderScreen(
  Screen: ComponentType<any>,
  params: Record<string, unknown> = {},
): Promise<{ json: unknown }> {
  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = TestRenderer.create(
      React.createElement(Screen, {
        navigation: navStub,
        route: { params, key: 'test', name: 'Test' },
      }),
    );
  });
  // Mount sonrası bekleyen efektlerin (useEffect/useFocusEffect) oturması için bir tur daha.
  await act(async () => { await Promise.resolve(); });
  const json = tree!.toJSON();
  await act(async () => { tree!.unmount(); });
  return { json };
}
