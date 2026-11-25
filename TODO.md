# 📝 BẢNG THEO DÕI CÔNG VIỆC DỰ ÁN (AETHERIA PLANETARIUM - TODO)

> **Cập nhật lần cuối:** 25/11/2026  
> **Trạng thái quy ước:**  
> - `[x]` Đã hoàn thành (Done)  
> - `[-]` Đang làm dở / Cần tối ưu thêm (In Progress)  
> - `[ ]` Chưa làm / Dự kiến trong tương lai (Backlog / Future Roadmap)  

---

## 📱 1. Giao diện & Trải nghiệm Người dùng Di động (Mobile UI/UX & PWA)

- [x] Thiết lập cấu hình Viewport PWA chống zoom trang ngoài ý muốn (`user-scalable=no, viewport-fit=cover, overscroll-none`, input `>= 16px` trên màn hình cảm ứng `pointer: coarse`).
- [x] Cập nhật tiêu đề web và PWA thành `Aetheria Planetarium` chính thức trong [index.html](file:///e:/AetheriaPlanetarium/index.html) và [manifest.json](file:///e:/AetheriaPlanetarium/public/manifest.json), tạo bộ icon PNG chuẩn Apple/Android (`apple-touch-icon.png` 180×180, `pwa-192x192.png`, `pwa-512x512.png`).
- [x] Đồng bộ bộ nhận diện logo Aetheria 8 cánh (`AetheriaStarLogo` trong [AetheriaLogo.tsx](file:///e:/AetheriaPlanetarium/src/components/common/AetheriaLogo.tsx)) dùng `useId()` sinh gradient ID duy nhất, không xung đột SVG khi hiển thị nhiều nơi.
- [x] Xây dựng kiến trúc App Shell 2 tầng (`#aetheria-app-shell` + `--app-height` / `--visual-vh` trong [viewport.ts](file:///e:/AetheriaPlanetarium/src/utils/viewport.ts)), khắc phục hoàn toàn khoảng hở dưới `BottomNav` ở chế độ iOS Home Screen Standalone.
- [x] Định nghĩa vùng đỉnh thống nhất qua component dùng chung [TopSafeBar.tsx](file:///e:/AetheriaPlanetarium/src/components/layout/TopSafeBar.tsx) và token CSS (`--ios-top-blur-clearance`, `--top-bar-pt`, `--top-bar-row-h`), dùng đồng bộ cho `Header`, `IOSNavigationBar`, và `SearchBarModal`.
- [x] Khắc phục lỗi kính mờ OS trên iOS 26/27 Home Screen PWA bằng `#ios-status-bar-shield`, capsule `Header` mobile gọn `36px`, và cơ chế dual-element sweep (`#ios-blur-cover` + `#ios-blur-panel`) trong [viewport.ts](file:///e:/AetheriaPlanetarium/src/utils/viewport.ts).
- [x] Chuẩn hóa [AccountModal.tsx](file:///e:/AetheriaPlanetarium/src/components/account/AccountModal.tsx): cô lập stacking context Level-0 / Level-1 để luôn hiện nút `< Cài đặt` và tiêu đề căn giữa ở mục con, sửa kích thước avatar `w-12 h-12`.
- [x] Thiết kế lại mục **Thông tin ứng dụng** ([AboutSection.tsx](file:///e:/AetheriaPlanetarium/src/components/account/AboutSection.tsx)) chuẩn iOS Inset Grouped (Hero + Sao chép phiên bản + Nguồn dữ liệu ESA Hipparcos / IAU + Có gì mới + Quyền riêng tư cục bộ + Tác giả `Quang Vo` / `LVQ Std` + Giấy phép mở + Footer).
- [x] Định nghĩa lại cử chỉ vuốt mép đóng/quay lại chuẩn [useEdgeSwipeBack.ts](file:///e:/AetheriaPlanetarium/src/hooks/useEdgeSwipeBack.ts) trong dải mép `28px` của từng cửa sổ: vuốt mép trái (`edge: 'left'`) cho `AccountModal` (cấp gốc & mục con) và `SearchBarModal`; vuốt mép phải (`edge: 'right'`) cho `Sidebar` Bảng điều khiển trên mobile.
- [x] Chặn nhãn 3D `<Html>` (`ConstellationLabels3D`, `GroundHorizon3D`, `TargetSimulation3D`) xuyên lên trên modal/drawer bằng `zIndexRange={[10, 0]}`, `hideHtmlOverlays`, và `z-0 isolate`.
- [x] Tạo thanh điều hướng đáy dạng Tabview (`BottomNav.tsx`) khít sát cạnh dưới vật lý với hiệu ứng phát quang (Glow).
- [x] Thay thế 100% checkbox HTML thô bằng công tắc gạt iOS UISwitch (`IOSSwitch.tsx`) có âm thanh phản hồi haptic.
- [x] Thiết kế thẻ thông tin sao vuốt chạm (`StarBottomSheet.tsx`) dùng `useDragControls` tách biệt với vùng nội dung, kèm thẻ Telemetry HUD di động (`StarTelemetryHUD.tsx`).
- [x] Hỗ trợ cảm ứng đa điểm 2 ngón (Pinch-to-zoom FOV) và xoay $360^\circ$ / $90^\circ$ Zenith (`DomeLookControls.tsx`).
- [x] Đăng ký PWA Service Worker (chỉ kích hoạt ở build production `import.meta.env.DEV === false`) với Workbox Offline Cache và banner/nút cài đặt PWA.

---

## 🌌 2. Đồ họa Thiên văn & Không gian 3D (3D Engine & 2D Sky Map)

- [x] Bản đồ sao 2D Canvas trực quan Alt-Azimuth (`SkyMap2D.tsx`): hỗ trợ pan, zoom, grids và 88 chòm sao IAU.
- [x] Vẽ quầng phát quang quang phổ (Spectral Type Glow: O, B, A, F, G, K, M).
- [x] Vòm thiên đỉnh 3D (`ZenithDomeCanvas.tsx`): bán kính cầu $r=500$, rặng núi & đài thiên văn bóng đen 360° (`HorizonSilhouette3D.tsx`).
- [x] Thuật toán Angular Distance Raycasting chính xác (`DomeLookControls.tsx`) và vòng ngắm Holographic đa tầng (`TargetSimulation3D.tsx`).
- [x] Tối ưu hóa GPU `Points BufferGeometry` với Vertex Shader lọc cấp sao (`uMagLimit`) và `batchComputeHorizontalCoordsInPlace` đạt 60 FPS với 5.200+ sao.

---

## 🌐 3. Quốc tế hóa (i18n) & Dữ liệu Thiên văn học (Data & API)

- [x] Bộ từ điển song ngữ Tiếng Việt ↔ Tiếng Anh hoàn chỉnh (`src/utils/i18n.ts`) với 100% tên 88 chòm sao IAU tiếng Việt.
- [x] Định vị GPS thời gian thực (`Geolocation API`), danh sách đài thiên văn và cỗ máy thời gian (`Time Warp`).
- [x] Tích hợp con quay hồi chuyển (`useDeviceOrientation.ts`) với khóa tương tác xoay tự do + Recenter + vị trí nút AR tối ưu trên mobile.
- [x] Mở rộng danh mục dữ liệu sao lên 5.200+ sao (`stars.ts`).
- [x] Tích hợp động cơ Ephemeris Hệ Mặt Trời (`astronomy-engine`) cho Mặt Trời, Mặt Trăng (pha trăng & độ chiếu sáng) và 7 hành tinh (Sao Thủy → Sao Hải Vương, vành đai Sao Thổ, giờ mọc/lặn) trên cả 2D & 3D.
- [x] Tích hợp API dự báo thời tiết & độ che phủ mây tại vị trí quan sát (Open-Meteo `/v1/forecast`, badge thu gọn, bảng chi tiết, dự báo theo giờ đồng bộ bầu trời và mô phỏng mây/sao trên 2D/3D).
- [x] Mở rộng danh mục Vũ trụ sâu **110 vật thể Messier (`M1`–`M110`) + 15 vật thể NGC/IC nổi bật** cùng **Đường hoàng đạo (4 điểm phân/chí + vạch chia `30°`)** trên cả 2D & 3D (mặc định tắt, bật đồng bộ qua `<IOSSwitch />` hoặc chọn từ Tìm kiếm).
- [x] Cập nhật SVG minh họa hình dạng thực tế của Mặt Trời, Mặt Trăng theo pha, 7 hành tinh, 6 hình thái DSO và sao nhấp nháy sáng (`CelestialBodyGlyph`) trên `InfoPanel`, `StarBottomSheet`, `SearchBarModal` & `Sidebar`.

---

## 🎧 4. Hiệu ứng Âm thanh & Tương tác (Audio & Sound FX)

- [x] Bộ tổng hợp âm thanh Web Audio API thuần (`src/utils/audio.ts`, 0ms độ trễ) cho thao tác chọn sao, chiếu mục tiêu, gạt switch và chuyển tab.

---

## 📦 5. Tối ưu Hóa Build & Hiệu Năng (Performance & Packaging)

- [x] TypeScript `tsc --noEmit` sạch 100% không lỗi, `vite build` tách chunk (`vendor-three`, `vendor-astronomy`, `vendor-react`, `vendor-framer`, `vendor-icons`) và tách hoàn toàn `vendor-three` khỏi bundle 2D ban đầu.
- [x] Unit test Node (`node --test tests/weather.test.ts tests/solarSystem.test.ts tests/deepSkyEcliptic.test.ts`): `17/17` pass qua 5 suites.
- [x] Workbox precache `dist/sw.js` (24 entries) kèm runtime cache `NetworkFirst` cho Open-Meteo API.
- [x] Audit chỉ số Google Lighthouse (`vite preview` với bản DSO/Hoàng đạo: Mobile `Perf 84`, Desktop `Perf 99`, A11y/BP/SEO `100`; trên GitHub Pages `957dc15`: Desktop `Perf 97`, A11y/BP/SEO `100` ở cả Mobile & Desktop).
- [x] Kiểm thử thực địa trên thiết bị iOS thực tế (Standalone PWA, safe-area, Open-Meteo, Hệ Mặt Trời 2D/3D, AR & offline).
