import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../types';

import CustomersScreen from '../screens/CustomersScreen';
import CustomerFormScreen from '../screens/CustomerFormScreen';
import CustomerSitesScreen from '../screens/CustomerSitesScreen';
import CustomerDocumentsScreen from '../screens/CustomerDocumentsScreen';
import CustomerHistoryScreen from '../screens/CustomerHistoryScreen';
import JobRatingScreen from '../screens/JobRatingScreen';
import CustomerPortalScreen from '../screens/CustomerPortalScreen';
import CustomerRatingsAllScreen from '../screens/CustomerRatingsScreen'; // Note: check filename
import CustomerHubScreen from '../screens/CustomerHubScreen';
import CustomerExperienceHubScreen from '../screens/CustomerExperienceHubScreen';
import PortalUsersScreen from '../screens/PortalUsersScreen';
import PortalUserFormScreen from '../screens/PortalUserFormScreen';
import ShareLinksScreen from '../screens/ShareLinksScreen';
import ShareLinkFormScreen from '../screens/ShareLinkFormScreen';
import ShareLinkDetailScreen from '../screens/ShareLinkDetailScreen';
import SatisfactionSurveysScreen from '../screens/SatisfactionSurveysScreen';
import SurveyDetailScreen from '../screens/SurveyDetailScreen';
import CustomerNotificationPrefsScreen from '../screens/CustomerNotificationPrefsScreen';
import AutoReportsScreen from '../screens/AutoReportsScreen';
import AutoReportFormScreen from '../screens/AutoReportFormScreen';

const Stack = createNativeStackNavigator<CustomerStackParamList>();

export default function CustomerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerHub" component={CustomerHubScreen} />
      <Stack.Screen name="Customers" component={CustomersScreen} />
      <Stack.Screen name="CustomerForm" component={CustomerFormScreen} />
      <Stack.Screen name="CustomerExperienceHub" component={CustomerExperienceHubScreen} />
      <Stack.Screen name="CustomerSites" component={CustomerSitesScreen} />
      <Stack.Screen name="CustomerDocuments" component={CustomerDocumentsScreen} />
      <Stack.Screen name="CustomerHistory" component={CustomerHistoryScreen} />
      <Stack.Screen name="JobRating" component={JobRatingScreen} />
      <Stack.Screen name="CustomerPortal" component={CustomerPortalScreen} />
      <Stack.Screen name="CustomerRatingsAll" component={CustomerRatingsAllScreen} />
      <Stack.Screen name="PortalUsers" component={PortalUsersScreen} />
      <Stack.Screen name="PortalUserForm" component={PortalUserFormScreen} />
      <Stack.Screen name="ShareLinks" component={ShareLinksScreen} />
      <Stack.Screen name="ShareLinkForm" component={ShareLinkFormScreen} />
      <Stack.Screen name="ShareLinkDetail" component={ShareLinkDetailScreen} />
      <Stack.Screen name="SatisfactionSurveys" component={SatisfactionSurveysScreen} />
      <Stack.Screen name="SurveyDetail" component={SurveyDetailScreen} />
      <Stack.Screen name="CustomerNotificationPrefs" component={CustomerNotificationPrefsScreen} />
      <Stack.Screen name="AutoReports" component={AutoReportsScreen} />
      <Stack.Screen name="AutoReportForm" component={AutoReportFormScreen} />
    </Stack.Navigator>
  );
}
