import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { colors, brand } from '../theme';
import { RootStackParamList, TabParamList, AuthStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';

// Stack'ler
import FinanceStack from './FinanceStack';
import OperationStack from './OperationStack';
import CustomerStack from './CustomerStack';
import AIStack from './AIStack';
import GovernanceStack from './GovernanceStack';
import PlatformStack from './PlatformStack';
import BIStack from './BIStack';
import EnterpriseStack from './EnterpriseStack';

// Ana Ekranlar (Tab'da olanlar)
import HomeScreen from '../screens/HomeScreen';
import WorkOrdersScreen from '../screens/WorkOrdersScreen';
import NewServiceScreen from '../screens/NewServiceScreen';
import QuotesScreen from '../screens/QuotesScreen';
import ManagerScreen from '../screens/ManagerScreen';

// Diğer Bağımsız Ekranlar
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import WorkOrderDetailScreen from '../screens/WorkOrderDetailScreen';
import QuoteDetailScreen from '../screens/QuoteDetailScreen';
import NewQuoteScreen from '../screens/NewQuoteScreen';
import MapScreen from '../screens/MapScreen';
import EmployeeDetailScreen from '../screens/EmployeeDetailScreen';
import LocationHistoryScreen from '../screens/LocationHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ConnectionBanner from '../components/ConnectionBanner';

export const navigationRef = createNavigationContainerRef<any>();

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();

function MainTabs() {
  const { profile, isDemoMode } = useAuth();
  const insets = useSafeAreaInsets();
  const role = profile?.role ?? 'engineer';
  const canSeeManager = isDemoMode || role === 'admin' || role === 'manager';
  const canSeeQuotes = isDemoMode || role !== 'field';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg.secondary,
          borderTopColor: colors.border.primary,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
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
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="WorkOrders"
        component={WorkOrdersScreen}
        options={{
          tabBarLabel: 'İş Emirleri',
          tabBarIcon: ({ color, size }) => <Ionicons name="clipboard-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="NewService"
        component={NewServiceScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => (
            <View style={{ backgroundColor: brand.green, borderRadius: 30, width: 56, height: 56, justifyContent: 'center', alignItems: 'center', marginBottom: 22 }}>
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
          tabBarItemStyle: canSeeQuotes ? undefined : { display: 'none' },
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Manager"
        component={ManagerScreen}
        options={{
          tabBarLabel: 'Yönetici',
          tabBarItemStyle: canSeeManager ? undefined : { display: 'none' },
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
      <AuthStackNav.Screen name="Signup" component={SignupScreen} />
      <AuthStackNav.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStackNav.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStackNav.Navigator>
  );
}

export default function AppNavigator() {
  const { session, profile, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />

            {/* Domain Stacks */}
            <Stack.Screen name="FinanceStack" component={FinanceStack} />
            <Stack.Screen name="OperationStack" component={OperationStack} />
            <Stack.Screen name="CustomerStack" component={CustomerStack} />
            <Stack.Screen name="AIStack" component={AIStack} />
            <Stack.Screen name="GovernanceStack" component={GovernanceStack} />
            <Stack.Screen name="PlatformStack" component={PlatformStack} />
            <Stack.Screen name="BIStack" component={BIStack} />
            <Stack.Screen name="EnterpriseStack" component={EnterpriseStack} />

            {/* Bağımsız Detay Ekranları */}
            <Stack.Screen name="WorkOrderDetail" component={WorkOrderDetailScreen} options={{ headerShown: true, title: 'İş Emri Detayı' }} />
            <Stack.Screen name="QuoteDetail" component={QuoteDetailScreen} options={{ headerShown: true, title: 'Teklif Detayı' }} />
            <Stack.Screen name="NewQuote" component={NewQuoteScreen} options={{ headerShown: true, title: 'Yeni Teklif' }} />
            <Stack.Screen name="Map" component={MapScreen} options={{ headerShown: true, title: 'Saha Haritası' }} />
            <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} options={{ headerShown: true, title: 'Personel Detay' }} />
            <Stack.Screen name="LocationHistory" component={LocationHistoryScreen} options={{ headerShown: true, title: 'Konum Geçmişi' }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: true, title: 'Şifre Değiştir' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'Profilim' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
