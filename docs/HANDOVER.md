# 🚀 DỰ ÁN AETHERIA PLANETARIUM - TÀI LIỆU BÀN GIAO (HANDOVER)

> **Checkpoint Phiên làm việc:** 25/11/2026  
> **Tác giả / Maintainer:** Quang Vo (LVQ Std)  
> **Dành cho:** AI Agent / Developer kế thừa phiên tiếp theo

---

## 1. 🔭 Tổng quan Dự án (Project Overview)
**Aetheria Planetarium** là ứng dụng web/PWA thiên văn học mô phỏng bầu trời sao tương tác thời gian thực với giao diện Deep Space Glassmorphic UI, tối ưu chuẩn ứng dụng di động iOS/Android bản địa.

Ứng dụng sở hữu 2 chế độ hiển thị lõi:
1. **Bản đồ 2D (`SkyMap2D`):** Chiếu trực giao Alt-Azimuth toàn bộ vòm trời với lưới tọa độ, đường nối 88 chòm sao IAU, quầng phát quang quang phổ và thao tác pan/zoom tự do.
2. **Vòm Thiên Đỉnh 3D (`ZenithDomeCanvas`):** WebGL / Three.js xoay $360^\circ$ chân trời, ngửa $90^\circ$ thiên đỉnh (Zenith), rặng núi & đài thiên văn 360°, vòng ngắm holographic 3D và chế độ la bàn AR.

---

## 2. 🛠️ Tech Stack & Thư viện (Precise Versions)
- **Core Framework:** React 18.3.1 (`react`, `react-dom`)
- **Ngôn ngữ:** TypeScript 5.4.5 (Strict type checking)
- **Bundler & Dev Server:** Vite 5.4.21 (`vite` ^5.2.12), `vite-plugin-pwa` ^2.0.0
- **3D Graphics Engine:** Three.js 0.165.0, `@react-three/fiber` 8.16.8, `@react-three/drei` 9.106.0
- **Styling:** Tailwind CSS 3.4.3, Autoprefixer 10.4.19, PostCSS 8.4.38
- **UI Animations:** Framer Motion 11.2.10
- **Biểu tượng (Icons):** Lucide React 0.383.0
- **Class Utilities:** `clsx` 2.1.1, `tailwind-merge` 2.3.0
- **Âm thanh (Audio Engine):** Web Audio API synthesizer thuần (`src/utils/audio.ts`)

---

## 3. 🎯 Tiến độ hiện tại (Current State & Completed Tasks)

### A–E. Nền tảng Mobile UI, Code-Splitting, AR Tracker, PWA Workbox & 5.200+ Sao (23/11/2026)
- Xây dựng giao diện song ngữ Anh–Việt với 88 chòm sao IAU, danh mục 5.200+ sao (`batchComputeHorizontalCoordsInPlace`, GPU shader `uMagLimit` 60 FPS), cảm biến AR (`useDeviceOrientation.ts`), code-splitting (`React.lazy`), và Workbox Service Worker.

### F–I. Raycasting 3D, Mở khóa Camera AR, Logo 8 cánh & Nhận diện thương hiệu (23/11/2026)
- Angular Distance Raycasting 3D chính xác (`DomeLookControls.tsx`), vòng ngắm Holographic (`TargetSimulation3D.tsx`), Additive Manual Drag Offset khi bật AR, nút AR neo nổi trên `StarBottomSheet.tsx`.

