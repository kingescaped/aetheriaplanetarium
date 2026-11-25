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

**Aetheria Planetarium** là ứng dụng quan sát thiên văn thế hệ mới thiết kế theo chuẩn **Mobile-First Native iOS UX** kết hợp giao diện Glassmorphism không gian sâu, hoạt động mượt mà trên trình duyệt Desktop lẫn PWA cài đặt trên iPhone / Android.

### 🌟 Tính năng Nổi bật

1. **Bản đồ Sao 2D (`SkyMap2D`):**
   - Chiếu phẳng trực giao Alt-Azimuth toàn bộ vòm trời.
   - Hiển thị 5.200+ sao từ danh mục Hipparcos (ESA) & 88 chòm sao IAU, đường nối chòm sao và quang phổ nhiệt độ sao (O, B, A, F, G, K, M).
   - Hỗ trợ kéo (Pan), thu phóng (Zoom) và xoay góc nhìn trực quan.

2. **Vòm Thiên Đỉnh 3D (`ZenithDomeCanvas`):**
   - Xây dựng trên WebGL / Three.js (`r = 500`), xoay $360^\circ$ chân trời và ngửa $90^\circ$ thiên đỉnh (Zenith).
   - Rặng núi & đài thiên văn 360° (`HorizonSilhouette3D`), vòng ngắm mục tiêu Holographic đa tầng (`TargetSimulation3D`) và chế độ la bàn AR (`DeviceOrientation`).
   - Bộ lọc Magnitude Limit Shader chạy trên GPU, 0 GC overhead, ổn định 60 FPS.

