// Faz 53 — UatLocationScreen (POZ-DEV-240)
import React from 'react';
import UatE2EView from '../components/UatE2EView';

export default function UatLocationScreen() {
  return (
    <UatE2EView
      flow="location"
      heroIcon="location"
      heroColor="#10b981"
      heroTitle="Konum & Rota Uçtan Uca Testi"
      heroDescription="Konum, mesai, rota ve saha doğrulama senaryoları"
    />
  );
}
