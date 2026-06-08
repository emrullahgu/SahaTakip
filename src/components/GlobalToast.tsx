// GlobalToast — Toast'ı uygulama kökünde TEK sefer render eder.
// Önceden her ekran kendi <Toast/>'unu render ediyordu; render etmeyen
// ekranlarda (araç, çeşitli detaylar) showToast sessiz kalıyordu ve
// kaydet/sil sonrası başka ekrana geçilince toast kayboluyordu. Kökte
// mount edilince her ekranda ve navigasyon geçişlerinde tutarlı görünür.
import React from 'react';
import { useAppContext } from '../context/AppContext';
import Toast from './Toast';

export default function GlobalToast() {
  const { toast } = useAppContext();
  if (!toast) return null;
  return <Toast toast={toast} />;
}
