// Faz 53 — UatManagerScreen (POZ-DEV-234)
import React from 'react';
import UatScenarioList from '../components/UatScenarioList';

export default function UatManagerScreen() {
  return (
    <UatScenarioList
      role="manager"
      heroIcon="briefcase"
      heroColor="#a855f7"
      heroTitle="Yönetici Kabul Testleri"
      heroDescription="Onay akışları, atama ve KPI raporlama senaryoları"
    />
  );
}
