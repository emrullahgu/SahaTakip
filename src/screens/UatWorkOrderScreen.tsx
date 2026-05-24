// Faz 53 — UatWorkOrderScreen (POZ-DEV-238)
import React from 'react';
import UatE2EView from '../components/UatE2EView';

export default function UatWorkOrderScreen() {
  return (
    <UatE2EView
      flow="workorder"
      heroIcon="construct"
      heroColor="#06b6d4"
      heroTitle="İş Emri Uçtan Uca Testi"
      heroDescription="Oluşturma, atama, başlatma ve tamamlama akışı"
    />
  );
}
