import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FinanceStackParamList } from '../types';

import PaymentsScreen from '../screens/PaymentsScreen';
import PaymentFormScreen from '../screens/PaymentFormScreen';
import PaymentDetailScreen from '../screens/PaymentDetailScreen';
import CustomerBalancesScreen from '../screens/CustomerBalancesScreen';
import CashRegisterScreen from '../screens/CashRegisterScreen';
import FinanceHubScreen from '../screens/FinanceHubScreen';
import IncomeReportScreen from '../screens/IncomeReportScreen';
import AgingReportScreen from '../screens/AgingReportScreen';
import EInvoiceScreen from '../screens/EInvoiceScreen';

const Stack = createNativeStackNavigator<FinanceStackParamList>();

export default function FinanceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FinanceHub" component={FinanceHubScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="PaymentForm" component={PaymentFormScreen} />
      <Stack.Screen name="PaymentDetail" component={PaymentDetailScreen} />
      <Stack.Screen name="CustomerBalances" component={CustomerBalancesScreen} />
      <Stack.Screen name="CashRegister" component={CashRegisterScreen} />
      <Stack.Screen name="IncomeReport" component={IncomeReportScreen} />
      <Stack.Screen name="AgingReport" component={AgingReportScreen} />
      <Stack.Screen name="EInvoice" component={EInvoiceScreen} />
    </Stack.Navigator>
  );
}
