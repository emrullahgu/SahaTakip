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
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function MainTabs() {
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
    </Stack.Navigator>
  );
}
