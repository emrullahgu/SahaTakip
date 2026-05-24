// Faz 53 — UatFieldScreen (POZ-DEV-235)
import React from 'react';
import UatScenarioList from '../components/UatScenarioList';

export default function UatFieldScreen() {
  return (
    <UatScenarioList
      role="field"
      heroIcon="walk"
      heroColor="#22c55e"
      heroTitle="Saha Kabul Testleri"
      heroDescription="İş emri başlat/tamamla, konum doğrulama, stok düşme senaryoları"
    />
  );
}
