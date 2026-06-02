import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OperationStackParamList } from '../types';

import ShiftScreen from '../screens/ShiftScreen';
import GeofencesScreen from '../screens/GeofencesScreen';
import CheckinScannerScreen from '../screens/CheckinScannerScreen';
import NfcCheckinScreen from '../screens/NfcCheckinScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import VehicleFormScreen from '../screens/VehicleFormScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import VehicleLogFormScreen from '../screens/VehicleLogFormScreen';
import VehicleLogsScreen from '../screens/VehicleLogsScreen';
import VehicleDamagesScreen from '../screens/VehicleDamagesScreen';
import VehicleDamageFormScreen from '../screens/VehicleDamageFormScreen';
import VehicleRouteScreen from '../screens/VehicleRouteScreen';
import MaterialsScreen from '../screens/MaterialsScreen';
import MaterialFormScreen from '../screens/MaterialFormScreen';
import WarehousesScreen from '../screens/WarehousesScreen';
import WarehouseFormScreen from '../screens/WarehouseFormScreen';
import WarehouseDetailScreen from '../screens/WarehouseDetailScreen';
import StockScreen from '../screens/StockScreen';
import StockMovementScreen from '../screens/StockMovementScreen';
import StockMovementsScreen from '../screens/StockMovementsScreen';

const Stack = createNativeStackNavigator<OperationStackParamList>();

export default function OperationStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Shift" component={ShiftScreen} />
      <Stack.Screen name="Geofences" component={GeofencesScreen} />
      <Stack.Screen name="CheckinScanner" component={CheckinScannerScreen} />
      <Stack.Screen name="NfcCheckin" component={NfcCheckinScreen} />
      <Stack.Screen name="Vehicles" component={VehiclesScreen} />
      <Stack.Screen name="VehicleForm" component={VehicleFormScreen} />
      <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
      <Stack.Screen name="VehicleLogForm" component={VehicleLogFormScreen} />
      <Stack.Screen name="VehicleLogs" component={VehicleLogsScreen} />
      <Stack.Screen name="VehicleDamages" component={VehicleDamagesScreen} />
      <Stack.Screen name="VehicleDamageForm" component={VehicleDamageFormScreen} />
      <Stack.Screen name="VehicleRoute" component={VehicleRouteScreen} />
      <Stack.Screen name="Materials" component={MaterialsScreen} />
      <Stack.Screen name="MaterialForm" component={MaterialFormScreen} />
      <Stack.Screen name="Warehouses" component={WarehousesScreen} />
      <Stack.Screen name="WarehouseForm" component={WarehouseFormScreen} />
      <Stack.Screen name="WarehouseDetail" component={WarehouseDetailScreen} />
      <Stack.Screen name="Stock" component={StockScreen} />
      <Stack.Screen name="StockMovement" component={StockMovementScreen} />
      <Stack.Screen name="StockMovements" component={StockMovementsScreen} />
    </Stack.Navigator>
  );
}
