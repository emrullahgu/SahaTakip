// Faz 53 — UatQuoteScreen (POZ-DEV-237)
import React from 'react';
import UatE2EView from '../components/UatE2EView';

export default function UatQuoteScreen() {
  return (
    <UatE2EView
      flow="quote"
      heroIcon="document-text"
      heroColor="#f59e0b"
      heroTitle="Teklif Uçtan Uca Testi"
      heroDescription="Oluşturma, revize etme, PDF alma ve onaylama akışı"
    />
  );
}
