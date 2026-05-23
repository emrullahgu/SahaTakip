import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { colors, brand } from '../theme';
import { RootStackParamList, TabParamList, AuthStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';

import HomeScreen from '../screens/HomeScreen';
import WorkOrdersScreen from '../screens/WorkOrdersScreen';
import NewServiceScreen from '../screens/NewServiceScreen';
import ServicesScreen from '../screens/ServicesScreen';
import ManagerScreen from '../screens/ManagerScreen';
import CompanyScreen from '../screens/CompanyScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import QuotesScreen from '../screens/QuotesScreen';
import NewQuoteScreen from '../screens/NewQuoteScreen';
import QuoteDetailScreen from '../screens/QuoteDetailScreen';
import CustomersScreen from '../screens/CustomersScreen';
import CustomerFormScreen from '../screens/CustomerFormScreen';
import MapScreen from '../screens/MapScreen';
import ShiftScreen from '../screens/ShiftScreen';
import EmployeeDetailScreen from '../screens/EmployeeDetailScreen';
import LocationHistoryScreen from '../screens/LocationHistoryScreen';
import GeofencesScreen from '../screens/GeofencesScreen';
import CheckinScannerScreen from '../screens/CheckinScannerScreen';
import NfcCheckinScreen from '../screens/NfcCheckinScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import WorkOrderDetailScreen from '../screens/WorkOrderDetailScreen';
import BulkAssignScreen from '../screens/BulkAssignScreen';
import RecurringTasksScreen from '../screens/RecurringTasksScreen';
import QuoteRevisionsScreen from '../screens/QuoteRevisionsScreen';
import QuoteAcceptScreen from '../screens/QuoteAcceptScreen';
import QuoteTemplatesScreen from '../screens/QuoteTemplatesScreen';
import CustomerSitesScreen from '../screens/CustomerSitesScreen';
import CustomerDocumentsScreen from '../screens/CustomerDocumentsScreen';
import CustomerHistoryScreen from '../screens/CustomerHistoryScreen';
import JobRatingScreen from '../screens/JobRatingScreen';
import CustomerPortalScreen from '../screens/CustomerPortalScreen';
import FormTemplatesScreen from '../screens/FormTemplatesScreen';
import FormBuilderScreen from '../screens/FormBuilderScreen';
import FormFillScreen from '../screens/FormFillScreen';
import FormResponseDetailScreen from '../screens/FormResponseDetailScreen';
import WorkOrderFormsScreen from '../screens/WorkOrderFormsScreen';
import MaterialsScreen from '../screens/MaterialsScreen';
import MaterialFormScreen from '../screens/MaterialFormScreen';
import WarehousesScreen from '../screens/WarehousesScreen';
import WarehouseFormScreen from '../screens/WarehouseFormScreen';
import WarehouseDetailScreen from '../screens/WarehouseDetailScreen';
import StockScreen from '../screens/StockScreen';
import StockMovementScreen from '../screens/StockMovementScreen';
import StockMovementsScreen from '../screens/StockMovementsScreen';
import AssignmentsScreen from '../screens/AssignmentsScreen';
import BarcodeScanScreen from '../screens/BarcodeScanScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import VehicleFormScreen from '../screens/VehicleFormScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import VehicleLogFormScreen from '../screens/VehicleLogFormScreen';
import VehicleLogsScreen from '../screens/VehicleLogsScreen';
import VehicleDamagesScreen from '../screens/VehicleDamagesScreen';
import VehicleDamageFormScreen from '../screens/VehicleDamageFormScreen';
import VehicleRouteScreen from '../screens/VehicleRouteScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SlaScreen from '../screens/SlaScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function MainTabs() {
  const { profile, isDemoMode } = useAuth();
  const role = profile?.role ?? 'engineer';
  const canSeeManager = isDemoMode || role === 'admin' || role === 'manager';
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg.secondary,
          borderTopColor: colors.border.primary,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: brand.green,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Keşfet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="WorkOrders"
        component={WorkOrdersScreen}
        options={{
          tabBarLabel: 'İş Emirleri',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="NewService"
        component={NewServiceScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => (
            <View
              style={{
                backgroundColor: brand.green,
                borderRadius: 30,
                width: 56,
                height: 56,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 22,
                shadowColor: brand.green,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.45,
                shadowRadius: 8,
                elevation: 10,
              }}
            >
              <Ionicons name="add" color={colors.bg.primary} size={30} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Quotes"
        component={QuotesScreen}
        options={{
          tabBarLabel: 'Teklifler',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Manager"
        component={ManagerScreen}
        options={{
          tabBarLabel: 'Yönetici',
          tabBarItemStyle: canSeeManager ? undefined : { display: 'none' },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

export default function AppNavigator() {
  const { session, isDemoMode, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg.primary }}>
        <ActivityIndicator size="large" color={brand.green} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session || isDemoMode ? <MainStack /> : <AuthFlow />}
    </NavigationContainer>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="Company"
        component={CompanyScreen}
        options={{
          headerShown: true,
          title: 'Firma Bilgisi',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{
          headerShown: true,
          title: 'Masraflarım',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Services"
        component={ServicesScreen}
        options={{
          headerShown: true,
          title: 'Servislerim',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="NewQuote"
        component={NewQuoteScreen}
        options={{
          headerShown: true,
          title: 'Yeni Teklif',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="QuoteDetail"
        component={QuoteDetailScreen}
        options={{
          headerShown: true,
          title: 'Teklif Detayı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Customers"
        component={CustomersScreen}
        options={{
          headerShown: true,
          title: 'Müşteriler',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="CustomerForm"
        component={CustomerFormScreen}
        options={({ route }) => ({
          headerShown: true,
          title: (route.params as any)?.customerId ? 'Müşteri Düzenle' : 'Yeni Müşteri',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        })}
      />
      <Stack.Screen
        name="Map"
        component={MapScreen}
        options={{
          headerShown: true,
          title: 'Saha Haritası',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Shift"
        component={ShiftScreen}
        options={{
          headerShown: true,
          title: 'Mesai',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="EmployeeDetail"
        component={EmployeeDetailScreen}
        options={{
          headerShown: true,
          title: 'Personel Detay',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="LocationHistory"
        component={LocationHistoryScreen}
        options={{
          headerShown: true,
          title: 'Konum Geçmişi',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Geofences"
        component={GeofencesScreen}
        options={{
          headerShown: true,
          title: 'Bölgeler (Geofence)',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="CheckinScanner"
        component={CheckinScannerScreen}
        options={{
          headerShown: true,
          title: 'QR Check-in',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="NfcCheckin"
        component={NfcCheckinScreen}
        options={{
          headerShown: true,
          title: 'NFC Check-in',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{
          headerShown: true,
          title: 'Şifre Değiştir',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="WorkOrderDetail"
        component={WorkOrderDetailScreen}
        options={{
          headerShown: true,
          title: 'İş Emri Detayı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="BulkAssign"
        component={BulkAssignScreen}
        options={{
          headerShown: true,
          title: 'Toplu Atama',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="RecurringTasks"
        component={RecurringTasksScreen}
        options={{
          headerShown: true,
          title: 'Periyodik Görevler',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="QuoteRevisions"
        component={QuoteRevisionsScreen}
        options={{
          headerShown: true,
          title: 'Revizyon Geçmişi',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="QuoteAccept"
        component={QuoteAcceptScreen}
        options={{
          headerShown: true,
          title: 'Teklif Kabul',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="QuoteTemplates"
        component={QuoteTemplatesScreen}
        options={{
          headerShown: true,
          title: 'Teklif Şablonları',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="CustomerSites"
        component={CustomerSitesScreen}
        options={{
          headerShown: true,
          title: 'Müşteri Sahaları',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="CustomerDocuments"
        component={CustomerDocumentsScreen}
        options={{
          headerShown: true,
          title: 'Müşteri Belgeleri',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="CustomerHistory"
        component={CustomerHistoryScreen}
        options={{
          headerShown: true,
          title: 'Müşteri Geçmişi',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="JobRating"
        component={JobRatingScreen}
        options={{
          headerShown: true,
          title: 'Müşteri Puanı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="CustomerPortal"
        component={CustomerPortalScreen}
        options={{
          headerShown: true,
          title: 'Müşteri Portalı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="FormTemplates"
        component={FormTemplatesScreen}
        options={{
          headerShown: true,
          title: 'Form Şablonları',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="FormBuilder"
        component={FormBuilderScreen}
        options={{
          headerShown: true,
          title: 'Form Tasarımcısı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="FormFill"
        component={FormFillScreen}
        options={{
          headerShown: true,
          title: 'Form Doldur',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="FormResponseDetail"
        component={FormResponseDetailScreen}
        options={{
          headerShown: true,
          title: 'Form Detayı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="WorkOrderForms"
        component={WorkOrderFormsScreen}
        options={{
          headerShown: true,
          title: 'İş Emri Formları',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Materials"
        component={MaterialsScreen}
        options={{
          headerShown: true,
          title: 'Malzemeler',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="MaterialForm"
        component={MaterialFormScreen}
        options={{
          headerShown: true,
          title: 'Malzeme',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Warehouses"
        component={WarehousesScreen}
        options={{
          headerShown: true,
          title: 'Depo & Zimmet',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="WarehouseForm"
        component={WarehouseFormScreen}
        options={{
          headerShown: true,
          title: 'Depo / Zimmet',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="WarehouseDetail"
        component={WarehouseDetailScreen}
        options={{
          headerShown: true,
          title: 'Detay',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Stock"
        component={StockScreen}
        options={{
          headerShown: true,
          title: 'Stok',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="StockMovement"
        component={StockMovementScreen}
        options={{
          headerShown: true,
          title: 'Stok Hareketi',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="StockMovements"
        component={StockMovementsScreen}
        options={{
          headerShown: true,
          title: 'Hareket Geçmişi',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Assignments"
        component={AssignmentsScreen}
        options={{
          headerShown: true,
          title: 'Zimmet',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="BarcodeScan"
        component={BarcodeScanScreen}
        options={{
          headerShown: true,
          title: 'Barkod Tara',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Vehicles"
        component={VehiclesScreen}
        options={{
          headerShown: true,
          title: 'Araçlar',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="VehicleForm"
        component={VehicleFormScreen}
        options={{
          headerShown: true,
          title: 'Araç',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="VehicleDetail"
        component={VehicleDetailScreen}
        options={{
          headerShown: true,
          title: 'Araç Detayı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="VehicleLogForm"
        component={VehicleLogFormScreen}
        options={{
          headerShown: true,
          title: 'Araç Kaydı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="VehicleLogs"
        component={VehicleLogsScreen}
        options={{
          headerShown: true,
          title: 'Araç Kayıtları',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="VehicleDamages"
        component={VehicleDamagesScreen}
        options={{
          headerShown: true,
          title: 'Araç Hasarları',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="VehicleDamageForm"
        component={VehicleDamageFormScreen}
        options={{
          headerShown: true,
          title: 'Hasar',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="VehicleRoute"
        component={VehicleRouteScreen}
        options={{
          headerShown: true,
          title: 'Rota Geçmişi',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          headerShown: true,
          title: 'Raporlar',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{
          headerShown: true,
          title: 'Rapor Detayı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerShown: true,
          title: 'Dashboard',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Sla"
        component={SlaScreen}
        options={{
          headerShown: true,
          title: 'Geciken İşler',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
    </Stack.Navigator>
  );
}
