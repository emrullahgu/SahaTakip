import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

import AiHubScreen from '../screens/AiHubScreen';
import AiAssistantScreen from '../screens/AiAssistantScreen';
import AiSettingsScreen from '../screens/AiSettingsScreen';
import AiInsightsScreen from '../screens/AiInsightsScreen';
import SmartPozSuggestScreen from '../screens/SmartPozSuggestScreen';
import PhotoAnalysisScreen from '../screens/PhotoAnalysisScreen';
import VoiceReportScreen from '../screens/VoiceReportScreen';
import AiAssistantHubScreen from '../screens/AiAssistantHubScreen';
import AiPermissionsScreen from '../screens/AiPermissionsScreen';
import AiChatScreen from '../screens/AiChatScreen';
import CoPilotScreen from '../screens/CoPilotScreen';
import AiKnowledgeBaseScreen from '../screens/AiKnowledgeBaseScreen';
import AiSessionsScreen from '../screens/AiSessionsScreen';
import AiPozSuggestScreen from '../screens/AiPozSuggestScreen';
import AiQuoteDraftScreen from '../screens/AiQuoteDraftScreen';
import AiQuoteDraftDetailScreen from '../screens/AiQuoteDraftDetailScreen';
import AiWorkOrderSummaryScreen from '../screens/AiWorkOrderSummaryScreen';
import AiCustomerInsightScreen from '../screens/AiCustomerInsightScreen';
import AiRiskAlertsScreen from '../screens/AiRiskAlertsScreen';
import AiDailyReportScreen from '../screens/AiDailyReportScreen';
import AiUsageLogsScreen from '../screens/AiUsageLogsScreen';
import AgentConsoleScreen from '../screens/AgentConsoleScreen';
import AgentSuggestionsScreen from '../screens/AgentSuggestionsScreen';

const Stack = createNativeStackNavigator<any>(); // Simple any for now to speed up

export default function AIStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AiHub" component={AiHubScreen} />
      <Stack.Screen name="AiAssistant" component={AiAssistantScreen} />
      <Stack.Screen name="AiSettings" component={AiSettingsScreen} />
      <Stack.Screen name="AiInsights" component={AiInsightsScreen} />
      <Stack.Screen name="SmartPozSuggest" component={SmartPozSuggestScreen} />
      <Stack.Screen name="PhotoAnalysis" component={PhotoAnalysisScreen} />
      <Stack.Screen name="VoiceReport" component={VoiceReportScreen} />
      <Stack.Screen name="AiAssistantHub" component={AiAssistantHubScreen} />
      <Stack.Screen name="AiPermissions" component={AiPermissionsScreen} />
      <Stack.Screen name="AiChat" component={AiChatScreen} />
      <Stack.Screen name="CoPilot" component={CoPilotScreen} />
      <Stack.Screen name="AiKnowledgeBase" component={AiKnowledgeBaseScreen} />
      <Stack.Screen name="AiSessions" component={AiSessionsScreen} />
      <Stack.Screen name="AiPozSuggest" component={AiPozSuggestScreen} />
      <Stack.Screen name="AiQuoteDraft" component={AiQuoteDraftScreen} />
      <Stack.Screen name="AiQuoteDraftDetail" component={AiQuoteDraftDetailScreen} />
      <Stack.Screen name="AiWorkOrderSummary" component={AiWorkOrderSummaryScreen} />
      <Stack.Screen name="AiCustomerInsight" component={AiCustomerInsightScreen} />
      <Stack.Screen name="AiRiskAlerts" component={AiRiskAlertsScreen} />
      <Stack.Screen name="AiDailyReport" component={AiDailyReportScreen} />
      <Stack.Screen name="AiUsageLogs" component={AiUsageLogsScreen} />
      <Stack.Screen name="AgentConsole" component={AgentConsoleScreen} />
      <Stack.Screen name="AgentSuggestions" component={AgentSuggestionsScreen} />
    </Stack.Navigator>
  );
}
