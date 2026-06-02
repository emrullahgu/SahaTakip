import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import EnterpriseIntegrationsHubScreen from '../screens/EnterpriseIntegrationsHubScreen';
import ErpConnectionsScreen from '../screens/ErpConnectionsScreen';
import ErpConnectionFormScreen from '../screens/ErpConnectionFormScreen';
import ErpSyncJobsScreen from '../screens/ErpSyncJobsScreen';
import ErpCustomersScreen from '../screens/ErpCustomersScreen';
import ErpStockScreen from '../screens/ErpStockScreen';
import ErpInvoiceDraftsScreen from '../screens/ErpInvoiceDraftsScreen';
import QuoteToOrderScreen from '../screens/QuoteToOrderScreen';
import CrmConnectionsScreen from '../screens/CrmConnectionsScreen';
import IntegrationWebhooksScreen from '../screens/IntegrationWebhooksScreen';
import IntegrationWebhookFormScreen from '../screens/IntegrationWebhookFormScreen';
import IntegrationWebhookDeliveriesScreen from '../screens/IntegrationWebhookDeliveriesScreen';
import IntegrationApiKeysScreen from '../screens/IntegrationApiKeysScreen';
import ApiUsageLogsScreen from '../screens/ApiUsageLogsScreen';
import IntegrationErrorsScreen from '../screens/IntegrationErrorsScreen';
import IntegrationHealthScreen from '../screens/IntegrationHealthScreen';
import ExternalApiKeysScreen from '../screens/ExternalApiKeysScreen';
import ScheduledEmailsScreen from '../screens/ScheduledEmailsScreen';
import WebhooksScreen from '../screens/WebhooksScreen';
import ApiKeysScreen from '../screens/ApiKeysScreen';

const Stack = createNativeStackNavigator<any>();

export default function EnterpriseStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EnterpriseIntegrationsHub" component={EnterpriseIntegrationsHubScreen} />
      <Stack.Screen name="ErpConnections" component={ErpConnectionsScreen} />
      <Stack.Screen name="ErpConnectionForm" component={ErpConnectionFormScreen} />
      <Stack.Screen name="ErpSyncJobs" component={ErpSyncJobsScreen} />
      <Stack.Screen name="ErpCustomers" component={ErpCustomersScreen} />
      <Stack.Screen name="ErpStock" component={ErpStockScreen} />
      <Stack.Screen name="ErpInvoiceDrafts" component={ErpInvoiceDraftsScreen} />
      <Stack.Screen name="QuoteToOrder" component={QuoteToOrderScreen} />
      <Stack.Screen name="CrmConnections" component={CrmConnectionsScreen} />
      <Stack.Screen name="IntegrationWebhooks" component={IntegrationWebhooksScreen} />
      <Stack.Screen name="IntegrationWebhookForm" component={IntegrationWebhookFormScreen} />
      <Stack.Screen name="IntegrationWebhookDeliveries" component={IntegrationWebhookDeliveriesScreen} />
      <Stack.Screen name="IntegrationApiKeys" component={IntegrationApiKeysScreen} />
      <Stack.Screen name="ApiUsageLogs" component={ApiUsageLogsScreen} />
      <Stack.Screen name="IntegrationErrors" component={IntegrationErrorsScreen} />
      <Stack.Screen name="IntegrationHealth" component={IntegrationHealthScreen} />
      <Stack.Screen name="ExternalApiKeys" component={ExternalApiKeysScreen} />
      <Stack.Screen name="ScheduledEmails" component={ScheduledEmailsScreen} />
      <Stack.Screen name="Webhooks" component={WebhooksScreen} />
      <Stack.Screen name="ApiKeys" component={ApiKeysScreen} />
    </Stack.Navigator>
  );
}
