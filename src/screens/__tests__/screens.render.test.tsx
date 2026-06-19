// Ekran smoke-render harness (Req#6): "çökmeden mount oluyor mu" sağlık testleri.
// Davranış değil mount sağlığı test edilir. Provider/route.params bağımlılığı OLMAYAN,
// AsyncStorage'a düşen (offline-safe) ekranlar seçildi. Yeni güvenli ekranlar eklenebilir.
import { renderScreen } from '../../test-utils/renderScreen';

import EnvironmentInfoScreen from '../EnvironmentInfoScreen';
import ReleaseNotesScreen from '../ReleaseNotesScreen';
import FieldSettingsScreen from '../FieldSettingsScreen';
import PerformanceMetricsScreen from '../PerformanceMetricsScreen';
import RoleMatrixScreen from '../RoleMatrixScreen';
import AccessRulesScreen from '../AccessRulesScreen';
import TestPlanScreen from '../TestPlanScreen';
import ConnectivityMonitorScreen from '../ConnectivityMonitorScreen';
import CrashReportsScreen from '../CrashReportsScreen';
import NotificationPreferencesScreen from '../NotificationPreferencesScreen';

const SCREENS: Array<[string, React.ComponentType<any>]> = [
  ['EnvironmentInfoScreen', EnvironmentInfoScreen],
  ['ReleaseNotesScreen', ReleaseNotesScreen],
  ['FieldSettingsScreen', FieldSettingsScreen],
  ['PerformanceMetricsScreen', PerformanceMetricsScreen],
  ['RoleMatrixScreen', RoleMatrixScreen],
  ['AccessRulesScreen', AccessRulesScreen],
  ['TestPlanScreen', TestPlanScreen],
  ['ConnectivityMonitorScreen', ConnectivityMonitorScreen],
  ['CrashReportsScreen', CrashReportsScreen],
  ['NotificationPreferencesScreen', NotificationPreferencesScreen],
];

describe('Ekran smoke-render', () => {
  it.each(SCREENS)('%s çökmeden mount olur', async (_name, Screen) => {
    const { json } = await renderScreen(Screen);
    expect(json).toBeTruthy();
  });
});
