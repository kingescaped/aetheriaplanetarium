import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// --- Bắt đầu: iOS PWA Safe Area Bypass ---
const isIos = /Mac|iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
const isPwa = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone);

if (isIos) {
  // Ép luôn cho cả Safari và PWA trên iOS để test
  document.documentElement.style.setProperty('--sat', '47px', 'important');
  document.documentElement.style.setProperty('--sab', '34px', 'important');
} else {
  // Môi trường Web thường
  document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top, 0px)');
  document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom, 0px)');
}
// --- Kết thúc ---

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// --- Bắt đầu: Service Worker Kill Switch ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log('Service Worker unregistered to clear zombie cache.');
    }
  });
}
// --- Kết thúc ---
