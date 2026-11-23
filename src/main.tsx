import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// --- Bắt đầu: iOS PWA Safe Area Bypass ---
const isIos = /Mac|iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
const isPwa = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone);

if (isIos && isPwa) {
  // Bỏ qua env() bị lỗi của Apple, ép thông số cứng an toàn cho iPhone (Tai thỏ / Dynamic Island)
  document.documentElement.style.setProperty('--sat', '47px');
  document.documentElement.style.setProperty('--sab', '34px');
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
