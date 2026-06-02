import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import FieldHubScreen from '../screens/FieldHubScreen';
import FieldTodayScreen from '../screens/FieldTodayScreen';
import FieldShiftScreen from '../screens/FieldShiftScreen';
import FieldJobsScreen from '../screens/FieldJobsScreen';
import FieldJobDetailScreen from '../screens/FieldJobDetailScreen';
import FieldChecklistScreen from '../screens/FieldChecklistScreen';
import FieldQualityCheckScreen from '../screens/FieldQualityCheckScreen';
import FieldPerformanceScreen from '../screens/FieldPerformanceScreen';
import FieldZonesScreen from '../screens/FieldZonesScreen';
import FieldShiftPlanScreen from '../screens/FieldShiftPlanScreen';
import FieldEmergencyScreen from '../screens/FieldEmergencyScreen';
import FieldCommandCenterScreen from '../screens/FieldCommandCenterScreen';
import ComplianceHubScreen from '../screens/ComplianceHubScreen';
import NonConformityScreen from '../screens/NonConformityScreen';
import CapaScreen from '../screens/CapaScreen';
import SafetyChecklistsScreen from '../screens/SafetyChecklistsScreen';
import RiskAssessmentScreen from '../screens/RiskAssessmentScreen';
import AuditScheduleScreen from '../screens/AuditScheduleScreen';
import AuditScoringScreen from '../screens/AuditScoringScreen';
import QualityDashboardScreen from '../screens/QualityDashboardScreen';
import AssetHubScreen from '../screens/AssetHubScreen';
import AssetListScreen from '../screens/AssetListScreen';
import ServiceCardScreen from '../screens/ServiceCardScreen';

const Stack = createNativeStackNavigator<any>();

export default function FieldOpsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FieldHub" component={FieldHubScreen} />
      <Stack.Screen name="FieldToday" component={FieldTodayScreen} />
      <Stack.Screen name="FieldShift" component={FieldShiftScreen} />
      <Stack.Screen name="FieldJobs" component={FieldJobsScreen} />
      <Stack.Screen name="FieldJobDetail" component={FieldJobDetailScreen} />
      <Stack.Screen name="FieldChecklist" component={FieldChecklistScreen} />
      <Stack.Screen name="FieldQualityCheck" component={FieldQualityCheckScreen} />
      <Stack.Screen name="FieldPerformance" component={FieldPerformanceScreen} />
      <Stack.Screen name="FieldZones" component={FieldZonesScreen} />
      <Stack.Screen name="FieldShiftPlan" component={FieldShiftPlanScreen} />
      <Stack.Screen name="FieldEmergency" component={FieldEmergencyScreen} />
      <Stack.Screen name="FieldCommandCenter" component={FieldCommandCenterScreen} />
      <Stack.Screen name="ComplianceHub" component={ComplianceHubScreen} />
      <Stack.Screen name="NonConformity" component={NonConformityScreen} />
      <Stack.Screen name="Capa" component={CapaScreen} />
      <Stack.Screen name="SafetyChecklists" component={SafetyChecklistsScreen} />
      <Stack.Screen name="RiskAssessment" component={RiskAssessmentScreen} />
      <Stack.Screen name="AuditSchedule" component={AuditScheduleScreen} />
      <Stack.Screen name="AuditScoring" component={AuditScoringScreen} />
      <Stack.Screen name="QualityDashboard" component={QualityDashboardScreen} />
      <Stack.Screen name="AssetHub" component={AssetHubScreen} />
      <Stack.Screen name="AssetList" component={AssetListScreen} />
      <Stack.Screen name="ServiceCard" component={ServiceCardScreen} />
    </Stack.Navigator>
  );
}
