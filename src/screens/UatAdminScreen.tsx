// Faz 53 — UatAdminScreen (POZ-DEV-233)
import React from 'react';
import UatScenarioList from '../components/UatScenarioList';

export default function UatAdminScreen() {
  return (
    <UatScenarioList
      role="admin"
      heroIcon="shield-checkmark"
      heroColor="#ef4444"
      heroTitle="Admin Kabul Testleri"
      heroDescription="Tenant, paket, kullanıcı yönetimi ve yedekleme senaryoları"
    />
  );
}
