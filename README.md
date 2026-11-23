# 🌌 Aetheria Planetarium

> **Ứng dụng Web / PWA Thiên Văn Học Mô Phỏng Bầu Trời Sao Thời Gian Thực (Real-Time Celestial Planetarium & 3D Zenith Dome)**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.165-black.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.2-646cff.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-success.svg)](https://vite-pwa-org.netlify.app/)

---

## 🧭 Tổng quan Dự án

**Aetheria Planetarium** là ứng dụng quan sát thiên văn thế hệ mới với giao diện Glassmorphism hiện đại, tối ưu hóa cho cả máy tính để bàn (Desktop) và thiết bị di động (Mobile-First Native App UX).

### 🌟 Tính năng Nổi bật

1. **Bản đồ Sao 2D (Interactive Celestial Sky Map):**
   - Chiếu phẳng trực giao Alt-Azimuth toàn bộ vòm trời.
   - Hiển thị 88 chòm sao IAU, tên sao, đường nối chòm sao, quang phổ nhiệt độ sao (O, B, A, F, G, K, M).
   - Thao tác kéo (Pan), thu phóng (Zoom), và xoay la bàn tự do.

2. **Vòm Thiên Đỉnh 3D (3D Zenith Dome Engine):**
   - Xây dựng trên WebGL / Three.js với bán kính thiên cầu $r = 500$.
   - Tự do xoay $360^\circ$ quanh đường chân trời (Horizon) và ngửa $90^\circ$ thiên đỉnh (Zenith).
   - Hiệu ứng rặng núi & đài thiên văn 360° chân thực (`HorizonSilhouette3D`).
   - Khóa mục tiêu sao Holographic nhiều tầng chuẩn Stellarium / Star Walk 2.
   - Bộ lọc Magnitude Limit Shader chạy trực tiếp trên GPU, 0 GC overhead, duy trì 60 FPS mượt mà.

3. **Trải nghiệm Di động Chuẩn iOS (Mobile-First UX):**
   - UINavigationBar tự động căn lề thông minh, an toàn Dynamic Island & Tai thỏ.
   - Công tắc UISwitch pill Apple với âm thanh phản hồi haptic.
   - Thẻ sao Bottom Sheet rút gọn và Telemetry HUD thời gian thực.
   - Hỗ trợ cảm ứng đa điểm 2 ngón (Pinch-to-zoom FOV).

4. **Progressive Web App (PWA) & Khả năng Hoạt động Ngoại tuyến (Offline):**
   - Hỗ trợ cài đặt lên màn hình chính (Add to Home Screen).
   - Precache tài nguyên lõi & cache font chữ qua Service Worker (Workbox).
   - Hoạt động mượt mà ngay cả khi không có kết nối Internet / sóng di động.

---

## 📂 Cấu trúc Thư mục

```text
E:\AetheriaPlanetarium\
├── dist/                          # Bản build production
├── docs/                          # Tài liệu kiến trúc & bàn giao
│   ├── ARCHITECTURE.md            # Tài liệu kiến trúc chi tiết
│   └── HANDOVER.md                # Tài liệu bàn giao & lịch sử phát triển
├── public/                        # Tài nguyên tĩnh, manifest, PWA icons
├── src/                           # Mã nguồn chính
│   ├── components/                # React components (2D Map, 3D Dome, UI)
│   ├── data/                      # Dữ liệu thiên văn (sao, chòm sao)
│   ├── hooks/                     # Custom React hooks (PWA, DeviceOrientation)
│   ├── types/                     # Định nghĩa TypeScript
│   └── utils/                     # Thuật toán thiên văn, audio, i18n
├── index.html                     # Entry HTML
├── package.json                   # Cấu hình gói và dependencies
├── tsconfig.json                  # Cấu hình TypeScript
└── vite.config.ts                 # Cấu hình Vite & PWA Workbox
```

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy

### Yêu cầu hệ thống
- **Node.js**: >= 18.x
- **Trình duyệt**: Hỗ trợ WebGL và ES Modules hiện đại (Chrome, Safari, Firefox, Edge).

### 1. Cài đặt Dependencies
```bash
npm install
```

### 2. Chạy môi trường Phát triển (Dev)
```bash
npm run dev
```
Truy cập ứng dụng tại `http://localhost:3000`.

### 3. Build Production
```bash
npm run build
```
Bản build hoàn chỉnh sẽ được tạo trong thư mục `dist/`.

### 4. Xem trước bản Build (Preview)
```bash
npm run preview
```

---

## 🏛️ Tài liệu Kỹ thuật Chi tiết
- [Tài liệu Kiến trúc Hệ thống](file:///e:/AetheriaPlanetarium/docs/ARCHITECTURE.md)
- [Báo cáo Bàn giao Kỹ thuật](file:///e:/AetheriaPlanetarium/docs/HANDOVER.md)
- [Bảng theo dõi Tiến độ (TODO)](file:///e:/AetheriaPlanetarium/TODO.md)
