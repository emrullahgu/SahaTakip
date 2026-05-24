// Faz 53 — UatStockScreen (POZ-DEV-239)
import React from 'react';
import UatE2EView from '../components/UatE2EView';

export default function UatStockScreen() {
  return (
    <UatE2EView
      flow="stock"
      heroIcon="cube"
      heroColor="#3b82f6"
      heroTitle="Stok & Zimmet Uçtan Uca Testi"
      heroDescription="Stok hareketleri, zimmet ve malzeme düşme senaryoları"
    />
  );
}