### J. Khắc phục Triệt để iOS PWA Safe Area, TopSafeBar Thống Nhất, About UI & Edge-Swipe 28px (25/11/2026)
1. **Khung vỏ 2 tầng & Hiệu chuẩn Viewport iOS Standalone ([App.tsx](file:///e:/AetheriaPlanetarium/src/App.tsx), [viewport.ts](file:///e:/AetheriaPlanetarium/src/utils/viewport.ts), [index.html](file:///e:/AetheriaPlanetarium/index.html)):**
   - Giải quyết dứt điểm khoảng hở đáy `~59px` dưới `BottomNav` trên iPhone Home Screen PWA bằng cấu trúc 2 tầng Flex (`#aetheria-app-shell`, `height: var(--app-height)`), đo `satPx > 0` ngay Frame-0 để phân biệt full-bleed với non-translucent status bar.
   - Bỏ ghi đè CSS `--sat/--sab` cứng, tách đăng ký Service Worker chỉ chạy khi `import.meta.env.DEV === false` ([usePWA.ts](file:///e:/AetheriaPlanetarium/src/hooks/usePWA.ts)), bổ sung nhận diện iPadOS 13+, tạo bộ icon PNG không trong suốt (`apple-touch-icon.png`, `pwa-192x192.png`, `pwa-512x512.png`).
   - Nâng kích thước font input mobile tối thiểu `16px` (`@media (pointer: coarse)`), sửa `touch-action` toàn cục sang `touch-manipulation`, thêm `useDragControls` cho `StarBottomSheet`.
2. **Vùng đỉnh Thống nhất & Giảm thiểu Blur iOS 26/27 ([TopSafeBar.tsx](file:///e:/AetheriaPlanetarium/src/components/layout/TopSafeBar.tsx), [Header.tsx](file:///e:/AetheriaPlanetarium/src/components/layout/Header.tsx), [IOSNavigationBar.tsx](file:///e:/AetheriaPlanetarium/src/components/layout/IOSNavigationBar.tsx), [SearchBarModal.tsx](file:///e:/AetheriaPlanetarium/src/components/search/SearchBarModal.tsx), [index.css](file:///e:/AetheriaPlanetarium/src/index.css)):**
   - Hợp nhất toàn bộ `<header>` về một component duy nhất `<TopSafeBar />` dùng tokens `--ios-top-blur-clearance` (`18px` trên portrait mobile standalone), `--top-bar-pt`, `--top-bar-row-h` (`40px` mobile / `56px` desktop) và `#ios-status-bar-shield` ngoài `#root`.
   - Thiết kế `Header` mobile dạng capsule gọn `36px`, gỡ shadow halo cyan trên mobile và không giữ `backdrop-blur-xs` trên backdrop `Sidebar` khi đang đóng.
   - Tích hợp cặp lớp dọn composite `#ios-blur-cover` + `#ios-blur-panel` (`rgba(255,255,255,0.01)`) trong `viewport.ts` khi khởi chạy, sau splash, và lúc quay lại từ nền.
3. **Cô lập 3D `<Html>` & Sửa Stack Cài đặt ([ZenithDomeCanvas.tsx](file:///e:/AetheriaPlanetarium/src/components/zenith3d/ZenithDomeCanvas.tsx), [AccountModal.tsx](file:///e:/AetheriaPlanetarium/src/components/account/AccountModal.tsx)):**
   - Giới hạn `zIndexRange={[10, 0]}` + `hideHtmlOverlays` ở cả 5 thành phần Drei `<Html>` và bọc Workspace/`<main>` bằng `z-0 isolate` để nhãn 3D không đè lên modal `Cài đặt`.
   - Cô lập Level-0 (`z-10 isolate`) và Level-1 (`z-30 isolate`) trong `AccountModal` để luôn hiển thị `< Cài đặt` và tiêu đề căn giữa ở mục con, sửa kích thước avatar `w-12 h-12`.
   - Đưa `<AetheriaSplashScreen />` thành sibling của `#aetheria-app-shell` (`fixed top-0 left-0 right-0 z-[9999]`) để luôn nằm trên `#ios-status-bar-shield`.
4. **Thiết kế lại Mục Thông tin ứng dụng ([AboutSection.tsx](file:///e:/AetheriaPlanetarium/src/components/account/AboutSection.tsx), [AetheriaLogo.tsx](file:///e:/AetheriaPlanetarium/src/components/common/AetheriaLogo.tsx)):**
   - Bố cục iOS Inset Grouped gồm Hero căn giữa (nút copy phiên bản `Zenith 3D • v2.5.0`), Nguồn dữ liệu khoa học (Hipparcos / IAU 88 / J2000.0), Có gì mới, Quyền riêng tư cục bộ, Tác giả & Liên hệ (`Quang Vo` / `LVQ Std` / `kingescaped.dev@gmail.com` / `@kingescaped`), Giấy phép mã nguồn mở, và Footer `© 2026 Aetheria Planetarium - LVQ Std`.
   - Sửa trùng SVG gradient ID bằng `useId()` trong `AetheriaLogo.tsx`.
5. **Chuẩn hóa Cử chỉ Vuốt Mép 28px ([useEdgeSwipeBack.ts](file:///e:/AetheriaPlanetarium/src/hooks/useEdgeSwipeBack.ts), [Sidebar.tsx](file:///e:/AetheriaPlanetarium/src/components/layout/Sidebar.tsx), [AccountModal.tsx](file:///e:/AetheriaPlanetarium/src/components/account/AccountModal.tsx), [SearchBarModal.tsx](file:///e:/AetheriaPlanetarium/src/components/search/SearchBarModal.tsx)):**
   - Khóa chặt vùng cảm ứng vuốt quay lại trong đúng **`28px` sát mép cửa sổ** (`EDGE_SWIPE_DEFAULTS.edgeWidth`), bỏ `drag="x"` toàn màn hình cũ trên `AccountModal` Level-1 (vốn khiến vuốt từ cạnh phải iPhone vẫn kích hoạt quay lại).
   - Mở rộng hỗ trợ `edge: 'right'` (chạm mép phải drawer vuốt sang trái để đóng) cho `Sidebar` (`Bảng điều khiển`) trên mobile `< 768px`, cùng `edge: 'left'` thống nhất cho `AccountModal` (cấp gốc & mục con) và `SearchBarModal`.

---

## 4. ⚠️ Các vấn đề tồn đọng (Known Issues & Warnings)
1. **Dữ liệu thời tiết thiên văn (Weather & Cloud Cover API):**
   Chưa kết nối Open-Meteo Astronomy API để hiển thị độ che phủ mây và điều kiện quan sát tại tọa độ GPS.
2. **Hành vi kính mờ OS iOS 26/27 trên PWA (`UIScrollEdgeEffect`):**
   Apple hiện ép dải mờ UIKit ở mép trên đối với Home Screen Web Apps (`black-translucent` đã bị deprecated theo WebKit Bug 301994 / 317153) và chưa có thuộc tính web chuẩn để tắt hoàn toàn ở tầng OS. Cấu hình `--ios-top-blur-clearance: 18px` giúp thanh công cụ nằm sát ngay dưới ngưỡng mờ với chi phí đệm tối thiểu; nếu muốn sát `0px` tuyệt đối như app native, cần đóng gói vỏ `WKWebView` / Capacitor đặt `topEdgeEffect.isHidden = true`.
3. **Môi trường Sandbox Windows khi chạy Vite build:**
   `npx tsc --noEmit` chạy sạch trong sandbox, còn `npm run build` cần quyền ngoài sandbox do Rollup `fs.realpath` trên ổ `E:\`.

---

## 5. 📋 Kế hoạch hành động cho phiên kế tiếp (Next Steps - High Priority)
1. **[XONG]** Code-Splitting & Lazy-load Vòm 3D (`vite.config.ts`, `App.tsx`).
2. **[XONG]** Chế độ Con quay hồi chuyển AR Star Tracker (`useDeviceOrientation.ts`, `DomeLookControls.tsx`).
3. **[XONG]** Đăng ký PWA Service Worker & Offline Cache (`vite.config.ts`, `usePWA.ts`, `PWAInstallBanner.tsx`).
4. **[XONG]** Danh mục 5.200+ sao & tối ưu GPU 60 FPS (`stars.ts`, `astronomy.ts`, `StarPoints3D.tsx`).
5. **[XONG]** Chuẩn hóa Safe Area iOS Standalone, `<TopSafeBar>`, `AboutSection`, và Edge-Swipe `28px` (`useEdgeSwipeBack.ts`, `viewport.ts`).
6. **Ưu tiên tiếp theo — Tích hợp API dự báo thời tiết thiên văn & độ che phủ mây (Open-Meteo Astronomy Cloud Cover API):**
   Kết nối Open-Meteo hiển thị độ che phủ mây, độ ẩm và chỉ số tầm nhìn (Seeing condition) tại tọa độ người quan sát, đồng thời audit Google Lighthouse.
