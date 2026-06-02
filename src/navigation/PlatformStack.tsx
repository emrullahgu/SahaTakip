import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PlatformHubScreen from '../screens/PlatformHubScreen';
import TenantsScreen from '../screens/TenantsScreen';
import TenantFormScreen from '../screens/TenantFormScreen';
import TenantMembersScreen from '../screens/TenantMembersScreen';
import TenantSettingsScreen from '../screens/TenantSettingsScreen';
import ModulesScreen from '../screens/ModulesScreen';
import PackagesScreen from '../screens/PackagesScreen';
import LicensesScreen from '../screens/LicensesScreen';
import UsageLimitsScreen from '../screens/UsageLimitsScreen';
import DbIndexHintsScreen from '../screens/DbIndexHintsScreen';
import ArchivePoliciesScreen from '../screens/ArchivePoliciesScreen';
import ArchiveJobsScreen from '../screens/ArchiveJobsScreen';
import BackupsScreen from '../screens/BackupsScreen';
import RestoreTestsScreen from '../screens/RestoreTestsScreen';
import SystemHealthScreen from '../screens/SystemHealthScreen';
import MaintenanceModeScreen from '../screens/MaintenanceModeScreen';
import SaasHubScreen from '../screens/SaasHubScreen';
import SaasTenantsScreen from '../screens/SaasTenantsScreen';
import SaasBillingScreen from '../screens/SaasBillingScreen';
import DepHubScreen from '../screens/DepHubScreen';
import DepSupabaseScreen from '../screens/DepSupabaseScreen';
import DepApkBuildScreen from '../screens/DepApkBuildScreen';

const Stack = createNativeStackNavigator<any>();

export default function PlatformStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlatformHub" component={PlatformHubScreen} />
      <Stack.Screen name="Tenants" component={TenantsScreen} />
      <Stack.Screen name="TenantForm" component={TenantFormScreen} />
      <Stack.Screen name="TenantMembers" component={TenantMembersScreen} />
      <Stack.Screen name="TenantSettings" component={TenantSettingsScreen} />
      <Stack.Screen name="Modules" component={ModulesScreen} />
      <Stack.Screen name="Packages" component={PackagesScreen} />
      <Stack.Screen name="Licenses" component={LicensesScreen} />
      <Stack.Screen name="UsageLimits" component={UsageLimitsScreen} />
      <Stack.Screen name="DbIndexHints" component={DbIndexHintsScreen} />
      <Stack.Screen name="ArchivePolicies" component={ArchivePoliciesScreen} />
      <Stack.Screen name="ArchiveJobs" component={ArchiveJobsScreen} />
      <Stack.Screen name="Backups" component={BackupsScreen} />
      <Stack.Screen name="RestoreTests" component={RestoreTestsScreen} />
      <Stack.Screen name="SystemHealth" component={SystemHealthScreen} />
      <Stack.Screen name="MaintenanceMode" component={MaintenanceModeScreen} />
      <Stack.Screen name="SaasHub" component={SaasHubScreen} />
      <Stack.Screen name="SaasTenants" component={SaasTenantsScreen} />
      <Stack.Screen name="SaasBilling" component={SaasBillingScreen} />
      <Stack.Screen name="DepHub" component={DepHubScreen} />
      <Stack.Screen name="DepSupabase" component={DepSupabaseScreen} />
      <Stack.Screen name="DepApkBuild" component={DepApkBuildScreen} />
    </Stack.Navigator>
  );
}
