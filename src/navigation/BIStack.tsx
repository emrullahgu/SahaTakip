import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BiHubScreen from '../screens/BiHubScreen';
import ExecutiveDashboardScreen from '../screens/ExecutiveDashboardScreen';
import DepartmentKpisScreen from '../screens/DepartmentKpisScreen';
import StaffPerformanceScreen from '../screens/StaffPerformanceScreen';
import VehicleCostAnalysisScreen from '../screens/VehicleCostAnalysisScreen';
import FuelConsumptionScreen from '../screens/FuelConsumptionScreen';
import StockConsumptionScreen from '../screens/StockConsumptionScreen';
import QuoteWinLossScreen from '../screens/QuoteWinLossScreen';
import CustomerProfitabilityScreen from '../screens/CustomerProfitabilityScreen';
import SlaTrackingScreen from '../screens/SlaTrackingScreen';
import RegionHeatmapScreen from '../screens/RegionHeatmapScreen';
import BudgetVsActualScreen from '../screens/BudgetVsActualScreen';
import ExecutiveSummaryScreen from '../screens/ExecutiveSummaryScreen';
import PivotExportScreen from '../screens/PivotExportScreen';
import ReportingHubScreen from '../screens/ReportingHubScreen';
import KpiOverviewScreen from '../screens/KpiOverviewScreen';
import ReportComparisonScreen from '../screens/ReportComparisonScreen';
import DashboardScreen from '../screens/DashboardScreen';

const Stack = createNativeStackNavigator<any>();

export default function BIStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BiHub" component={BiHubScreen} />
      <Stack.Screen name="ExecutiveDashboard" component={ExecutiveDashboardScreen} />
      <Stack.Screen name="DepartmentKpis" component={DepartmentKpisScreen} />
      <Stack.Screen name="StaffPerformance" component={StaffPerformanceScreen} />
      <Stack.Screen name="VehicleCostAnalysis" component={VehicleCostAnalysisScreen} />
      <Stack.Screen name="FuelConsumption" component={FuelConsumptionScreen} />
      <Stack.Screen name="StockConsumption" component={StockConsumptionScreen} />
      <Stack.Screen name="QuoteWinLoss" component={QuoteWinLossScreen} />
      <Stack.Screen name="CustomerProfitability" component={CustomerProfitabilityScreen} />
      <Stack.Screen name="SlaTracking" component={SlaTrackingScreen} />
      <Stack.Screen name="RegionHeatmap" component={RegionHeatmapScreen} />
      <Stack.Screen name="BudgetVsActual" component={BudgetVsActualScreen} />
      <Stack.Screen name="ExecutiveSummary" component={ExecutiveSummaryScreen} />
      <Stack.Screen name="PivotExport" component={PivotExportScreen} />
      <Stack.Screen name="ReportingHub" component={ReportingHubScreen} />
      <Stack.Screen name="KpiOverview" component={KpiOverviewScreen} />
      <Stack.Screen name="ReportComparison" component={ReportComparisonScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
    </Stack.Navigator>
  );
}
