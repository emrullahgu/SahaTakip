// Faz 53 — UatCustomerScreen (POZ-DEV-236)
import React from 'react';
import UatScenarioList from '../components/UatScenarioList';

export default function UatCustomerScreen() {
  return (
    <UatScenarioList
      role="customer"
      heroIcon="person"
      heroColor="#0ea5e9"
      heroTitle="Müşteri Kabul Testleri"
      heroDescription="Müşteri portal girişi, teklif onayı ve geçmiş görüntüleme"
    />
  );
}