3. **Trải nghiệm Di động Chuẩn iOS & PWA Toàn Màn Hình:**
   - Khung vỏ 2 tầng (`#aetheria-app-shell` + `--app-height` / `--visual-vh`) tự động bù khuyết chiều cao thanh trạng thái iOS Standalone giúp `BottomNav` luôn khít sát đáy vật lý.
   - Vùng thanh trên thống nhất qua [TopSafeBar.tsx](file:///e:/AetheriaPlanetarium/src/components/layout/TopSafeBar.tsx) và `#ios-status-bar-shield`, dùng chung cho `Header`, `IOSNavigationBar`, và `SearchBarModal` (đệm `18px` qua `--ios-top-blur-clearance` để hạn chế giới hạn kính mờ hệ thống `UIScrollEdgeEffect` trên iOS 26/27 PWA — chi tiết tại [ARCHITECTURE.md](file:///e:/AetheriaPlanetarium/docs/ARCHITECTURE.md#L107)).
   - Mục **Thông tin ứng dụng** ([AboutSection.tsx](file:///e:/AetheriaPlanetarium/src/components/account/AboutSection.tsx)) thiết kế theo chuẩn iOS Inset Grouped (Hero + Nguồn dữ liệu khoa học + Có gì mới + Quyền riêng tư cục bộ + Tác giả `Quang Vo` / `LVQ Std` + Giấy phép mã nguồn mở).

---

## 👆 Điều hướng Cử chỉ Vuốt Mép (`Edge-Swipe Back`)

### Tổng quan (Overview)
Cho phép người dùng trên thiết bị di động vuốt từ mép cửa sổ đang mở để đóng hoặc quay lại cấp trước theo chuẩn điều hướng iOS native, mà không bị kích hoạt nhầm khi vuốt ở giữa hay cạnh đối diện màn hình.

### Điều kiện kích hoạt & Xác thực đầu vào (Prerequisites & Validation)
- **Màn hình di động:** Áp dụng cho bố cục mobile (`< 768px` với drawer `Sidebar`, hoặc modal/sub-view đang `isOpen` trên thiết bị cảm ứng).
- **Chạm đơn ngón trong dải mép `28px`:** Điểm chạm đầu tiên (`touchstart`) phải nằm trong phạm vi **`edgeWidth = 28px`** tính từ mép quy định của chính cửa sổ đang mở (`left` cho [AccountModal.tsx](file:///e:/AetheriaPlanetarium/src/components/account/AccountModal.tsx) cấp gốc/mục con và [SearchBarModal.tsx](file:///e:/AetheriaPlanetarium/src/components/search/SearchBarModal.tsx); `right` cho ngăn kéo [Sidebar.tsx](file:///e:/AetheriaPlanetarium/src/components/layout/Sidebar.tsx)).
- **Loại trừ phần tử nhập liệu:** Chạm bắt đầu từ `input`, `select`, `textarea` (bao gồm thanh trượt `range`) tự động được bỏ qua.
- **Khóa hướng & Ngưỡng kích hoạt:** Độ dịch chuyển ban đầu `> 8px` phải nghiêng ngang theo đúng hướng đóng (`|Δx| > |Δy| × 1.2`); thả tay kích hoạt khi kéo `>= 60px` hoặc vẩy nhanh `>= 30px` với vận tốc `> 0.3 px/ms`.
- **Nơi tạo mới / tùy biến:** Hook dùng chung được định nghĩa tại [useEdgeSwipeBack.ts](file:///e:/AetheriaPlanetarium/src/hooks/useEdgeSwipeBack.ts) (`SwipeEdge`, `EDGE_SWIPE_DEFAULTS`). Xem chi tiết thiết kế trong [ARCHITECTURE.md](file:///e:/AetheriaPlanetarium/docs/ARCHITECTURE.md#L114-L125).

---

## 📂 Cấu trúc Thư mục

```text
E:\AetheriaPlanetarium\
├── dist/                          # Bản build production
├── docs/                          # Tài liệu kiến trúc & bàn giao
│   ├── ARCHITECTURE.md            # Tài liệu kiến trúc & quy chuẩn thiết kế
│   └── HANDOVER.md                # Tài liệu bàn giao & lịch sử phát triển
├── public/                        # Manifest, apple-touch-icon.png & PWA PNG/SVG icons
├── src/                           # Mã nguồn chính
│   ├── components/
│   │   ├── account/               # AccountModal.tsx, AboutSection.tsx
│   │   ├── common/                # AetheriaLogo.tsx, AetheriaSplashScreen.tsx
│   │   ├── layout/                # TopSafeBar.tsx, Header.tsx, IOSNavigationBar.tsx, Sidebar.tsx, BottomNav.tsx, ...
│   │   ├── planetarium/           # SkyMap2D.tsx
│   │   ├── pwa/                   # PWAInstallBanner.tsx
│   │   ├── search/                # SearchBarModal.tsx
│   │   └── zenith3d/              # ZenithDomeCanvas.tsx & các module Three.js 3D
│   ├── data/                      # stars.ts, constellations.ts
│   ├── hooks/                     # useEdgeSwipeBack.ts, useDeviceOrientation.ts, usePWA.ts
│   ├── types/                     # account.ts, celestial.ts
│   └── utils/                     # astronomy.ts, audio.ts, coordinates3D.ts, i18n.ts, viewport.ts
├── index.html                     # Entry HTML, PWA Meta Tags & #ios-status-bar-shield
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy

### Yêu cầu trước khi chạy (Prerequisites)
- **Node.js `>= 18.x`** & **npm** (cài dependencies bằng `npm install` nếu chưa có `node_modules/`).
- **Trình duyệt / Thiết bị:** Chrome, Safari, Edge hỗ trợ WebGL & ES Modules. Để kiểm tra cử chỉ **Edge-Swipe Back** và **iOS PWA Safe Area** trên iPhone, mở Safari trên iPhone cùng mạng LAN rồi chọn **Chia sẻ → Thêm vào Màn hình chính**.

### Chạy phát triển & Build
1. Cài gói (nếu thiếu `node_modules`): `npm install`
2. Chạy server dev (lắng nghe cả LAN): `npm run dev` → truy cập `http://localhost:3000/aetheriaplanetarium/`
3. Kiểm tra TypeScript & Build Production: `npm run build` (`tsc && vite build` → xuất ra `dist/`)
4. Xem trước bản build: `npm run preview`

---

## 🏛️ Tài liệu Kỹ thuật Chi tiết
- [Tài liệu Kiến trúc Hệ thống](file:///e:/AetheriaPlanetarium/docs/ARCHITECTURE.md)
- [Báo cáo Bàn giao Kỹ thuật](file:///e:/AetheriaPlanetarium/docs/HANDOVER.md)
- [Bảng theo dõi Tiến độ (TODO)](file:///e:/AetheriaPlanetarium/TODO.md)
