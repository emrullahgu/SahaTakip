import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import GovernanceHubScreen from '../screens/GovernanceHubScreen';
import RoleMatrixV2Screen from '../screens/RoleMatrixV2Screen';
import DepartmentsScreen from '../screens/DepartmentsScreen';
import DepartmentFormScreen from '../screens/DepartmentFormScreen';
import RegionsScreen from '../screens/RegionsScreen';
import RegionFormScreen from '../screens/RegionFormScreen';
import PermissionsScreen from '../screens/PermissionsScreen';
import ApprovalsScreen from '../screens/ApprovalsScreen';
import ApprovalDetailScreen from '../screens/ApprovalDetailScreen';
import AuditLogV2Screen from '../screens/AuditLogV2Screen';
import AuditDetailScreen from '../screens/AuditDetailScreen';
import SessionLogsScreen from '../screens/SessionLogsScreen';
import SuspiciousLoginsScreen from '../screens/SuspiciousLoginsScreen';
import KvkkAccessLogsScreen from '../screens/KvkkAccessLogsScreen';
import RoleMatrixScreen from '../screens/RoleMatrixScreen';
import AuditLogScreen from '../screens/AuditLogScreen';

const Stack = createNativeStackNavigator<any>();

export default function GovernanceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GovernanceHub" component={GovernanceHubScreen} />
      <Stack.Screen name="RoleMatrixV2" component={RoleMatrixV2Screen} />
      <Stack.Screen name="RoleMatrix" component={RoleMatrixScreen} />
      <Stack.Screen name="Departments" component={DepartmentsScreen} />
      <Stack.Screen name="DepartmentForm" component={DepartmentFormScreen} />
      <Stack.Screen name="Regions" component={RegionsScreen} />
      <Stack.Screen name="RegionForm" component={RegionFormScreen} />
      <Stack.Screen name="PermissionsScreen" component={PermissionsScreen} />
      <Stack.Screen name="Approvals" component={ApprovalsScreen} />
      <Stack.Screen name="ApprovalDetail" component={ApprovalDetailScreen} />
      <Stack.Screen name="AuditLogV2" component={AuditLogV2Screen} />
      <Stack.Screen name="AuditLog" component={AuditLogScreen} />
      <Stack.Screen name="AuditDetail" component={AuditDetailScreen} />
      <Stack.Screen name="SessionLogs" component={SessionLogsScreen} />
      <Stack.Screen name="SuspiciousLogins" component={SuspiciousLoginsScreen} />
      <Stack.Screen name="KvkkAccessLogs" component={KvkkAccessLogsScreen} />
    </Stack.Navigator>
  );
}
